"""All SQL lives here. One connection, used only from the event loop thread."""

import json
import sqlite3
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

from .models import Artist, Signal, Track

SCHEMA = """
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,                         -- Spotify user id
    name TEXT NOT NULL,
    refresh_token TEXT,                          -- NULL once Spotify rejects it
    import_status TEXT NOT NULL DEFAULT 'none',  -- none | running | done | error
    import_detail TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,                         -- Spotify track id
    uri TEXT NOT NULL,
    name TEXT NOT NULL,
    artists TEXT NOT NULL,                       -- JSON: [[artist id, name], ...]
    album_name TEXT NOT NULL,
    image_url TEXT,
    release_date TEXT,
    isrc TEXT
);

CREATE TABLE IF NOT EXISTS track_signals (
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL REFERENCES tracks(id),
    kind TEXT NOT NULL,
    value INTEGER NOT NULL,
    PRIMARY KEY (player_id, track_id, kind)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS artist_signals (
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    artist_id TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    kind TEXT NOT NULL,
    value INTEGER NOT NULL,
    PRIMARY KEY (player_id, artist_id, kind)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS years (
    track_id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    source TEXT NOT NULL                         -- musicbrainz | spotify | manual
);
"""


@dataclass(frozen=True, slots=True)
class Player:
    id: str
    name: str
    refresh_token: str | None
    import_status: str
    import_detail: str


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
    with conn:
        conn.execute(
            "INSERT INTO players (id, name, refresh_token) VALUES (?, ?, ?)"
            " ON CONFLICT (id) DO UPDATE SET name = excluded.name,"
            " refresh_token = excluded.refresh_token",
            (id, name, refresh_token),
        )


def get_player(conn: sqlite3.Connection, id: str) -> Player | None:
    row = conn.execute(
        "SELECT id, name, refresh_token, import_status, import_detail FROM players WHERE id = ?",
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


def upsert_tracks(conn: sqlite3.Connection, tracks: Iterable[Track]) -> None:
    with conn:
        conn.executemany(
            "INSERT INTO tracks (id, uri, name, artists, album_name, image_url, release_date, isrc)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            " ON CONFLICT (id) DO UPDATE SET uri = excluded.uri, name = excluded.name,"
            " artists = excluded.artists, album_name = excluded.album_name,"
            " image_url = excluded.image_url, release_date = excluded.release_date,"
            " isrc = excluded.isrc",
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
                )
                for t in tracks
            ),
        )


def replace_track_signals(
    conn: sqlite3.Connection, player_id: str, kind: str, values: dict[str, int]
) -> None:
    """Swap all of a player's signals of one kind for `values` (track id -> value)."""
    with conn:
        conn.execute(
            "DELETE FROM track_signals WHERE player_id = ? AND kind = ?", (player_id, kind)
        )
        conn.executemany(
            "INSERT INTO track_signals (player_id, track_id, kind, value) VALUES (?, ?, ?, ?)",
            ((player_id, track_id, kind, value) for track_id, value in values.items()),
        )


def replace_artist_signals(
    conn: sqlite3.Connection, player_id: str, kind: str, ranked: list[Artist]
) -> None:
    """Swap all of a player's artist signals of one kind for `ranked` (best first)."""
    with conn:
        conn.execute(
            "DELETE FROM artist_signals WHERE player_id = ? AND kind = ?", (player_id, kind)
        )
        conn.executemany(
            "INSERT OR IGNORE INTO artist_signals (player_id, artist_id, artist_name, kind, value)"
            " VALUES (?, ?, ?, ?, ?)",
            ((player_id, a.id, a.name, kind, rank) for rank, a in enumerate(ranked, start=1)),
        )


def count_tracks(conn: sqlite3.Connection, player_id: str) -> int:
    row = conn.execute(
        "SELECT COUNT(DISTINCT track_id) FROM track_signals WHERE player_id = ?", (player_id,)
    ).fetchone()
    return row[0]


def track_signals(conn: sqlite3.Connection, player_id: str) -> dict[str, tuple[Signal, ...]]:
    out: dict[str, tuple[Signal, ...]] = {}
    for track_id, kind, value in conn.execute(
        "SELECT track_id, kind, value FROM track_signals WHERE player_id = ?", (player_id,)
    ):
        out[track_id] = (*out.get(track_id, ()), Signal(kind, value))
    return out


def artist_signals(conn: sqlite3.Connection, player_id: str) -> dict[str, tuple[Signal, ...]]:
    out: dict[str, tuple[Signal, ...]] = {}
    for artist_id, kind, value in conn.execute(
        "SELECT artist_id, kind, value FROM artist_signals WHERE player_id = ?", (player_id,)
    ):
        out[artist_id] = (*out.get(artist_id, ()), Signal(kind, value))
    return out


def tracks_known_to(conn: sqlite3.Connection, player_ids: list[str]) -> dict[str, Track]:
    """Every track at least one of these players has a signal for."""
    marks = ",".join("?" * len(player_ids))
    rows = conn.execute(
        "SELECT DISTINCT t.id, t.uri, t.name, t.artists, t.album_name, t.image_url,"
        " t.release_date, t.isrc FROM tracks t JOIN track_signals s ON s.track_id = t.id"
        f" WHERE s.player_id IN ({marks})",
        player_ids,
    )
    return {
        id: Track(
            id=id,
            uri=uri,
            name=name,
            artists=tuple(Artist(a, n) for a, n in json.loads(artists)),
            album_name=album_name,
            image_url=image_url,
            release_date=release_date,
            isrc=isrc,
        )
        for id, uri, name, artists, album_name, image_url, release_date, isrc in rows
    }


def random_track_uri(conn: sqlite3.Connection, player_id: str) -> str | None:
    row = conn.execute(
        "SELECT t.uri FROM tracks t JOIN track_signals s ON s.track_id = t.id"
        " WHERE s.player_id = ? ORDER BY RANDOM() LIMIT 1",
        (player_id,),
    ).fetchone()
    return row[0] if row else None


# --- years -----------------------------------------------------------------------------------


def get_year(conn: sqlite3.Connection, track_id: str) -> tuple[int, str] | None:
    row = conn.execute("SELECT year, source FROM years WHERE track_id = ?", (track_id,)).fetchone()
    return (row[0], row[1]) if row else None


def put_year(conn: sqlite3.Connection, track_id: str, year: int, source: str) -> None:
    """Cache a resolved year. A manual entry is never overwritten."""
    with conn:
        conn.execute(
            "INSERT INTO years (track_id, year, source) VALUES (?, ?, ?)"
            " ON CONFLICT (track_id) DO UPDATE SET year = excluded.year, source = excluded.source"
            " WHERE years.source != 'manual'",
            (track_id, year, source),
        )
