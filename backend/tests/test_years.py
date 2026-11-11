import asyncio

import httpx
import pytest

from jamster import db
from jamster.models import Track
from jamster.years import YearResolver, pick_year, year_of


@pytest.mark.parametrize(
    ("date", "year"),
    [("1975", 1975), ("1975-10", 1975), ("1975-10-31", 1975), (None, None), ("", None)],
)
def test_year_of(date: str | None, year: int | None):
    assert year_of(date) == year


@pytest.mark.parametrize(
    ("musicbrainz", "spotify", "expected"),
    [
        ([1975], 2011, (1975, "musicbrainz")),  # the remaster case
        ([2011, 1975], 2011, (1975, "musicbrainz")),  # several recordings under one ISRC
        ([2011], 1975, (1975, "spotify")),  # MusicBrainz only knows the remaster
        ([1975], 1975, (1975, "musicbrainz")),
        ([], 1999, (1999, "spotify")),
        ([1975], None, (1975, "musicbrainz")),
        ([1000], 1999, (1999, "spotify")),  # placeholder dates are ignored
        ([2999], None, None),
        ([], None, None),
    ],
)
def test_pick_year(musicbrainz: list[int], spotify: int | None, expected: tuple[int, str] | None):
    assert pick_year(musicbrainz, spotify, today=2026) == expected


def track(isrc: str | None = "GBUM71029604") -> Track:
    return Track(
        "t1", "spotify:track:t1", "Song", (), "Album (Remastered 2011)", None, "2011", isrc
    )


def resolve(responses: list[httpx.Response], isrc: str | None = "GBUM71029604", calls: int = 1):
    """Resolve the same track `calls` times; returns the results and the requests made."""
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return responses[min(len(requests), len(responses)) - 1]

    async def run():
        conn = db.connect(":memory:")
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
            resolver = YearResolver(conn, http, "tests", min_interval=0)
            return [await resolver.resolve(track(isrc)) for _ in range(calls)]

    return asyncio.run(run()), requests


def test_musicbrainz_year_is_used_and_cached():
    found = httpx.Response(200, json={"recordings": [{"first-release-date": "1975-10-31"}]})
    results, requests = resolve([found], calls=2)
    assert results == [(1975, "musicbrainz")] * 2
    assert len(requests) == 1
    assert requests[0].url.path == "/ws/2/isrc/GBUM71029604"
    assert requests[0].headers["user-agent"].startswith("Jamster/")


def test_unknown_isrc_falls_back_to_spotify_and_is_cached():
    results, requests = resolve([httpx.Response(404)], calls=2)
    assert results == [(2011, "spotify")] * 2 and len(requests) == 1


def test_failed_lookup_falls_back_but_is_retried_next_time():
    found = httpx.Response(200, json={"recordings": [{"first-release-date": "1975"}]})
    results, requests = resolve([httpx.Response(503), httpx.Response(503), found], calls=2)
    assert results == [(2011, "spotify"), (1975, "musicbrainz")]
    assert len(requests) == 3  # two attempts, then the successful retry


def test_no_isrc_means_no_lookup():
    results, requests = resolve([httpx.Response(500)], isrc=None)
    assert results == [(2011, "spotify")] and requests == []
