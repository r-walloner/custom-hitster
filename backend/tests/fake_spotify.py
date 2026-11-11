"""An in-process stand-in for accounts.spotify.com, api.spotify.com and musicbrainz.org.

Use as an httpx.MockTransport handler. Login codes and tokens are just user names.
Track n is from the year 1960 + n, so every track has its own year.
"""

import asyncio
import json
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import parse_qsl

import httpx


@dataclass(frozen=True)
class Play:
    user: str
    uri: str
    device_id: str | None
    position_ms: int


def track(n: int) -> dict[str, Any]:
    return {
        "type": "track",
        "id": f"track{n}",
        "uri": f"spotify:track:track{n}",
        "name": f"Song {n}",
        "is_local": False,
        "artists": [{"id": f"artist{n % 5}", "name": f"Artist {n % 5}"}],
        "album": {
            "name": f"Album {n}",
            "release_date": f"{1960 + n}-01-01",
            "images": [{"url": f"https://img.test/{n}/640"}, {"url": f"https://img.test/{n}/300"}],
        },
        "external_ids": {"isrc": f"ISRC{n:08d}"},
    }


def year_of(uri: str) -> int:
    return 1960 + int(uri.removeprefix("spotify:track:track"))


SAVED = {"alice": range(0, 60), "bob": range(30, 80)}
# Alice owns one playlist and follows one she must not be able to read.
PLAYLISTS = {
    "alice": [
        {"id": "pl-alice", "owner": {"id": "alice"}, "collaborative": False},
        {"id": "pl-followed", "owner": {"id": "someone"}, "collaborative": False},
    ],
    "bob": [],
}
PLAYLIST_ITEMS: dict[str, list[dict[str, Any]]] = {
    "pl-alice": [
        *({"item": track(n), "is_local": False} for n in range(60, 65)),
        {"item": {"type": "episode", "id": "ep1"}, "is_local": False},
        {"item": {"type": "track", "id": None, "is_local": True}, "is_local": True},
        {"item": None, "is_local": False},
    ]
}
ALLOWLIST = {"alice", "bob"}


class FakeSpotify:
    def __init__(self) -> None:
        self.plays: list[Play] = []
        self.pauses: list[str] = []
        self.playlist_reads: list[str] = []
        self.play_errors: dict[str, tuple[int, str]] = {}  # user -> (status, reason)
        self.lookups: list[str] = []  # ISRCs asked of MusicBrainz, including unanswered ones
        # How many more MusicBrainz lookups get an answer; the others wait. None: no limit.
        # A plain int, so the test thread can raise it while the app's event loop polls it.
        self.lookup_allowance: int | None = None

    async def __call__(self, request: httpx.Request) -> httpx.Response:
        host, path = request.url.host, request.url.path
        if host == "accounts.spotify.com":
            return self._token(request)
        if host == "musicbrainz.org":
            self.lookups.append(path.rsplit("/", 1)[1])
            return await self._musicbrainz_when_allowed(path)
        if host == "api.spotify.com":
            user = request.headers["authorization"].removeprefix("Bearer at-")
            return self._api(request, user, path.removeprefix("/v1"))
        return httpx.Response(599, text=f"unexpected request to {request.url}")

    def _token(self, request: httpx.Request) -> httpx.Response:
        form = dict(parse_qsl(request.content.decode()))
        if form["grant_type"] == "authorization_code":
            user = form["code"]
        else:
            user = form["refresh_token"].removeprefix("rt-")
        return httpx.Response(
            200,
            json={"access_token": f"at-{user}", "refresh_token": f"rt-{user}", "expires_in": 3600},
        )

    async def _musicbrainz_when_allowed(self, path: str) -> httpx.Response:
        while self.lookup_allowance is not None and self.lookup_allowance <= 0:
            await asyncio.sleep(0.005)
        if self.lookup_allowance is not None:
            self.lookup_allowance -= 1
        return self._musicbrainz(path)

    def _musicbrainz(self, path: str) -> httpx.Response:
        n = int(path.rsplit("ISRC", 1)[1])
        if n % 2:  # odd tracks are unknown to MusicBrainz
            return httpx.Response(404, json={"error": "Not Found"})
        return httpx.Response(
            200, json={"recordings": [{"first-release-date": f"{1960 + n}-05-01"}]}
        )

    def _api(self, request: httpx.Request, user: str, path: str) -> httpx.Response:
        params = request.url.params
        if user not in ALLOWLIST:
            return _error(403, "User not registered in the Developer Dashboard")
        if path == "/me":
            return httpx.Response(200, json={"id": user, "display_name": user.title()})
        if path == "/me/tracks":
            return _page([{"track": track(n)} for n in SAVED[user]], params)
        if path == "/me/playlists":
            return _page(PLAYLISTS[user], params)
        if match := re.fullmatch(r"/playlists/([\w-]+)/items", path):
            self.playlist_reads.append(match[1])
            if match[1] not in PLAYLIST_ITEMS:
                return _error(403, "Forbidden")
            return _page(PLAYLIST_ITEMS[match[1]], params)
        if path == "/me/top/tracks":
            return httpx.Response(200, json={"items": [track(n) for n in list(SAVED[user])[:5]]})
        if path == "/me/top/artists":
            artists = [{"id": f"artist{n}", "name": f"Artist {n}"} for n in range(3)]
            return httpx.Response(200, json={"items": artists})
        if path == "/me/player/recently-played":
            recent = [{"track": track(n)} for n in list(SAVED[user])[:3]]
            return httpx.Response(200, json={"items": recent})
        if path == "/me/player/devices":
            device = {
                "id": f"dev-{user}",
                "name": f"{user.title()}'s phone",
                "type": "Smartphone",
                "is_active": True,
                "is_restricted": False,
            }
            return httpx.Response(200, json={"devices": [device]})
        if path == "/me/player/play":
            if user in self.play_errors:
                status, reason = self.play_errors[user]
                return _error(status, "Player command failed", reason)
            body = json.loads(request.content)
            self.plays.append(
                Play(user, body["uris"][0], params.get("device_id"), body["position_ms"])
            )
            return httpx.Response(204)
        if path == "/me/player/pause":
            self.pauses.append(user)
            return httpx.Response(204)
        return _error(404, f"the fake has no {path}")


def _page(items: list[Any], params: httpx.QueryParams) -> httpx.Response:
    limit, offset = int(params["limit"]), int(params["offset"])
    more = offset + limit < len(items)
    return httpx.Response(
        200,
        json={
            "items": items[offset : offset + limit],
            "total": len(items),
            "next": "https://api.spotify.com/next" if more else None,
        },
    )


def _error(status: int, message: str, reason: str = "") -> httpx.Response:
    error: dict[str, Any] = {"status": status, "message": message}
    if reason:
        error["reason"] = reason
    return httpx.Response(status, json={"error": error})
