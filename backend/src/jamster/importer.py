"""Lists the sources of a player's Spotify library, and copies the picked ones into the database
as tracks plus taste signals.

Listing is cheap: one request for the liked songs' count and one per 50 playlists. Copying a
source costs a request per 50 of its songs, so only the sources the player picks are copied,
one at a time, and unpicking the one being copied stops it.
"""

import asyncio
import logging
import math
import sqlite3
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from . import db
from .models import Artist, Track
from .spotify import Spotify, SpotifyError

log = logging.getLogger(__name__)

# Seconds one request may wait out Spotify's rate limit before the import gives up.
PATIENCE = 120.0
TIME_RANGES = {"short_term": "top_short", "medium_term": "top_medium", "long_term": "top_long"}
PAGE = 50  # items per request of a paged listing, as `Spotify.pages` asks for them


@dataclass(frozen=True, slots=True)
class LibraryStatus:
    status: str  # none | running | done | error
    detail: str
    tracks: int  # songs in the picked sources


@dataclass(frozen=True, slots=True)
class Copy:
    """A source's songs as fetched, ready for `db.store_copy`."""

    tracks: list[Track]
    signals: dict[str, dict[str, int]]  # kind -> track id -> value
    artists: dict[str, list[Artist]] | None = None  # kind -> artists, best first


def parse_track(obj: dict[str, Any] | None) -> Track | None:
    """A Spotify track object as a Track; None for episodes, local files and removed tracks."""
    if not obj or obj.get("type") != "track" or obj.get("is_local") or not obj.get("id"):
        return None
    album = obj.get("album") or {}
    images = album.get("images") or []  # largest first; the second is about 300 px
    image = images[1] if len(images) > 1 else images[0] if images else None
    return Track(
        id=obj["id"],
        uri=obj["uri"],
        name=obj.get("name") or "",
        artists=tuple(
            Artist(a["id"], a.get("name") or "") for a in obj.get("artists") or [] if a.get("id")
        ),
        album_name=album.get("name") or "",
        image_url=image["url"] if image else None,
        release_date=album.get("release_date"),
        isrc=(obj.get("external_ids") or {}).get("isrc"),
        duration_ms=obj.get("duration_ms") or 0,
    )


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


class Importer:
    def __init__(self, conn: sqlite3.Connection, spotify: Spotify) -> None:
        self._conn = conn
        self._spotify = spotify
        self._workers: dict[str, asyncio.Task[None]] = {}  # player id -> their worker
        self._relist: set[str] = set()  # players whose sources are to be listed again
        self._copying: dict[str, tuple[str, asyncio.Task[None]]] = {}  # player -> (source, copy)
        # One copy at a time: all players share the Spotify app's small request quota.
        self._gate = asyncio.Semaphore(1)
        self.listeners: list[Callable[[str], None]] = []  # called with a player id on change

    def status(self, player_id: str) -> LibraryStatus:
        player = db.get_player(self._conn, player_id)
        if player is None:
            return LibraryStatus("none", "", 0)
        return LibraryStatus(
            player.import_status, player.import_detail, db.count_tracks(self._conn, player_id)
        )

    def copying(self, player_id: str) -> str | None:
        """The id of the source whose songs are being copied right now."""
        current = self._copying.get(player_id)
        return current[0] if current else None

    def start(self, player_id: str) -> None:
        """List the player's sources again, then copy the picked ones that changed."""
        self._relist.add(player_id)
        self._wake(player_id)

    def pick(self, player_id: str, changes: dict[str, bool]) -> None:
        """Pick or unpick sources. Picked ones not copied yet are copied in the background;
        unpicking the one being copied stops its copy."""
        db.set_picked(self._conn, player_id, changes)
        current = self._copying.get(player_id)
        if current and changes.get(current[0]) is False:
            current[1].cancel()
        if db.next_source_to_copy(self._conn, player_id):
            self._wake(player_id)
        self._notify(player_id)

    async def stop(self, player_id: str) -> None:
        self._relist.discard(player_id)
        task = self._workers.pop(player_id, None)
        if task and not task.done():
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)

    def _wake(self, player_id: str) -> None:
        """Make sure the player's worker runs. A running one sees new work on its next round."""
        task = self._workers.get(player_id)
        if task and not task.done():
            return
        self._set(player_id, "running", "Waiting to start")
        self._workers[player_id] = asyncio.create_task(self._run(player_id))

    def _notify(self, player_id: str) -> None:
        for listener in self.listeners:
            listener(player_id)

    def _set(self, player_id: str, status: str, detail: str) -> None:
        log.debug("import for %s: %s %s", player_id, status, detail)
        db.set_import_state(self._conn, player_id, status, detail)
        self._notify(player_id)

    def _name(self, player_id: str) -> str:
        player = db.get_player(self._conn, player_id)
        return player.name if player else player_id

    async def _run(self, player_id: str) -> None:
        try:
            while True:
                if player_id in self._relist:
                    self._relist.discard(player_id)
                    await self._list(player_id)
                    continue
                source = db.next_source_to_copy(self._conn, player_id)
                if source is None:
                    break
                await self._copy_unless_unpicked(player_id, source)
            # No await between finding nothing to do and finishing: a pick in between would
            # see this worker running and leave its source to it.
            self._set(player_id, "done", "")
        except SpotifyError as exc:
            log.warning("copying the library of %s failed: %s", self._name(player_id), exc)
            # Sources that finished are stored, so a partial library stays usable.
            self._set(player_id, "error", exc.friendly)
        except Exception:
            log.exception("copying the library of %s crashed", self._name(player_id))
            self._set(player_id, "error", "The import failed unexpectedly")

    # --- listing -------------------------------------------------------------------------

    async def _list(self, player_id: str) -> None:
        """Store which sources the player has. Not behind the gate: it is only a few requests."""
        self._set(player_id, "running", "Reading your library")
        now = _now()
        body = await self._spotify.request(
            player_id,
            "GET",
            "/me/tracks",
            params={"limit": 1, "offset": 0},
            patience=PATIENCE,
        )
        newest = (body.get("items") or [{}])[0].get("added_at", "")
        # In the order the Account screen shows them, which is also the order they are copied in.
        listed = [
            db.Listed("recent", "recent", "Recently played", None, now),
            db.Listed("top", "top", "Your top songs", None, now),
            db.Listed(
                "liked",
                "liked",
                "Liked songs",
                body.get("total", 0),
                f"{body.get('total')}:{newest}",
            ),
        ]
        # Spotify only returns the contents of playlists the player owns or collaborates on.
        playlists: list[db.Listed] = []
        async for page in self._spotify.pages(player_id, "/me/playlists", patience=PATIENCE):
            for p in page["items"]:
                if not p or not (
                    (p.get("owner") or {}).get("id") == player_id or p.get("collaborative")
                ):
                    continue
                # `items` replaced `tracks` in February 2026; accept either.
                total = (p.get("items") or p.get("tracks") or {}).get("total")
                playlists.append(
                    db.Listed(
                        f"playlist:{p['id']}",
                        "collaborative" if p.get("collaborative") else "playlist",
                        p.get("name") or "Untitled playlist",
                        total,
                        p.get("snapshot_id") or now,
                    )
                )
        # The playlists below them, in the order Spotify lists them, which appears to follow the
        # player's own library in the Spotify app.
        listed += playlists
        db.sync_sources(self._conn, player_id, listed, now)
        log.info(
            "listed the library of %s: %d playlist%s",
            self._name(player_id),
            len(playlists),
            "" if len(playlists) == 1 else "s",
        )

    # --- copying -------------------------------------------------------------------------

    async def _copy_unless_unpicked(self, player_id: str, source: db.Source) -> None:
        """Copy one source. Unpicking it meanwhile cancels the copy, and nothing is stored."""
        task = asyncio.create_task(self._copy(player_id, source))
        self._copying[player_id] = (source.id, task)
        try:
            await asyncio.wait([task])
        finally:
            self._copying.pop(player_id, None)
            if not task.done():  # this worker itself was cancelled
                task.cancel()
                await asyncio.gather(task, return_exceptions=True)
        if task.cancelled():
            log.info("stopped copying %s for %s", source.name, self._name(player_id))
            self._set(player_id, "running", "")
            return
        task.result()  # raises what the copy raised

    async def _copy(self, player_id: str, source: db.Source) -> None:
        self._set(player_id, "running", f"Waiting to copy {source.name}")
        async with self._gate:
            self._progress(player_id, source, 0, self._requests(source))
            if source.kind == "liked":
                copy = await self._liked(player_id, source)
            elif source.kind == "top":
                copy = await self._top(player_id, source)
            elif source.kind == "recent":
                copy = await self._recent(player_id)
            else:
                copy = await self._playlist(player_id, source)
        db.store_copy(self._conn, player_id, source, copy.tracks, copy.signals, copy.artists)
        log.info(
            "copied %s for %s: %d songs",
            source.name,
            self._name(player_id),
            len({t.id for t in copy.tracks}),
        )

    @staticmethod
    def _requests(source: db.Source) -> int:
        """How many requests copying this source will take, as far as the listing knows."""
        if source.kind == "top":
            return 2 * len(TIME_RANGES)
        if source.kind == "recent":
            return 1
        return max(1, math.ceil((source.songs or 0) / PAGE))

    def _progress(self, player_id: str, source: db.Source, done: int, total: int) -> None:
        """Report how far a copy is. The Account screen draws its progress bar from this."""
        self._set(player_id, "running", f"Copying {source.name}: {done} of {total} requests")

    def _page_done(self, player_id: str, source: db.Source, number: int, total: int) -> None:
        self._progress(player_id, source, number, max(number, math.ceil(total / PAGE)))

    async def _liked(self, player_id: str, source: db.Source) -> Copy:
        tracks: dict[str, Track] = {}
        number = 0
        async for page in self._spotify.pages(player_id, "/me/tracks", patience=PATIENCE):
            for entry in page["items"]:
                if track := parse_track(entry.get("track")):
                    tracks[track.id] = track
            number += 1
            self._page_done(player_id, source, number, page["total"])
        return Copy(list(tracks.values()), {"saved": dict.fromkeys(tracks, 1)})

    async def _playlist(self, player_id: str, source: db.Source) -> Copy:
        tracks: dict[str, Track] = {}
        number = 0
        try:
            async for page in self._spotify.pages(
                player_id,
                f"/playlists/{source.id.removeprefix('playlist:')}/items",
                params={"additional_types": "track"},
                patience=PATIENCE,
            ):
                for entry in page["items"]:
                    # `item` replaced `track` in February 2026; accept either.
                    if track := parse_track(entry.get("item") or entry.get("track")):
                        tracks[track.id] = track
                number += 1
                self._page_done(player_id, source, number, page["total"])
        except SpotifyError as exc:
            if exc.status not in (403, 404):
                raise
            # Gone or closed since the listing: stored as empty, so it isn't asked for again.
        return Copy(list(tracks.values()), {"playlist": dict.fromkeys(tracks, 1)})

    async def _top(self, player_id: str, source: db.Source) -> Copy:
        total = self._requests(source)
        tracks: dict[str, Track] = {}
        signals: dict[str, dict[str, int]] = {}
        artists: dict[str, list[Artist]] = {}
        for time_range, kind in TIME_RANGES.items():
            params = {"time_range": time_range, "limit": 50}
            body = await self._spotify.request(
                player_id, "GET", "/me/top/tracks", params=params, patience=PATIENCE
            )
            self._progress(player_id, source, 2 * len(signals) + 1, total)
            ranked = [t for t in map(parse_track, body.get("items") or []) if t]
            tracks |= {t.id: t for t in ranked}
            signals[kind] = {t.id: rank for rank, t in enumerate(ranked, start=1)}
            body = await self._spotify.request(
                player_id, "GET", "/me/top/artists", params=params, patience=PATIENCE
            )
            artists[kind] = [
                Artist(a["id"], a.get("name") or "") for a in body.get("items") or [] if a.get("id")
            ]
            self._progress(player_id, source, 2 * len(signals), total)
        return Copy(list(tracks.values()), signals, artists)

    async def _recent(self, player_id: str) -> Copy:
        body = await self._spotify.request(
            player_id,
            "GET",
            "/me/player/recently-played",
            params={"limit": 50},
            patience=PATIENCE,
        )
        played = [t for t in (parse_track(e.get("track")) for e in body.get("items") or []) if t]
        return Copy(
            list({t.id: t for t in played}.values()),
            {"recent": dict(Counter(t.id for t in played))},
        )
