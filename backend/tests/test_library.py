"""Which signals reach a deck: only those of the sources a player picked."""

import sqlite3

from jamster import db
from jamster.models import Signal, Track


def track(n: int) -> Track:
    return Track(f"t{n}", f"spotify:track:t{n}", f"Song {n}", (), "", None, "1990", None, 1000)


def library() -> tuple[sqlite3.Connection, dict[str, db.Source]]:
    conn = db.connect(":memory:")
    db.upsert_player(conn, "p", "Pat", "rt")
    listed = [
        db.Listed("liked", "liked", "Liked songs", 2, "v1"),
        db.Listed("top", "top", "Your top songs", None, "v1"),
        db.Listed("playlist:a", "playlist", "A", 2, "a1"),
        db.Listed("playlist:b", "playlist", "B", 1, "b1"),
    ]
    db.sync_sources(conn, "p", listed, "2026-11-18T12:00:00+00:00")
    sources = {s.id: s for s in db.list_sources(conn, "p")}
    db.store_copy(conn, "p", sources["liked"], [track(1), track(2)], {"saved": {"t1": 1, "t2": 1}})
    db.store_copy(conn, "p", sources["top"], [track(1)], {"top_short": {"t1": 1}})
    db.store_copy(
        conn, "p", sources["playlist:a"], [track(2), track(3)], {"playlist": {"t2": 1, "t3": 1}}
    )
    db.store_copy(conn, "p", sources["playlist:b"], [track(3)], {"playlist": {"t3": 1}})
    return conn, sources


def test_the_first_listing_picks_every_source():
    conn, sources = library()
    assert all(s.picked for s in sources.values())
    assert db.next_source_to_copy(conn, "p") is None
    signals = {track: set(found) for track, found in db.track_signals(conn, "p").items()}
    assert signals == {
        "t1": {Signal("saved", 1), Signal("top_short", 1)},
        "t2": {Signal("saved", 1), Signal("playlist", 1)},
        "t3": {Signal("playlist", 2)},
    }


def test_signals_add_up_across_picked_sources_only():
    conn, _ = library()
    changes = {"liked": False, "top": False, "playlist:a": True, "playlist:b": True, "nope": True}
    db.set_picked(conn, "p", changes)
    assert db.track_signals(conn, "p") == {
        "t2": (Signal("playlist", 1),),
        "t3": (Signal("playlist", 2),),
    }
    assert db.count_tracks(conn, "p") == 2
    assert set(db.tracks_known_to(conn, ["p"])) == {"t2", "t3"}


def test_a_new_version_needs_copying_and_a_vanished_source_takes_its_signals():
    conn, _ = library()
    db.set_picked(conn, "p", {"playlist:a": False})
    listed = [
        db.Listed("liked", "liked", "Liked songs", 2, "v1"),
        db.Listed("top", "top", "Your top songs", None, "v2"),
        db.Listed("playlist:a", "playlist", "A", 2, "a1"),
        db.Listed("playlist:c", "playlist", "C", 9, "c1"),
    ]
    db.sync_sources(conn, "p", listed, "2026-11-19T12:00:00+00:00")
    sources = {s.id: s for s in db.list_sources(conn, "p")}
    assert list(sources) == ["liked", "top", "playlist:a", "playlist:c"]
    assert sources["playlist:c"].picked  # new playlists start picked
    assert not sources["playlist:a"].picked  # an unpicked one stays unpicked
    assert sources["top"].songs == 1  # the copied count survives a listing without one
    next_up = db.next_source_to_copy(conn, "p")
    assert next_up is not None and next_up.id == "top"
    row = conn.execute("SELECT COUNT(*) FROM track_signals WHERE source_id = 'playlist:b'")
    assert row.fetchone()[0] == 0
