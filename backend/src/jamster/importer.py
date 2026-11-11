"""Copies a player's Spotify library into the database as tracks plus taste signals."""

import asyncio
import logging
import sqlite3
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from . import db
from .models import Artist, Track
from .spotify import Spotify, SpotifyError

log = logging.getLogger(__name__)

# Seconds one request may wait out Spotify's rate limit before the import gives up.
PATIENCE = 120.0
TIME_RANGES = {"short_term": "top_short", "medium_term": "top_medium", "long_term": "top_long"}


@dataclass(frozen=True, slots=True)
class LibraryStatus:
    status: str  # none | running | done | error
    detail: str
    tracks: int


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
    )


class Importer:
    def __init__(self, conn: sqlite3.Connection, spotify: Spotify) -> None:
        self._conn = conn
        self._spotify = spotify
        self._tasks: dict[str, asyncio.Task[None]] = {}
        # One import at a time: all players share the Spotify app's small request quota.
        self._gate = asyncio.Semaphore(1)
        self.listeners: list[Callable[[str], None]] = []  # called with a player id on change

    def status(self, player_id: str) -> LibraryStatus:
        player = db.get_player(self._conn, player_id)
        if player is None:
            return LibraryStatus("none", "", 0)
        return LibraryStatus(
            player.import_status, player.import_detail, db.count_tracks(self._conn, player_id)
        )

    def start(self, player_id: str) -> None:
        """Begin importing in the background. Does nothing if an import is already running."""
        task = self._tasks.get(player_id)
        if task and not task.done():
            return
        self._set(player_id, "running", "Waiting to start")
        self._tasks[player_id] = asyncio.create_task(self._run(player_id))

    async def stop(self, player_id: str) -> None:
        task = self._tasks.pop(player_id, None)
        if task and not task.done():
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)

    def _set(self, player_id: str, status: str, detail: str) -> None:
        db.set_import_state(self._conn, player_id, status, detail)
        for listener in self.listeners:
            listener(player_id)

    async def _run(self, player_id: str) -> None:
        try:
            async with self._gate:
                await self._saved(player_id)
                await self._playlists(player_id)
                await self._top(player_id)
                await self._recent(player_id)
            self._set(player_id, "done", "")
        except SpotifyError as exc:
            log.warning("import for %s failed: %s", player_id, exc)
            # Sections that finished are already stored, so a partial library stays usable.
            self._set(player_id, "error", exc.friendly)
        except Exception:
            log.exception("import for %s crashed", player_id)
            self._set(player_id, "error", "The import failed unexpectedly")

    async def _saved(self, player_id: str) -> None:
        tracks: dict[str, Track] = {}
        async for page in self._spotify.pages(player_id, "/me/tracks", patience=PATIENCE):
            for entry in page["items"]:
                if track := parse_track(entry.get("track")):
                    tracks[track.id] = track
            self._set(player_id, "running", f"Saved tracks: {len(tracks)} of {page['total']}")
        db.upsert_tracks(self._conn, tracks.values())
        db.replace_track_signals(self._conn, player_id, "saved", dict.fromkeys(tracks, 1))

    async def _playlists(self, player_id: str) -> None:
        # Spotify only returns the contents of playlists the player owns or collaborates on.
        playlists: list[dict[str, Any]] = []
        async for page in self._spotify.pages(player_id, "/me/playlists", patience=PATIENCE):
            playlists += [
                p
                for p in page["items"]
                if p and ((p.get("owner") or {}).get("id") == player_id or p.get("collaborative"))
            ]
        tracks: dict[str, Track] = {}
        counts: Counter[str] = Counter()
        for number, playlist in enumerate(playlists, start=1):
            self._set(player_id, "running", f"Playlists: {number} of {len(playlists)}")
            seen: set[str] = set()
            try:
                async for page in self._spotify.pages(
                    player_id,
                    f"/playlists/{playlist['id']}/items",
                    params={"additional_types": "track"},
                    patience=PATIENCE,
                ):
                    for entry in page["items"]:
                        # `item` replaced `track` in February 2026; accept either.
                        if track := parse_track(entry.get("item") or entry.get("track")):
                            tracks[track.id] = track
                            seen.add(track.id)
            except SpotifyError as exc:
                if exc.status not in (403, 404):
                    raise
            counts.update(seen)
        db.upsert_tracks(self._conn, tracks.values())
        db.replace_track_signals(self._conn, player_id, "playlist", dict(counts))

    async def _top(self, player_id: str) -> None:
        self._set(player_id, "running", "Top tracks and artists")
        for time_range, kind in TIME_RANGES.items():
            params = {"time_range": time_range, "limit": 50}
            body = await self._spotify.request(
                player_id, "GET", "/me/top/tracks", params=params, patience=PATIENCE
            )
            tracks = [t for t in map(parse_track, body.get("items") or []) if t]
            db.upsert_tracks(self._conn, tracks)
            db.replace_track_signals(
                self._conn, player_id, kind, {t.id: rank for rank, t in enumerate(tracks, start=1)}
            )
            body = await self._spotify.request(
                player_id, "GET", "/me/top/artists", params=params, patience=PATIENCE
            )
            artists = [
                Artist(a["id"], a.get("name") or "") for a in body.get("items") or [] if a.get("id")
            ]
            db.replace_artist_signals(self._conn, player_id, kind, artists)

    async def _recent(self, player_id: str) -> None:
        self._set(player_id, "running", "Recently played")
        body = await self._spotify.request(
            player_id,
            "GET",
            "/me/player/recently-played",
            params={"limit": 50},
            patience=PATIENCE,
        )
        tracks = [t for t in (parse_track(e.get("track")) for e in body.get("items") or []) if t]
        db.upsert_tracks(self._conn, tracks)
        db.replace_track_signals(
            self._conn, player_id, "recent", dict(Counter(t.id for t in tracks))
        )
