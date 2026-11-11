"""Spotify login, token refresh, Web API requests and playback control."""

import asyncio
import sqlite3
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import httpx

from . import db
from .config import Settings

AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
API_URL = "https://api.spotify.com/v1"

SCOPES = " ".join(
    [
        "user-library-read",
        "playlist-read-private",
        "playlist-read-collaborative",
        "user-top-read",
        "user-read-recently-played",
        "user-read-playback-state",
        "user-modify-playback-state",
    ]
)


class SpotifyError(Exception):
    def __init__(self, status: int, message: str, reason: str = "") -> None:
        super().__init__(f"Spotify {status} {reason}: {message}")
        self.status = status
        self.message = message
        self.reason = reason

    @property
    def friendly(self) -> str:
        """A sentence fit to show a player."""
        if self.reason == "NO_ACTIVE_DEVICE" or self.status == 404:
            return "No Spotify device found. Open Spotify on a device and choose it here."
        if self.reason == "PREMIUM_REQUIRED":
            return "Spotify Premium is required to control playback."
        if self.status == 429:
            return "Spotify's request limit is used up. Try again in a little while."
        if self.status == 403:
            return f"Spotify refused: {self.message}"
        return f"Spotify error: {self.message}"


class ReauthRequired(SpotifyError):
    def __init__(self) -> None:
        super().__init__(401, "the Spotify login has expired, sign in again", "REAUTH_REQUIRED")

    @property
    def friendly(self) -> str:
        return "The Spotify login has expired. Sign in with Spotify again."


@dataclass(frozen=True, slots=True)
class Device:
    id: str
    name: str
    type: str
    is_active: bool


def _error(resp: httpx.Response) -> SpotifyError:
    message, reason = resp.text[:200], ""
    try:
        body = resp.json()
    except ValueError:
        body = None
    if isinstance(body, dict):
        err = body.get("error")
        if isinstance(err, dict):  # Web API: {"error": {"status", "message", "reason"}}
            message, reason = str(err.get("message", message)), str(err.get("reason", ""))
        elif isinstance(err, str):  # token endpoint: {"error", "error_description"}
            message, reason = str(body.get("error_description", err)), err
    return SpotifyError(resp.status_code, message, reason)


class Spotify:
    def __init__(self, settings: Settings, conn: sqlite3.Connection, http: httpx.AsyncClient):
        self._client_id = settings.spotify_client_id
        self._client_secret = settings.spotify_client_secret
        self._conn = conn
        self._http = http
        self._tokens: dict[str, tuple[str, float]] = {}  # player id -> (access token, expiry)
        self._refreshing: dict[str, asyncio.Lock] = {}

    # --- login ---------------------------------------------------------------------------

    def authorize_url(self, redirect_uri: str, state: str) -> str:
        query = urlencode(
            {
                "client_id": self._client_id,
                "response_type": "code",
                "redirect_uri": redirect_uri,
                "state": state,
                "scope": SCOPES,
            }
        )
        return f"{AUTHORIZE_URL}?{query}"

    async def login(self, code: str, redirect_uri: str) -> tuple[str, str]:
        """Finish the login: store the player and their refresh token, return (id, name)."""
        tokens = await self._token_request(
            {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri}
        )
        resp = await self._send(
            "GET", f"{API_URL}/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        if resp.is_error:
            raise _error(resp)  # 403 here means the account is not on the app's allowlist
        me = resp.json()
        player_id, name = me["id"], me.get("display_name") or me["id"]
        db.upsert_player(self._conn, player_id, name, tokens["refresh_token"])
        self._remember(player_id, tokens)
        return player_id, name

    def forget(self, player_id: str) -> None:
        self._tokens.pop(player_id, None)

    # --- tokens --------------------------------------------------------------------------

    async def _send(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        try:
            return await self._http.request(method, url, **kwargs)
        except httpx.TransportError as exc:
            raise SpotifyError(503, "could not reach Spotify", "NETWORK") from exc

    async def _token_request(self, data: dict[str, str]) -> dict[str, Any]:
        resp = await self._send(
            "POST", TOKEN_URL, data=data, auth=(self._client_id, self._client_secret)
        )
        if resp.is_error:
            raise _error(resp)
        return resp.json()

    def _remember(self, player_id: str, tokens: dict[str, Any]) -> str:
        expiry = time.monotonic() + float(tokens.get("expires_in", 3600))
        self._tokens[player_id] = (tokens["access_token"], expiry)
        return tokens["access_token"]

    async def _access_token(self, player_id: str) -> str:
        def cached() -> str | None:
            entry = self._tokens.get(player_id)
            return entry[0] if entry and entry[1] > time.monotonic() + 60 else None

        if token := cached():
            return token
        async with self._refreshing.setdefault(player_id, asyncio.Lock()):
            if token := cached():  # someone else refreshed while we waited
                return token
            player = db.get_player(self._conn, player_id)
            if player is None or player.refresh_token is None:
                raise ReauthRequired()
            try:
                tokens = await self._token_request(
                    {"grant_type": "refresh_token", "refresh_token": player.refresh_token}
                )
            except SpotifyError as exc:
                if exc.reason == "invalid_grant":
                    db.set_refresh_token(self._conn, player_id, None)
                    raise ReauthRequired() from exc
                raise
            # Spotify only sometimes rotates the refresh token; keep the old one otherwise.
            if tokens.get("refresh_token"):
                db.set_refresh_token(self._conn, player_id, tokens["refresh_token"])
            return self._remember(player_id, tokens)

    # --- Web API -------------------------------------------------------------------------

    async def request(
        self,
        player_id: str,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: Any = None,
        patience: float = 0.0,
    ) -> Any:
        """Call the Web API as a player. Sleeps at most `patience` seconds on 429 and 5xx."""
        waited, reauthed = 0.0, False
        while True:
            token = await self._access_token(player_id)
            resp = await self._send(
                method,
                f"{API_URL}{path}",
                params=params,
                json=json,
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 401 and not reauthed:
                self._tokens.pop(player_id, None)
                reauthed = True
                continue
            if resp.status_code == 429 or resp.status_code >= 500:
                try:
                    delay = max(1.0, float(resp.headers.get("Retry-After", "2")))
                except ValueError:
                    delay = 2.0
                if waited + delay <= patience:
                    await asyncio.sleep(delay)
                    waited += delay
                    continue
            if resp.is_error:
                raise _error(resp)
            try:
                return resp.json() if resp.content else None
            except ValueError:  # the player endpoints sometimes answer with a non-JSON body
                return None

    async def pages(
        self,
        player_id: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        patience: float = 0.0,
    ) -> AsyncIterator[dict[str, Any]]:
        """Yield each page of an offset-paged listing, 50 items at a time."""
        offset = 0
        while True:
            page = await self.request(
                player_id,
                "GET",
                path,
                params={**(params or {}), "limit": 50, "offset": offset},
                patience=patience,
            )
            yield page
            if not page.get("next") or not page.get("items"):
                return
            offset += 50

    # --- playback ------------------------------------------------------------------------

    async def devices(self, player_id: str) -> list[Device]:
        body = await self.request(player_id, "GET", "/me/player/devices", patience=3)
        return [
            Device(d["id"], d.get("name") or "Unnamed device", d.get("type", ""), d["is_active"])
            for d in body.get("devices", [])
            if d.get("id") and not d.get("is_restricted")
        ]

    async def play(
        self, player_id: str, uri: str, device_id: str | None, position_ms: int = 0
    ) -> None:
        """Start a track. Without a device id Spotify uses the account's active device."""
        await self.request(
            player_id,
            "PUT",
            "/me/player/play",
            params={"device_id": device_id} if device_id else None,
            json={"uris": [uri], "position_ms": position_ms},
            patience=3,
        )

    async def pause(self, player_id: str, device_id: str | None) -> None:
        await self.request(
            player_id,
            "PUT",
            "/me/player/pause",
            params={"device_id": device_id} if device_id else None,
        )
