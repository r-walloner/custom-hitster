import asyncio
import json
import logging
from dataclasses import replace
from pathlib import Path
from typing import Any

import httpx
import pytest
from fake_spotify import FakeSpotify
from offline_settings import OfflineSettings

from jamster import classics, db
from jamster.classics import ListedClassic, best_match
from jamster.importer import parse_track
from jamster.spotify import Spotify


def found(id: str, name: str, artist: str, date: str) -> dict[str, Any]:
    return {
        "type": "track",
        "id": id,
        "uri": f"spotify:track:{id}",
        "name": name,
        "artists": [{"id": f"id-{artist}", "name": artist}],
        "album": {"name": "Album", "release_date": date, "images": []},
        "external_ids": {"isrc": f"ISRC-{id}"},
        "duration_ms": 200_000,
    }


def test_the_best_match_is_the_earliest_release_of_the_listed_song():
    entry = ListedClassic("Elton John", "Rocket Man", 1972)
    full = "Rocket Man (I Think It's Going to Be a Long, Long Time)"
    results = [
        found("best-of", "Rocket Man - Remastered", "Elton John", "2017"),
        found("original", full, "Elton John", "1972"),
        found("remix", "Rocket Man - Club Remix", "Elton John", "1971"),
        found("cover", "Rocket Man", "Somebody Else", "1960"),
    ]
    tracks = [t for t in map(parse_track, results) if t]
    assert best_match(entry, tracks) is not None
    assert best_match(entry, tracks).id == "best-of", "an exact title beats a longer one"  # type: ignore[union-attr]
    assert best_match(entry, tracks[1:3]).id == "original"  # type: ignore[union-attr]
    assert best_match(entry, tracks[2:]) is None, "neither a remix nor a cover"


def write_list(path: Path, *entries: tuple[str, str, int]) -> Path:
    path.write_text(json.dumps([{"artist": a, "title": t, "year": y} for a, t, y in entries]))
    return path


def look_up(fake: FakeSpotify, entries: list[ListedClassic], **options: Any) -> list[ListedClassic]:
    settings = OfflineSettings(
        spotify_client_id="id", spotify_client_secret="secret", session_secret="s"
    )

    async def run() -> list[ListedClassic]:
        async with httpx.AsyncClient(transport=httpx.MockTransport(fake)) as http:
            spotify = Spotify(settings, db.connect(":memory:"), http)
            return await classics.look_up(spotify, entries, interval=0, **options)

    return asyncio.run(run())


def test_looking_up_fills_in_the_tracks_and_marks_the_songs_not_found(tmp_path: Path):
    fake = FakeSpotify()
    fake.searchable = [
        found("q1", "Bohemian Rhapsody - Remastered 2011", "Queen", "2011"),
        found("n1", "99 Luftballons", "Nena", "1983"),
    ]
    path = write_list(
        tmp_path / "classics.json",
        ("Queen", "Bohemian Rhapsody", 1975),
        ("Nena", "99 Luftballons", 1983),
        ("Nobody", "Not on Spotify", 1999),
    )
    classics.save(path, look_up(fake, classics.load(path)))
    listed = classics.load(path)

    assert [(e.looked_up, e.track.id if e.track else None) for e in listed] == [
        (True, "q1"),
        (True, "n1"),
        (True, None),
    ]
    assert listed[0].track and listed[0].track.artists[0].name == "Queen"
    assert '"track": null' in path.read_text() and len(path.read_text().splitlines()) == 5
    assert len(fake.requests) == 3

    # Looked up once is enough; --again only searches again for the ones not found.
    look_up(fake, listed)
    assert len(fake.requests) == 3
    look_up(fake, listed, again=True)
    assert len(fake.requests) == 4 and "Nobody" in fake.requests[3]


def test_startup_copies_the_list_into_the_database_without_asking_anyone(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
):
    caplog.set_level(logging.INFO, logger="jamster")
    fake = FakeSpotify()
    fake.searchable = [found("q1", "Bohemian Rhapsody", "Queen", "2011")]
    path = write_list(tmp_path / "classics.json", ("Queen", "Bohemian Rhapsody", 1975))
    classics.save(path, look_up(fake, classics.load(path)))
    with path.open("r+") as f:  # a song added by hand, not looked up yet
        entries = json.load(f)
        entries.append({"artist": "Nena", "title": "99 Luftballons", "year": 1983})
        f.seek(0)
        json.dump(entries, f)
    conn = db.connect(":memory:")

    classics.sync(conn, path)
    assert [(t.id, year) for t, year in db.found_classics(conn)] == [("q1", 1975)]
    assert db.get_year(conn, "q1") == (1975, "classic"), "the list's year, not Spotify's"
    assert "1 of 2 classics are ready; 1 are not looked up on Spotify yet, see classics.py" in [
        r.getMessage() for r in caplog.records
    ]

    # A year changed on the list is taken over; a song dropped from it is forgotten.
    listed = classics.load(path)
    classics.save(path, [replace(listed[0], year=1976)])
    classics.sync(conn, path)
    assert db.get_year(conn, "q1") == (1976, "classic")
    classics.save(path, [])
    classics.sync(conn, path)
    assert db.found_classics(conn) == []


def test_the_bundled_list_is_spread_over_the_decades_and_looked_up():
    listed = classics.load(classics.DEFAULT_FILE)
    decades = {e.year // 10 * 10 for e in listed}
    assert len(listed) >= 300 and decades == set(range(1950, 2030, 10))
    assert all(e.looked_up for e in listed), "run python -m jamster.classics"
