"""Well-known songs that Balanced mixes into a deck, mostly into the decades the players'
libraries leave thin.

The songs come from `classics.json`, a list written by hand with each song's original year.
The Spotify track of each song is looked up once, by a developer, and stored in the same
file. From `backend/`, with the Spotify app's credentials in `.env`:

    uv run python -m jamster.classics

That searches Spotify for every song on the list without a `track` yet, one request a
second, and writes what it found back into the file. A song Spotify doesn't have gets
`"track": null` and isn't searched for again unless `--again` is given.

At startup the server only copies the list into the database, with the list's years, so
neither Spotify nor MusicBrainz is asked about a classic.
"""

import argparse
import asyncio
import json
import logging
import sqlite3
import sys
from collections.abc import Callable, Sequence
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from . import db
from .curation.songs import normalize, year_of
from .importer import parse_track
from .models import Artist, Track
from .spotify import Spotify, SpotifyError

log = logging.getLogger(__name__)

DEFAULT_FILE = Path(__file__).with_name("classics.json")
INTERVAL = 1.0  # seconds between two searches
SAVE_EVERY = 25  # searches, so an interrupted run keeps most of its work


def _plain(text: str) -> str:
    return " ".join("".join(c if c.isalnum() else " " for c in text.lower()).split())


@dataclass(frozen=True, slots=True)
class ListedClassic:
    artist: str
    title: str
    year: int
    looked_up: bool = False  # searched for on Spotify, found or not
    track: Track | None = None  # the Spotify track, if found

    @property
    def key(self) -> str:
        return f"{_plain(self.artist)}|{normalize(self.title)}"


# --- the file --------------------------------------------------------------------------------


def _track_from(obj: dict[str, Any]) -> Track:
    return Track(
        id=obj["id"],
        uri=obj["uri"],
        name=obj["name"],
        artists=tuple(Artist(a, n) for a, n in obj["artists"]),
        album_name=obj["album"],
        image_url=obj.get("image_url"),
        release_date=obj.get("release_date"),
        isrc=obj.get("isrc"),
        duration_ms=obj["duration_ms"],
    )


def _track_to(track: Track) -> dict[str, Any]:
    return {
        "id": track.id,
        "uri": track.uri,
        "name": track.name,
        "artists": [[a.id, a.name] for a in track.artists],
        "album": track.album_name,
        "image_url": track.image_url,
        "release_date": track.release_date,
        "isrc": track.isrc,
        "duration_ms": track.duration_ms,
    }


def load(path: Path) -> list[ListedClassic]:
    """The list, without duplicates. Raises OSError or ValueError on a broken file."""
    entries = []
    for e in json.loads(path.read_text()):
        track = e.get("track")
        entries.append(
            ListedClassic(
                e["artist"],
                e["title"],
                int(e["year"]),
                looked_up="track" in e,
                track=_track_from(track) if track else None,
            )
        )
    return list({e.key: e for e in entries}.values())


def save(path: Path, entries: Sequence[ListedClassic]) -> None:
    """Write the list, one song per line, so that a change reads well in a diff."""
    lines = []
    for e in entries:
        obj: dict[str, Any] = {"artist": e.artist, "title": e.title, "year": e.year}
        if e.looked_up:
            obj["track"] = _track_to(e.track) if e.track else None
        lines.append("  " + json.dumps(obj, ensure_ascii=False))
    path.write_text("[\n" + ",\n".join(lines) + "\n]\n")


def placeholder(entry: ListedClassic) -> Track:
    """A stand-in track for a classic not looked up yet, for trying strategies offline."""
    return Track(
        id=f"classic:{entry.key}",
        uri="",
        name=entry.title,
        artists=(Artist(f"classic-artist:{_plain(entry.artist)}", entry.artist),),
        album_name="",
        image_url=None,
        release_date=str(entry.year),
        isrc=None,
        duration_ms=0,
    )


# --- at startup ------------------------------------------------------------------------------


def sync(conn: sqlite3.Connection, path: Path) -> None:
    """Make the database's classics those of the list. Asks nobody anything."""
    try:
        entries = load(path)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        log.warning("cannot read the classics list %s: %s", path, exc)
        return
    found = [(e.key, e.track, e.year) for e in entries if e.track]
    db.replace_classics(conn, found, datetime.now(UTC).isoformat(timespec="seconds"))
    waiting = sum(not e.looked_up for e in entries)
    log.info(
        "%d of %d classics are ready%s",
        len(found),
        len(entries),
        f"; {waiting} are not looked up on Spotify yet, see classics.py" if waiting else "",
    )


# --- looking them up -------------------------------------------------------------------------

# Words that make a longer title another version rather than the same song's full title.
_OTHER_VERSION = {"remix", "mix", "live", "edit", "version", "acoustic", "demo", "instrumental"}


def best_match(entry: ListedClassic, found: list[Track]) -> Track | None:
    """The search result with the listed artist and title, from the earliest release: the
    original album rather than a best-of. A result whose title only begins with the listed
    one ("Rocket Man (I Think It's Going to Be a Long, Long Time)" for "Rocket Man") counts
    when nothing matches exactly, unless the rest names another version."""
    title, artist = normalize(entry.title), _plain(entry.artist)
    by_artist = [t for t in found if any(_plain(a.name) == artist for a in t.artists)]
    exact = [t for t in by_artist if normalize(t.name) == title]
    longer = [
        t
        for t in by_artist
        if normalize(t.name).startswith(title + " ")
        and not _OTHER_VERSION & set(normalize(t.name).removeprefix(title).split())
    ]
    return min(exact or longer, key=lambda t: (year_of(t.release_date) or 9999, t.id), default=None)


Progress = Callable[[int, int, ListedClassic, list[ListedClassic]], None]


async def look_up(
    spotify: Spotify,
    entries: Sequence[ListedClassic],
    *,
    again: bool = False,
    interval: float = INTERVAL,
    progress: Progress | None = None,
) -> list[ListedClassic]:
    """The entries, with those not looked up yet searched for on Spotify; with `again`, also
    those not found before. Stops early, keeping what it has, if Spotify fails. `progress` is
    told after each search: how many are done, of how many, the entry, and all entries."""
    out = list(entries)
    todo = [n for n, e in enumerate(out) if not e.looked_up or (again and not e.track)]
    for done, n in enumerate(todo):
        if done:
            await asyncio.sleep(interval)
        entry = out[n]
        query = f'track:"{entry.title.replace(chr(34), "")}" artist:"{entry.artist}"'
        try:
            results = await spotify.search_tracks(query)
        except SpotifyError as exc:
            log.warning("searching Spotify stopped after %d of %d: %s", done, len(todo), exc)
            break
        track = best_match(entry, [t for t in map(parse_track, results) if t])
        out[n] = replace(entry, looked_up=True, track=track)
        if progress:
            progress(done + 1, len(todo), out[n], out)
    return out


def main(argv: Sequence[str] | None = None) -> None:
    from .config import Settings

    parser = argparse.ArgumentParser(
        prog="python -m jamster.classics",
        description="Look up the classics' Spotify tracks and write them into the list.",
    )
    parser.add_argument("--file", default=str(DEFAULT_FILE), help="default: %(default)s")
    parser.add_argument("--again", action="store_true", help="search again for those not found")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.WARNING, format="%(message)s")
    path = Path(args.file)
    entries = load(path)
    settings = Settings()  # pyright: ignore[reportCallIssue]  # from the environment and .env

    def progress(done: int, total: int, entry: ListedClassic, now: list[ListedClassic]) -> None:
        status = "found" if entry.track else "NOT FOUND"
        print(f"{done}/{total} {status}: {entry.artist}, {entry.title}", file=sys.stderr)
        if done % SAVE_EVERY == 0:
            save(path, now)

    async def run() -> list[ListedClassic]:
        async with httpx.AsyncClient(timeout=15) as http:
            # Searching needs no player, so the database is a throwaway one.
            spotify = Spotify(settings, db.connect(":memory:"), http)
            return await look_up(spotify, entries, again=args.again, progress=progress)

    result = asyncio.run(run())
    save(path, result)
    missing = [e for e in result if e.looked_up and not e.track]
    print(
        f"{sum(e.track is not None for e in result)} of {len(result)} classics have a track; "
        f"{len(missing)} not found, {sum(not e.looked_up for e in result)} not looked up yet."
    )
    for e in missing:
        print(f"  not found: {e.artist}, {e.title}")


if __name__ == "__main__":
    main()
