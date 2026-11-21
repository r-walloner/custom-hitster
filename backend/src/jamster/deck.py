"""Turns the players' libraries into a deck. Curating is instant; a card's year is looked up only
when the card is about to be needed, because MusicBrainz allows one lookup per second.

`curate` is the context of the Strategy pattern in `curation`: it gathers the pool, runs the
strategy the settings name, and turns its picks into entries."""

import datetime
import json
import random
import sqlite3
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from . import db
from .curation import STRATEGIES, Classic, CurationStrategy, Pool, TasteProfile
from .curation.report import deck_lines, markdown
from .models import Card, Track, Why
from .years import YearResolver

KEEP_DECK_FILES = 100


@dataclass(frozen=True, slots=True)
class Entry:
    """A curated track whose year may not be known yet."""

    track: Track
    known_by: tuple[str, ...]  # display names of the players with a signal for it
    why: Why | None = None


def load_profile(conn: sqlite3.Connection, player_id: str) -> TasteProfile | None:
    player = db.get_player(conn, player_id)
    if player is None:
        return None
    return TasteProfile(
        player_id=player.id,
        name=player.name,
        tracks=db.track_signals(conn, player_id),
        artists=db.artist_signals(conn, player_id),
    )


def load_pool(
    conn: sqlite3.Connection, player_ids: Sequence[str], *, with_classics: bool = True
) -> Pool:
    """Everything a strategy chooses from: the players' libraries, the classics found on
    Spotify, and the years the database knows already. Nothing is looked up."""
    profiles = [p for p in (load_profile(conn, pid) for pid in player_ids) if p]
    catalog = db.tracks_known_to(conn, [p.player_id for p in profiles]) if profiles else {}
    found = db.found_classics(conn) if with_classics else []
    classics = [Classic(track, year) for track, year in found]
    catalog |= {c.track.id: c.track for c in classics}
    return Pool(
        profiles=profiles,
        catalog=catalog,
        years=db.years_of(conn, catalog),
        classics=classics,
        this_year=datetime.date.today().year,
    )


def entries_of(
    pool: Pool, strategy: CurationStrategy, size: int, rng: random.Random
) -> list[Entry]:
    """The strategy's picks as entries, in the order it picked them."""
    names = {p.player_id: p.name for p in pool.profiles}
    return [
        Entry(pool.catalog[c.track_id], tuple(names[pid] for pid in c.known_by), c.why)
        for c in strategy.curate(pool, size, rng)
    ]


def curate(
    conn: sqlite3.Connection, player_ids: list[str], strategy: str, size: int, rng: random.Random
) -> tuple[Pool, list[Entry]]:
    """The pool, and up to `size` tracks from it for these players, in random order."""
    pool = load_pool(conn, player_ids)
    if not pool.profiles:
        return pool, []
    entries = entries_of(pool, STRATEGIES[strategy], size, rng)
    rng.shuffle(entries)
    return pool, entries


def write_deck_files(
    folder: Path, room: str, strategy: str, size: int, pool: Pool, entries: Sequence[Entry]
) -> tuple[Path, Path]:
    """Write a deck, in the order it will be drawn, with why each song is in it: as a Markdown
    report and as JSON lines, the two files `python -m jamster.curation` writes. Keep only the
    newest decks. Returns the paths of the Markdown and the JSON lines."""
    folder.mkdir(parents=True, exist_ok=True)
    now = datetime.datetime.now(datetime.UTC)
    base = folder / f"{now:%Y-%m-%dT%H-%M-%S}-{room}"
    md_path, jsonl_path = base.with_suffix(".md"), base.with_suffix(".jsonl")
    items = [(e.track, e.known_by, e.why) for e in entries]
    meta = {"room": room, "strategy": strategy, "size": len(entries), "at": now.isoformat()}
    lines = deck_lines(meta, items)
    jsonl_path.write_text("".join(json.dumps(line, ensure_ascii=False) + "\n" for line in lines))
    note = f"Room {room}, dealt {now:%Y-%m-%d %H:%M} UTC."
    report = markdown(STRATEGIES[strategy], pool, items, size=size, notes=[note], drawn=True)
    md_path.write_text(report)
    for pattern in ("*.jsonl", "*.md"):
        for old in sorted(folder.glob(pattern))[:-KEEP_DECK_FILES]:
            old.unlink(missing_ok=True)
    return md_path, jsonl_path


async def to_card(resolver: YearResolver, entry: Entry) -> Card | None:
    """The card for an entry, or None if no source knows a plausible year for it."""
    resolved = await resolver.resolve(entry.track)
    if resolved is None:
        return None
    track = entry.track
    return Card(
        track_id=track.id,
        uri=track.uri,
        name=track.name,
        artists=tuple(a.name for a in track.artists),
        year=resolved[0],
        year_source=resolved[1],
        image_url=track.image_url,
        known_by=entry.known_by,
        duration_ms=track.duration_ms,
        why=entry.why,
    )
