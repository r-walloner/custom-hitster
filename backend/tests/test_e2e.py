"""Whole games through the real app, with only the outside world (Spotify, MusicBrainz) faked."""

import logging
import random
import time
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from fake_spotify import FakeSpotify, year_of
from fastapi.testclient import TestClient
from offline_settings import OfflineSettings
from starlette.testclient import WebSocketTestSession
from starlette.websockets import WebSocketDisconnect

from jamster import rooms
from jamster.web import NO_SUCH_ROOM, create_app

State = dict[str, Any]


class Browser:
    """One person's browser: its own cookies on the shared TestClient.

    All browsers share one client so that the whole app runs on one event loop.
    """

    def __init__(self, client: TestClient) -> None:
        self._client = client
        self._cookies: dict[str, str] = {}

    def _headers(self) -> dict[str, str]:
        return {"cookie": "; ".join(f"{k}={v}" for k, v in self._cookies.items())}

    def request(self, method: str, url: str):
        self._client.cookies.clear()
        response = self._client.request(
            method, url, headers=self._headers(), follow_redirects=False
        )
        self._cookies.update(response.cookies)
        self._client.cookies.clear()
        return response

    def get(self, url: str):
        return self.request("GET", url)

    def login(self, user: str):
        location = self.get("/auth/login").headers["location"]
        state = parse_qs(urlsplit(location).query)["state"][0]
        return self.get(f"/auth/callback?code={user}&state={state}")

    def library(self) -> dict[str, Any]:
        """The player's library status, once the background import has finished."""
        for _ in range(500):
            library = self.get("/api/me").json()["spotify"]["library"]
            if library["status"] in ("done", "error"):
                return library
            time.sleep(0.01)
        raise AssertionError("the import did not finish")

    def socket(self, code: str, **headers: str) -> WebSocketTestSession:
        self._client.cookies.clear()
        return self._client.websocket_connect(
            f"/ws/rooms/{code}", headers={**self._headers(), **headers}
        )


def until(ws: WebSocketTestSession, wanted: Callable[[State], bool]) -> State:
    """The next message matching `wanted`; every state is a full snapshot, so skipping is fine."""
    for _ in range(1000):
        message = ws.receive_json()
        if wanted(message):
            return message
    raise AssertionError("the expected message never arrived")


def state_where(wanted: Callable[[State], bool]) -> Callable[[State], bool]:
    return lambda message: message["type"] == "state" and wanted(message["room"])


def is_type(kind: str) -> Callable[[State], bool]:
    return lambda message: message["type"] == kind


def settings(**changes: Any) -> State:
    base = {
        "mode": "local",
        "cards_to_win": 10,
        "starting_tokens": 2,
        "deck_size": 20,
        "strategy": "majority",
    }
    return {"type": "set_settings", "settings": {**base, **changes}}


def right_slot(game: State, player_id: str, year: int) -> int:
    timeline = next(p for p in game["players"] if p["id"] == player_id)["timeline"]
    return sum(card["year"] <= year for card in timeline)


@pytest.fixture
def fake() -> FakeSpotify:
    return FakeSpotify()


@pytest.fixture
def client(fake: FakeSpotify, tmp_path: Path) -> Iterator[TestClient]:
    config = OfflineSettings(
        spotify_client_id="client-id",
        spotify_client_secret="client-secret",
        session_secret="test-secret",
        data_dir=tmp_path,
    )
    app = create_app(
        config, transport=httpx.MockTransport(fake), year_interval=0, rng=random.Random(1)
    )
    with TestClient(app) as client:
        yield client


def test_login_imports_the_library(client: TestClient, fake: FakeSpotify):
    alice = Browser(client)
    assert alice.get("/api/me").json() == {"spotify": None}
    assert alice.request("POST", "/api/rooms").status_code == 401

    response = alice.login("alice")
    assert (response.status_code, response.headers["location"]) == (307, "/")
    # 60 saved tracks (two pages) plus 5 from her own playlist; episodes and local files dropped.
    assert alice.library() == {"status": "done", "detail": "", "tracks": 65}
    assert fake.playlist_reads == ["pl-alice"]  # the playlist she only follows is not requested

    assert alice.request("DELETE", "/api/me").status_code == 204
    assert alice.get("/api/me").json() == {"spotify": None}


def test_accounts_off_the_allowlist_are_turned_away(client: TestClient):
    response = Browser(client).login("mallory")
    assert response.headers["location"] == "/?error=not_allowed"


def test_login_state_must_match(client: TestClient):
    browser = Browser(client)
    browser.get("/auth/login")
    assert browser.get("/auth/callback?code=alice&state=forged").status_code == 400


def test_socket_rejects_other_sites_and_unknown_rooms(client: TestClient):
    alice = Browser(client)
    alice.login("alice")
    code = alice.request("POST", "/api/rooms").json()["code"]

    with pytest.raises(WebSocketDisconnect):
        with alice.socket(code, origin="https://evil.example"):
            pass
    with alice.socket("NOROOM") as ws:
        with pytest.raises(WebSocketDisconnect) as closed:
            ws.receive_json()
    assert closed.value.code == NO_SUCH_ROOM


def test_remote_game_with_a_hot_seat_player(
    client: TestClient, fake: FakeSpotify, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(rooms, "TEST_PLAYBACK_SECONDS", 0)
    alice, bob = Browser(client), Browser(client)
    alice.login("alice")
    bob.login("bob")
    assert alice.library()["status"] == bob.library()["status"] == "done"
    code = alice.request("POST", "/api/rooms").json()["code"]

    with alice.socket(code) as a, bob.socket(code) as b:
        # --- lobby ---
        first = until(b, is_type("state"))
        assert first["you"] == {"player_id": None, "is_host": False, "spotify": True}
        b.send_json({"type": "join", "name": "Bob"})
        until(a, state_where(lambda r: len(r["players"]) == 2))
        a.send_json({"type": "add_player", "name": "Carol"})
        a.send_json(settings(mode="remote", cards_to_win=5))
        room = until(a, state_where(lambda r: r["settings"]["mode"] == "remote"))["room"]
        assert [(p["name"], p["spotify"], p["connected"]) for p in room["players"]] == [
            ("Alice", True, True),
            ("Bob", True, True),
            ("Carol", False, False),
        ]

        b.send_json(settings(cards_to_win=7))
        assert until(b, is_type("error"))["message"] == "Only the host can do that"

        b.send_json({"type": "get_devices"})
        devices = until(b, is_type("devices"))["devices"]
        assert devices == [
            {"id": "dev-bob", "name": "Bob's phone", "kind": "Smartphone", "is_active": True}
        ]
        b.send_json({"type": "set_device", "device_id": "dev-bob", "name": "Bob's phone"})
        b.send_json({"type": "test_playback"})
        assert until(b, is_type("playback_test"))["ok"] is True
        for _ in range(200):
            if fake.pauses:
                break
            time.sleep(0.01)
        assert fake.pauses == ["bob"] and fake.plays.pop().device_id == "dev-bob"

        # --- turn 1: a correct placement, everyone else passes ---
        a.send_json({"type": "start_game"})
        room = until(a, state_where(lambda r: r["playback"]["status"] == "playing"))["room"]
        game = room["game"]
        assert game["card"] is None, "the card in play must stay hidden"
        assert game["deck_remaining"] == 20 - 4, "three starting cards and one in play"
        assert room["deck"]["status"] == "none"
        assert all(len(p["timeline"]) == 1 and p["tokens"] == 2 for p in game["players"])
        # Remote mode: the same track starts on both Spotify accounts, Bob's on his device.
        assert {(p.user, p.device_id) for p in fake.plays} == {("alice", None), ("bob", "dev-bob")}
        assert len({p.uri for p in fake.plays}) == 1
        year = year_of(fake.plays[0].uri)
        assert 1990 <= year <= 2024, "both players know tracks 30 to 64"

        active = game["active"]
        others = [p["id"] for p in game["players"] if p["id"] != active]
        a.send_json({"type": "place", "slot": right_slot(game, active, year), "as_player": active})
        a.send_json({"type": "lock", "as_player": active})
        for other in others:
            a.send_json({"type": "pass", "as_player": other})
        game = until(a, state_where(lambda r: r["game"]["phase"] == "revealed"))["room"]["game"]
        assert game["outcome"] == {"correct": True, "card_to": active}
        assert game["card"]["year"] == year
        assert game["card"]["year_source"] == ("musicbrainz" if year % 2 == 0 else "spotify")
        assert game["card"]["known_by"] == ["Alice", "Bob"]

        # --- turn 2: a wrong placement, stolen by a challenger ---
        a.send_json({"type": "set_named", "value": True})
        a.send_json({"type": "next_turn"})
        room = until(
            a,
            state_where(
                lambda r: r["game"]["turn_number"] == 2 and r["playback"]["status"] == "playing"
            ),
        )["room"]
        game = room["game"]
        tokens = {p["id"]: p["tokens"] for p in game["players"]}
        assert tokens[active] == 3 and len(fake.plays) == 4
        year = year_of(fake.plays[-1].uri)

        active = game["active"]
        thief = next(p["id"] for p in game["players"] if p["id"] != active)
        right = right_slot(game, active, year)
        a.send_json({"type": "place", "slot": 1 - right, "as_player": active})  # the other slot
        a.send_json({"type": "lock", "as_player": active})
        a.send_json({"type": "buzz", "as_player": thief})
        a.send_json({"type": "pick_slot", "slot": right, "as_player": thief})
        game = until(a, state_where(lambda r: r["game"]["phase"] == "revealed"))["room"]["game"]
        assert game["outcome"] == {"correct": False, "card_to": thief}
        cards = {p["id"]: len(p["timeline"]) for p in game["players"]}
        assert cards[thief] >= 2 and cards[active] <= 2

        # --- permissions and the end of the game ---
        bob_seat = next(p["id"] for p in room["players"] if p["name"] == "Bob")
        stranger = next(p["id"] for p in game["players"] if p["id"] not in (bob_seat, active))
        if game["active"] != bob_seat:
            b.send_json({"type": "next_turn"})
            error = until(b, is_type("error"))["message"]
            assert error == "Only the host or the active player can do that"
        b.send_json({"type": "buy", "as_player": stranger})
        assert until(b, is_type("error"))["message"] == "Only the host can do that"

        a.send_json({"type": "end_game"})
        room = until(a, state_where(lambda r: r["game"] is None))["room"]
        assert room["deck"]["status"] == "none" and room["playback"]["status"] == "idle"


def test_local_game_plays_only_on_the_host_and_recovers_from_a_playback_failure(
    client: TestClient, fake: FakeSpotify, caplog: pytest.LogCaptureFixture
):
    caplog.set_level(logging.INFO, logger="jamster")
    alice, bob = Browser(client), Browser(client)
    alice.login("alice")
    bob.login("bob")
    assert alice.library()["status"] == bob.library()["status"] == "done"
    code = alice.request("POST", "/api/rooms").json()["code"]
    fake.play_errors["alice"] = (404, "NO_ACTIVE_DEVICE")

    with alice.socket(code) as a, bob.socket(code) as b:
        b.send_json({"type": "join", "name": "Bob"})
        until(a, state_where(lambda r: len(r["players"]) == 2))
        a.send_json(settings(deck_size=10))
        a.send_json({"type": "start_game"})
        room = until(a, state_where(lambda r: r["playback"]["status"] == "failed"))["room"]
        host = next(p["id"] for p in room["players"] if p["is_host"])
        assert room["playback"]["failures"] == [
            {
                "player_id": host,
                "message": "No Spotify device found. Open Spotify on a device and choose it here.",
            }
        ]
        assert room["game"]["phase"] == "placing", "the game goes on while playback is fixed"
        failure = next(r for r in caplog.records if r.levelno == logging.WARNING)
        assert failure.getMessage().startswith(f"[{code}] playing spotify:track:")
        assert "NO_ACTIVE_DEVICE" in failure.getMessage()
        messages = [r.getMessage() for r in caplog.records]
        assert any(m.startswith(f"[{code}] game started in local mode") for m in messages)
        assert any(m.startswith(f"[{code}] turn 1, ") and 'playing "Song' in m for m in messages)

        del fake.play_errors["alice"]
        b.send_json({"type": "retry_playback"})
        room = until(a, state_where(lambda r: r["playback"]["status"] == "playing"))["room"]
        assert room["playback"]["failures"] == []
        assert [p.user for p in fake.plays] == ["alice"]  # local mode: Bob's account stays silent

    # A player who reconnects gets their seat back.
    with bob.socket(code) as b:
        assert until(b, is_type("state"))["you"]["player_id"] is not None


def test_years_are_looked_up_only_when_a_card_is_drawn(client: TestClient, fake: FakeSpotify):
    alice = Browser(client)
    alice.login("alice")
    assert alice.library()["status"] == "done"
    code = alice.request("POST", "/api/rooms").json()["code"]
    fake.lookup_allowance = 2  # just the opening deal: Alice's starting card and the first song

    with alice.socket(code) as a:
        a.send_json(settings(deck_size=10))
        a.send_json({"type": "start_game"})
        dealing = until(a, state_where(lambda r: r["deck"]["status"] == "dealing"))["room"]
        assert dealing["deck"]["total"] == 2
        game = until(a, state_where(lambda r: r["game"] is not None))["room"]["game"]
        assert game["deck_remaining"] == 8, "the undrawn cards still count"

        # Alone in the game, locking in reveals at once.
        year = year_of(fake.plays[-1].uri)
        me = game["active"]
        a.send_json({"type": "place", "slot": right_slot(game, me, year)})
        a.send_json({"type": "lock"})
        until(a, state_where(lambda r: r["game"]["phase"] == "revealed"))
        assert len(fake.lookups) == 2, "nothing is looked up in the background"

        # The next song's year is looked up now; the turn waits for it instead of ending the game.
        # A second tab is a second connection, which the server serves while the first waits.
        with alice.socket(code) as tab:
            a.send_json({"type": "next_turn"})
            loading = until(tab, state_where(lambda r: r["game"]["drawing"]))["room"]["game"]
            assert loading["turn_number"] == 1, "every device sees the next song loading"
            tab.send_json({"type": "next_turn"})  # clicked again elsewhere while it loads
            assert until(tab, is_type("error"))["message"] == "The next song is still loading"
            assert len(fake.lookups) == 3, "the second click looks nothing up"
            fake.lookup_allowance = None
        game = until(
            a,
            state_where(
                lambda r: r["game"]["turn_number"] == 2 and r["playback"]["status"] == "playing"
            ),
        )["room"]["game"]
        assert (game["phase"], game["deck_remaining"], game["drawing"]) == ("placing", 7, False)
        assert fake.lookups[-1] == f"ISRC{int(fake.plays[-1].uri.rsplit('track', 1)[1]):08d}"
        time.sleep(0.1)
        assert len(fake.lookups) == 3, "still only the cards that were drawn"
