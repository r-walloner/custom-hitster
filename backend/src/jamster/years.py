"""Finds the year a song first came out. Spotify's album date is often a remaster's."""

import asyncio
import datetime
import logging
import sqlite3

import httpx

from . import __version__, db
from .models import Track

log = logging.getLogger(__name__)

ISRC_URL = "https://musicbrainz.org/ws/2/isrc/"
MIN_INTERVAL = 1.1  # MusicBrainz blocks clients that exceed one request per second
EARLIEST = 1900  # dates before this are placeholders


def year_of(date: str | None) -> int | None:
    """The year of a "1975", "1975-10" or "1975-10-31" date."""
    try:
        return int((date or "")[:4])
    except ValueError:
        return None


def pick_year(musicbrainz: list[int], spotify: int | None, today: int) -> tuple[int, str] | None:
    """The earliest plausible candidate and where it came from; MusicBrainz wins a tie.

    Earliest, because every error we know of points later: remasters and compilations.
    """
    candidates = [(y, "musicbrainz") for y in musicbrainz]
    if spotify is not None:
        candidates.append((spotify, "spotify"))
    plausible = [c for c in candidates if EARLIEST <= c[0] <= today]
    return min(plausible, key=lambda c: c[0]) if plausible else None


class YearResolver:
    def __init__(
        self,
        conn: sqlite3.Connection,
        http: httpx.AsyncClient,
        contact: str,
        *,
        min_interval: float = MIN_INTERVAL,
    ) -> None:
        self._conn = conn
        self._http = http
        self._user_agent = f"Jamster/{__version__}" + (f" ( {contact} )" if contact else "")
        self._min_interval = min_interval
        self._turn = asyncio.Lock()
        self._last_call = 0.0

    async def resolve(self, track: Track) -> tuple[int, str] | None:
        """(year, source) for a track, or None if no source has a plausible year."""
        if cached := db.get_year(self._conn, track.id):
            return cached
        found = await self._lookup(track.isrc) if track.isrc else []
        picked = pick_year(found or [], year_of(track.release_date), datetime.date.today().year)
        if picked and found is not None:  # a failed lookup is retried next time, not cached
            db.put_year(self._conn, track.id, *picked)
        return picked

    async def _lookup(self, isrc: str) -> list[int] | None:
        """First-release years of the recordings filed under an ISRC; None if the call failed."""
        for attempt in range(2):
            async with self._turn:
                loop = asyncio.get_running_loop()
                await asyncio.sleep(self._last_call + self._min_interval - loop.time())
                try:
                    resp = await self._http.get(
                        f"{ISRC_URL}{isrc}",
                        params={"fmt": "json"},
                        headers={"User-Agent": self._user_agent},
                    )
                except httpx.TransportError as exc:
                    log.warning("MusicBrainz unreachable: %s", exc)
                    return None
                finally:
                    self._last_call = loop.time()
            if resp.status_code == 404:
                return []
            if resp.is_success:
                years = (year_of(r.get("first-release-date")) for r in resp.json()["recordings"])
                return [y for y in years if y is not None]
            log.warning("MusicBrainz answered %s for %s", resp.status_code, isrc)
            if attempt == 0:
                await asyncio.sleep(2 * self._min_interval)
        return None
