"""All SQL lives here. One connection, used only from the event loop thread."""

import json
import sqlite3
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .models import Artist, Signal, Track

SCHEMA = """
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,                         -- Spotify user id
    name TEXT NOT NULL,
    refresh_token TEXT,                          -- NULL once Spotify rejects it
    import_status TEXT NOT NULL DEFAULT 'none',  -- none | running | done | error
    import_detail TEXT NOT NULL DEFAULT '',
    refreshed_at TEXT                            -- UTC ISO time the sources were last listed
);

CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,                         -- Spotify track id
    uri TEXT NOT NULL,
    name TEXT NOT NULL,
    artists TEXT NOT NULL,                       -- JSON: [[artist id, name], ...]
    album_name TEXT NOT NULL,
    image_url TEXT,
    release_date TEXT,
    isrc TEXT,
    duration_ms INTEGER NOT NULL
);

-- What a player can put in the deck: liked songs, top songs, recent plays and each playlist
-- they own or collaborate on. Listing them is cheap; only picked ones have their songs copied.
CREATE TABLE IF NOT EXISTS sources (
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    id TEXT NOT NULL,                            -- liked | top | recent | playlist:<Spotify id>
    kind TEXT NOT NULL,                          -- liked | top | recent | playlist | collaborative
    name TEXT NOT NULL,
    position INTEGER NOT NULL,                   -- order on the library screen
    songs INTEGER,                               -- as Spotify counts them; NULL until known
    picked INTEGER NOT NULL,                     -- 1 if its songs may go into decks
    version TEXT NOT NULL,                       -- changes when the contents may have changed
    copied_version TEXT,                         -- the version last copied; NULL: never copied
    PRIMARY KEY (player_id, id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS track_signals (
    player_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    track_id TEXT NOT NULL REFERENCES tracks(id),
    kind TEXT NOT NULL,
    value INTEGER NOT NULL,
    PRIMARY KEY (player_id, source_id, track_id, kind),
    FOREIGN KEY (player_id, source_id) REFERENCES sources(player_id, id) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS artist_signals (
    player_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    kind TEXT NOT NULL,
    value INTEGER NOT NULL,
    PRIMARY KEY (player_id, source_id, artist_id, kind),
    FOREIGN KEY (player_id, source_id) REFERENCES sources(player_id, id) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS years (
    track_id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    source TEXT NOT NULL                         -- musicbrainz | spotify | manual | classic
);

-- The songs of classics.json that have a Spotify track, copied from the list at startup.
CREATE TABLE IF NOT EXISTS classics (
    key TEXT PRIMARY KEY,                        -- see classics.key
    track_id TEXT REFERENCES tracks(id),
    year INTEGER NOT NULL,                       -- the list's year
    checked_at TEXT NOT NULL                     -- UTC ISO time it was copied from the list
);
"""


@dataclass(frozen=True, slots=True)
class Player:
    id: str
    name: str
    refresh_token: str | None
    import_status: str
    import_detail: str
    refreshed_at: str | None


@dataclass(frozen=True, slots=True)
class Source:
    id: str
    kind: str
    name: str
    songs: int | None
    picked: bool
    version: str
    copied_version: str | None

    @property
    def copied(self) -> bool:
        """Its songs are stored, as of its latest listing."""
        return self.copied_version == self.version


@dataclass(frozen=True, slots=True)
class Listed:
    """A source as the listing found it."""

    id: str
    kind: str
    name: str
    songs: int | None
    version: str


# Picked when a player's sources are listed for the first time: their own songs. Playlists
# wait until the player picks them.
PICKED_AT_FIRST = {"liked", "top", "recent"}


def connect(path: Path | str) -> sqlite3.Connection:
    # check_same_thread=False: the connection is created on one thread and used on the loop's.
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    # An import that was running when the server stopped will never finish.
    with conn:
        conn.execute(
            "UPDATE players SET import_status = 'error', import_detail = 'Interrupted by a restart'"
            " WHERE import_status = 'running'"
        )
    return conn


# --- players ---------------------------------------------------------------------------------


def upsert_player(conn: sqlite3.Connection, id: str, name: str, refresh_token: str) -> None:
    """Store a login. `name` is only the first name; after that the player picks their own."""
    with conn:
        conn.execute(
            "INSERT INTO players (id, name, refresh_token) VALUES (?, ?, ?)"
            " ON CONFLICT (id) DO UPDATE SET refresh_token = excluded.refresh_token",
            (id, name, refresh_token),
        )


def set_player_name(conn: sqlite3.Connection, id: str, name: str) -> None:
    with conn:
        conn.execute("UPDATE players SET name = ? WHERE id = ?", (name, id))


def get_player(conn: sqlite3.Connection, id: str) -> Player | None:
    row = conn.execute(
        "SELECT id, name, refresh_token, import_status, import_detail, refreshed_at"
        " FROM players WHERE id = ?",
        (id,),
    ).fetchone()
    return Player(*row) if row else None


def set_refresh_token(conn: sqlite3.Connection, id: str, token: str | None) -> None:
    with conn:
        conn.execute("UPDATE players SET refresh_token = ? WHERE id = ?", (token, id))


def set_import_state(conn: sqlite3.Connection, id: str, status: str, detail: str) -> None:
    with conn:
        conn.execute(
            "UPDATE players SET import_status = ?, import_detail = ? WHERE id = ?",
            (status, detail, id),
        )


def delete_player(conn: sqlite3.Connection, id: str) -> None:
    """Remove the player, their token and their signals (the foreign keys cascade)."""
    with conn:
        conn.execute("DELETE FROM players WHERE id = ?", (id,))


# --- library ---------------------------------------------------------------------------------


def _upsert_tracks(conn: sqlite3.Connection, tracks: Iterable[Track]) -> None:
    """Store tracks, inside the caller's transaction."""
    conn.executemany(
        "INSERT INTO tracks"
        " (id, uri, name, artists, album_name, image_url, release_date, isrc, duration_ms)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        " ON CONFLICT (id) DO UPDATE SET uri = excluded.uri, name = excluded.name,"
        " artists = excluded.artists, album_name = excluded.album_name,"
        " image_url = excluded.image_url, release_date = excluded.release_date,"
        " isrc = excluded.isrc, duration_ms = excluded.duration_ms",
        (
            (
                t.id,
                t.uri,
                t.name,
                json.dumps([[a.id, a.name] for a in t.artists]),
                t.album_name,
                t.image_url,
                t.release_date,
                t.isrc,
                t.duration_ms,
            )
            for t in tracks
        ),
    )


def sync_sources(
    conn: sqlite3.Connection, player_id: str, listed: list[Listed], refreshed_at: str
) -> None:
    """Make the player's sources what the listing found. Picks and copies of the sources that
    are still there are kept; new ones start unpicked, except on the very first listing; the
    ones that are gone are deleted with their signals."""
    with conn:
        first = not conn.execute(
            "SELECT 1 FROM sources WHERE player_id = ? LIMIT 1", (player_id,)
        ).fetchone()
        conn.executemany(
            "INSERT INTO sources (player_id, id, kind, name, position, songs, picked, version)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            " ON CONFLICT (player_id, id) DO UPDATE SET kind = excluded.kind,"
            " name = excluded.name, position = excluded.position,"
            " songs = COALESCE(excluded.songs, sources.songs), version = excluded.version",
            (
                (
                    player_id,
                    x.id,
                    x.kind,
                    x.name,
                    n,
                    x.songs,
                    first and x.id in PICKED_AT_FIRST,
                    x.version,
                )
                for n, x in enumerate(listed)
            ),
        )
        marks = ",".join("?" * len(listed))
        conn.execute(
            f"DELETE FROM sources WHERE player_id = ? AND id NOT IN ({marks})",
            (player_id, *(x.id for x in listed)),
        )
        conn.execute("UPDATE players SET refreshed_at = ? WHERE id = ?", (refreshed_at, player_id))


def list_sources(conn: sqlite3.Connection, player_id: str) -> list[Source]:
    rows = conn.execute(
        "SELECT id, kind, name, songs, picked, version, copied_version FROM sources"
        " WHERE player_id = ? ORDER BY position",
        (player_id,),
    )
    return [
        Source(id, kind, name, songs, bool(picked), version, copied)
        for id, kind, name, songs, picked, version, copied in rows
    ]


def set_picked(conn: sqlite3.Connection, player_id: str, changes: dict[str, bool]) -> None:
    """Pick or unpick sources by id. Ids the player doesn't have are ignored."""
    with conn:
        conn.executemany(
            "UPDATE sources SET picked = ? WHERE player_id = ? AND id = ?",
            ((picked, player_id, id) for id, picked in changes.items()),
        )


def next_source_to_copy(conn: sqlite3.Connection, player_id: str) -> Source | None:
    """The first picked source whose songs aren't stored as of its latest listing."""
    return next((s for s in list_sources(conn, player_id) if s.picked and not s.copied), None)


def store_copy(
    conn: sqlite3.Connection,
    player_id: str,
    source: Source,
    tracks: Iterable[Track],
    signals: dict[str, dict[str, int]],
    artists: dict[str, list[Artist]] | None = None,
) -> None:
    """Swap a source's signals for a fresh copy, in one go.

    `signals` maps a kind to {track id: value}; `artists` maps a kind to artists, best first.
    The source then counts as copied at the version it was listed with.
    """
    with conn:
        _upsert_tracks(conn, tracks)
        key = (player_id, source.id)
        conn.execute("DELETE FROM track_signals WHERE player_id = ? AND source_id = ?", key)
        conn.execute("DELETE FROM artist_signals WHERE player_id = ? AND source_id = ?", key)
        conn.executemany(
            "INSERT INTO track_signals (player_id, source_id, track_id, kind, value)"
            " VALUES (?, ?, ?, ?, ?)",
            (
                (*key, track_id, kind, value)
                for kind, values in signals.items()
                for track_id, value in values.items()
            ),
        )
        conn.executemany(
            "INSERT OR IGNORE INTO artist_signals"
            " (player_id, source_id, artist_id, artist_name, kind, value)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                (*key, a.id, a.name, kind, rank)
                for kind, ranked in (artists or {}).items()
                for rank, a in enumerate(ranked, start=1)
            ),
        )
        songs = len({track_id for values in signals.values() for track_id in values})
        conn.execute(
            "UPDATE sources SET copied_version = ?,"
            " songs = CASE WHEN kind IN ('top', 'recent') THEN ? ELSE songs END"
            " WHERE player_id = ? AND id = ?",
            (source.version, songs, *key),
        )


# Signals reach decks only from picked sources.
_PICKED = "JOIN sources src ON src.player_id = s.player_id AND src.id = s.source_id AND src.picked"


def count_tracks(conn: sqlite3.Connection, player_id: str) -> int:
    """How many songs this player's picked sources hold."""
    row = conn.execute(
        f"SELECT COUNT(DISTINCT s.track_id) FROM track_signals s {_PICKED} WHERE s.player_id = ?",
        (player_id,),
    ).fetchone()
    return row[0]


def track_signals(conn: sqlite3.Connection, player_id: str) -> dict[str, tuple[Signal, ...]]:
    """track id -> signals, from the picked sources. Values of one kind add up across sources,
    so a track's `playlist` signal counts the picked playlists it is in."""
    out: dict[str, tuple[Signal, ...]] = {}
    for track_id, kind, value in conn.execute(
        f"SELECT s.track_id, s.kind, SUM(s.value) FROM track_signals s {_PICKED}"
        " WHERE s.player_id = ? GROUP BY s.track_id, s.kind",
        (player_id,),
    ):
        out[track_id] = (*out.get(track_id, ()), Signal(kind, value))
    return out


def artist_signals(conn: sqlite3.Connection, player_id: str) -> dict[str, tuple[Signal, ...]]:
    out: dict[str, tuple[Signal, ...]] = {}
    for artist_id, kind, value in conn.execute(
        f"SELECT s.artist_id, s.kind, MIN(s.value) FROM artist_signals s {_PICKED}"
        " WHERE s.player_id = ? GROUP BY s.artist_id, s.kind",
        (player_id,),
    ):
        out[artist_id] = (*out.get(artist_id, ()), Signal(kind, value))
    return out


_TRACK_COLUMNS = (
    "t.id, t.uri, t.name, t.artists, t.album_name, t.image_url, t.release_date, t.isrc,"
    " t.duration_ms"
)


def _track(row: Sequence[Any]) -> Track:
    """A Track from the columns of _TRACK_COLUMNS."""
    id, uri, name, artists, album_name, image_url, release_date, isrc, duration_ms = row
    return Track(
        id=id,
        uri=uri,
        name=name,
        artists=tuple(Artist(a, n) for a, n in json.loads(artists)),
        album_name=album_name,
        image_url=image_url,
        release_date=release_date,
        isrc=isrc,
        duration_ms=duration_ms,
    )


def tracks_known_to(conn: sqlite3.Connection, player_ids: list[str]) -> dict[str, Track]:
    """Every track in a picked source of at least one of these players."""
    marks = ",".join("?" * len(player_ids))
    rows = conn.execute(
        f"SELECT DISTINCT {_TRACK_COLUMNS}"
        f" FROM tracks t JOIN track_signals s ON s.track_id = t.id {_PICKED}"
        f" WHERE s.player_id IN ({marks})",
        player_ids,
    )
    tracks = (_track(row) for row in rows)
    return {t.id: t for t in tracks}


def players_with_tracks(conn: sqlite3.Connection) -> list[Player]:
    """Every player whose picked sources hold at least one song, by name."""
    rows = conn.execute(
        "SELECT id, name, refresh_token, import_status, import_detail, refreshed_at"
        " FROM players p WHERE EXISTS"
        f" (SELECT 1 FROM track_signals s {_PICKED} WHERE s.player_id = p.id)"
        " ORDER BY name"
    )
    return [Player(*row) for row in rows]


def random_track_uri(conn: sqlite3.Connection, player_id: str) -> str | None:
    row = conn.execute(
        f"SELECT t.uri FROM tracks t JOIN track_signals s ON s.track_id = t.id {_PICKED}"
        " WHERE s.player_id = ? ORDER BY RANDOM() LIMIT 1",
        (player_id,),
    ).fetchone()
    return row[0] if row else None


# --- years -----------------------------------------------------------------------------------


def get_year(conn: sqlite3.Connection, track_id: str) -> tuple[int, str] | None:
    row = conn.execute("SELECT year, source FROM years WHERE track_id = ?", (track_id,)).fetchone()
    return (row[0], row[1]) if row else None


def years_of(conn: sqlite3.Connection, track_ids: Iterable[str]) -> dict[str, int]:
    """The cached years of these tracks, as far as there are any."""
    ids = list(track_ids)
    out: dict[str, int] = {}
    for start in range(0, len(ids), 500):  # SQLite caps the number of parameters
        chunk = ids[start : start + 500]
        marks = ",".join("?" * len(chunk))
        out.update(
            conn.execute(f"SELECT track_id, year FROM years WHERE track_id IN ({marks})", chunk)
        )
    return out


def put_year(conn: sqlite3.Connection, track_id: str, year: int, source: str) -> None:
    """Cache a resolved year. A manual entry is never overwritten."""
    with conn:
        conn.execute(
            "INSERT INTO years (track_id, year, source) VALUES (?, ?, ?)"
            " ON CONFLICT (track_id) DO UPDATE SET year = excluded.year, source = excluded.source"
            " WHERE years.source != 'manual'",
            (track_id, year, source),
        )


# --- classics --------------------------------------------------------------------------------


def replace_classics(
    conn: sqlite3.Connection, found: Sequence[tuple[str, Track, int]], stored_at: str
) -> None:
    """Make the classics these (key, track, list year); each track gets the list's year,
    unless that was set by hand."""
    with conn:
        conn.execute("DELETE FROM classics")
        _upsert_tracks(conn, (track for _, track, _ in found))
        conn.executemany(
            "INSERT INTO classics (key, track_id, year, checked_at) VALUES (?, ?, ?, ?)",
            ((key, track.id, year, stored_at) for key, track, year in found),
        )
        conn.executemany(
            "INSERT INTO years (track_id, year, source) VALUES (?, ?, 'classic')"
            " ON CONFLICT (track_id) DO UPDATE SET year = excluded.year, source = 'classic'"
            " WHERE years.source != 'manual'",
            ((track.id, year) for _, track, year in found),
        )


def found_classics(conn: sqlite3.Connection) -> list[tuple[Track, int]]:
    """The classics found on Spotify, with the list's year."""
    rows = conn.execute(
        f"SELECT {_TRACK_COLUMNS}, c.year FROM classics c JOIN tracks t ON t.id = c.track_id"
        " ORDER BY c.key"
    )
    return [(_track(row[:-1]), row[-1]) for row in rows]
