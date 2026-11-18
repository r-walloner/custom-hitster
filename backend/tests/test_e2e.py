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
from fake_spotify import FakeSpotify, duration_of, year_of
from fastapi.testclient import TestClient
from offline_settings import OfflineSettings
from starlette.testclient import WebSocketTestSession
from starlette.websockets import WebSocketDisconnect

from jamster import rooms
from jamster.rooms import LEFT_ROOM, ROOM_CLOSED
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

    def request(self, method: str, url: str, json: Any = None):
        self._client.cookies.clear()
        response = self._client.request(
            method, url, headers=self._headers(), json=json, follow_redirects=False
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

    def sources(self) -> list[dict[str, Any]]:
        return self.get("/api/me/library").json()["sources"]

    def pick(self, **changes: bool) -> dict[str, Any]:
        """Pick or unpick sources once they are listed; the library status once they're copied."""
        self.library()
        assert self.request("PATCH", "/api/me/sources", json=changes).status_code == 204
        return self.library()

    def socket(self, code: str, **headers: str) -> WebSocketTestSession:
        self._client.cookies.clear()
        return self._client.websocket_connect(
            f"/ws/rooms/{code}", headers={**self._headers(), **headers}
        )


def eventually(condition: Callable[[], bool]) -> None:
    for _ in range(500):
        if condition():
            return
        time.sleep(0.01)
    raise AssertionError("it never happened")


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


@pytest.fixture(autouse=True)
def instant_dealing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rooms, "DEAL_SECONDS", 0)
    monkeypatch.setattr(rooms, "DEALT_SECONDS", 0)


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


def test_login_lists_the_library_and_copies_only_what_is_picked(
    client: TestClient, fake: FakeSpotify
):
    alice = Browser(client)
    assert alice.get("/api/me").json() == {"spotify": None}
    assert alice.request("POST", "/api/rooms").status_code == 401
    assert alice.get("/api/me/library").status_code == 401

    response = alice.login("alice")
    assert (response.status_code, response.headers["location"]) == (307, "/")
    # Her own songs are picked at first: 60 liked songs, which hold her top and recent ones.
    assert alice.library() == {"status": "done", "detail": "", "tracks": 60}
    library = alice.get("/api/me/library").json()
    assert library["refreshed_at"] is not None
    assert [
        (s["id"], s["name"], s["songs"], s["picked"], s["copied"]) for s in library["sources"]
    ] == [
        ("recent", "Recently played", 3, True, True),
        ("top", "Your top songs", 5, True, True),
        ("liked", "Liked songs", 60, True, True),
        # Her own playlists in Spotify's order, not the one she only follows.
        ("playlist:pl-alice", "Road trip", 8, False, False),
        ("playlist:pl-zumba", "Zumba", 0, False, False),
        ("playlist:pl-aardvark", "aardvark tunes", 0, False, False),
    ]
    # Listing asked for a single liked song; copying them took two pages. No playlist was read.
    assert [r for r in fake.requests if r.startswith("/me/tracks")] == [
        "/me/tracks?limit=1&offset=0",
        "/me/tracks?limit=50&offset=0",
        "/me/tracks?limit=50&offset=50",
    ]
    assert fake.playlist_reads == []

    # Plus 5 from her playlist; episodes and local files dropped.
    assert alice.pick(**{"playlist:pl-alice": True}) == {
        "status": "done",
        "detail": "",
        "tracks": 65,
    }
    assert fake.playlist_reads == ["pl-alice"]
    assert [s["copied"] for s in alice.sources()] == [True, True, True, True, False, False]

    assert alice.request("DELETE", "/api/me").status_code == 204
    assert alice.get("/api/me").json() == {"spotify": None}


def test_unpicked_sources_leave_the_deck_and_come_back_for_free(
    client: TestClient, fake: FakeSpotify
):
    alice = Browser(client)
    alice.login("alice")
    assert alice.pick(liked=True)["tracks"] == 60
    asked = len(fake.requests)
    assert alice.pick(liked=False, top=False, recent=False)["tracks"] == 0
    code = alice.request("POST", "/api/rooms").json()["code"]
    with alice.socket(code) as a:
        a.send_json({"type": "start_game"})
        assert until(a, is_type("error"))["message"] == "No one has picked any songs yet"
    assert alice.pick(liked=True)["tracks"] == 60
    assert len(fake.requests) == asked  # still copied, so not asked for again


def test_unpicking_the_source_being_copied_stops_its_copy(client: TestClient, fake: FakeSpotify):
    alice = Browser(client)
    fake.held.add("/me/tracks?limit=50")  # copying liked songs hangs; listing them doesn't
    alice.login("alice")
    eventually(lambda: alice.sources()[2]["copying"])
    eventually(lambda: fake.requests[-1].startswith("/me/tracks?limit=50"))
    asked = len(fake.requests)
    # 60 liked songs take two requests; the screen draws its progress bar from this.
    assert alice.get("/api/me/library").json()["detail"] == "Copying Liked songs: 0 of 2 requests"
    alice.request("PATCH", "/api/me/sources", json={"playlist:pl-alice": True})

    alice.request("PATCH", "/api/me/sources", json={"liked": False})
    # Top songs, recent plays and the playlist queued behind it are copied next.
    assert alice.library() == {"status": "done", "detail": "", "tracks": 10}
    fake.held.clear()
    time.sleep(0.05)
    assert [r for r in fake.requests[asked:] if r.startswith("/me/tracks")] == []
    liked = alice.sources()[2]
    assert (liked["picked"], liked["copied"], liked["copying"]) == (False, False, False)


def test_importing_again_copies_only_what_changed(client: TestClient, fake: FakeSpotify):
    alice = Browser(client)
    alice.login("alice")
    alice.pick(**{"playlist:pl-alice": True})
    assert fake.playlist_reads == ["pl-alice"]
    liked_pages = len([r for r in fake.requests if r.startswith("/me/tracks?limit=50")])

    alice.request("POST", "/api/me/import")
    assert alice.library()["tracks"] == 65
    assert fake.playlist_reads == ["pl-alice"]  # same snapshot, nothing to copy
    # Same count and newest song: the liked songs aren't copied again either.
    assert len([r for r in fake.requests if r.startswith("/me/tracks?limit=50")]) == liked_pages

    fake.playlists["alice"][0]["snapshot_id"] = "snap-2"
    alice.request("POST", "/api/me/import")
    assert alice.library()["tracks"] == 65
    assert fake.playlist_reads == ["pl-alice", "pl-alice"]

    fake.playlists["alice"].pop(0)  # she deleted it: gone with its songs
    alice.request("POST", "/api/me/import")
    assert alice.library()["tracks"] == 60
    assert [s["id"] for s in alice.sources()] == [
        "recent",
        "top",
        "liked",
        "playlist:pl-zumba",
        "playlist:pl-aardvark",
    ]


def test_a_chosen_name_outlasts_signing_in_again(client: TestClient):
    alice = Browser(client)
    assert alice.request("PUT", "/api/me/name", json={"name": "Al"}).status_code == 401
    alice.login("alice")
    assert alice.request("PUT", "/api/me/name", json={"name": "  "}).status_code == 422
    assert alice.request("PUT", "/api/me/name", json={"name": "A" * 25}).status_code == 422
    assert alice.request("PUT", "/api/me/name", json={"name": " Ally "}).status_code == 204
    alice.request("POST", "/auth/logout")
    alice.login("alice")  # Spotify still calls her Alice
    assert alice.get("/api/me").json()["spotify"]["name"] == "Ally"
    code = alice.request("POST", "/api/rooms").json()["code"]
    with alice.socket(code) as a:
        assert until(a, is_type("state"))["room"]["players"][0]["name"] == "Ally"
        alice.request("PUT", "/api/me/name", json={"name": "Alice B"})
        until(a, state_where(lambda r: r["players"][0]["name"] == "Alice B"))


def test_players_rename_themselves_in_the_lobby(client: TestClient):
    alice, bob, carol = Browser(client), Browser(client), Browser(client)
    alice.login("alice")
    bob.login("bob")
    carol.get("/api/me")
    code = alice.request("POST", "/api/rooms").json()["code"]

    with alice.socket(code) as a, bob.socket(code) as b, carol.socket(code) as c:
        b.send_json({"type": "join", "name": "Bobby"})
        c.send_json({"type": "join", "name": "Carol"})
        a.send_json({"type": "add_player", "name": "Dvae"})
        room = until(a, state_where(lambda r: len(r["players"]) == 4))["room"]
        alice_id, bob_id, carol_id, dave_id = (p["id"] for p in room["players"])
        assert bob.get("/api/me").json()["spotify"]["name"] == "Bobby"  # joining saves it

        c.send_json({"type": "rename", "player_id": carol_id, "name": "Caro"})
        a.send_json({"type": "rename", "player_id": dave_id, "name": "Dave"})
        a.send_json({"type": "rename", "player_id": alice_id, "name": "Ali"})
        b.send_json({"type": "rename", "player_id": bob_id, "name": "Rob"})
        names = ["Ali", "Rob", "Caro", "Dave"]
        until(a, state_where(lambda r: [p["name"] for p in r["players"]] == names))
        assert alice.get("/api/me").json()["spotify"]["name"] == "Ali"
        assert bob.get("/api/me").json()["spotify"]["name"] == "Rob"

        c.send_json({"type": "rename", "player_id": bob_id, "name": "Nope"})
        assert until(c, is_type("error"))["message"] == "You can only rename yourself"
        a.send_json({"type": "rename", "player_id": carol_id, "name": "Nope"})
        assert until(a, is_type("error"))["message"] == "You can only rename yourself"

        a.send_json({"type": "start_game"})
        until(a, lambda m: m["type"] == "state" and m["room"]["game"] is not None)
        b.send_json({"type": "rename", "player_id": bob_id, "name": "Late"})
        assert (
            until(b, is_type("error"))["message"] == "That is only possible before the game starts"
        )


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
    assert alice.pick(liked=True)["status"] == bob.pick(liked=True)["status"] == "done"
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
        bob_seat = next(p["id"] for p in room["players"] if p["name"] == "Bob")

        def move(seat: str, message: State) -> None:
            """Bob plays on his own phone; the host plays for herself and for Carol."""
            if seat == bob_seat:
                b.send_json(message)
            else:
                a.send_json({**message, "as_player": seat})

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
        room = until(a, state_where(lambda r: r["playback"]["status"] == "starting"))["room"]
        assert room["playback"]["elapsed_ms"] is None, "the song starts once Spotify confirms"
        room = until(a, state_where(lambda r: r["playback"]["status"] == "playing"))["room"]
        assert room["playback"]["duration_ms"] == duration_of(
            int(fake.plays[0].uri.removeprefix("spotify:track:track"))
        )
        assert 0 <= room["playback"]["elapsed_ms"] < 1000
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
        move(active, {"type": "place", "slot": right_slot(game, active, year)})
        move(active, {"type": "lock"})
        b.send_json({"type": "reveal"})  # only the host may cut the challenge short
        assert until(b, is_type("error"))["message"] == "Only the host can do that"
        for other in others:
            move(other, {"type": "pass"})
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
        move(active, {"type": "place", "slot": 1 - right})  # the other slot
        move(active, {"type": "lock"})
        move(thief, {"type": "buzz"})
        # The only free slot is taken by this challenge, so the window closes at once.
        until(a, state_where(lambda r: r["game"]["phase"] == "picking"))
        move(thief, {"type": "pick_slot", "slot": right})
        marked = until(a, state_where(lambda r: r["game"]["challenges"][0]["slot"] == right))
        game = marked["room"]["game"]
        assert (game["phase"], game["card"], game["outcome"]) == ("picking", None, None)
        assert game["challenges"] == [{"player_id": thief, "slot": right, "locked": False}]
        move(thief, {"type": "lock_pick"})
        game = until(a, state_where(lambda r: r["game"]["phase"] == "revealed"))["room"]["game"]
        assert game["outcome"] == {"correct": False, "card_to": thief}
        cards = {p["id"]: len(p["timeline"]) for p in game["players"]}
        assert cards[thief] >= 2 and cards[active] <= 2

        # --- permissions and the end of the game ---
        stranger = next(p["id"] for p in game["players"] if p["id"] not in (bob_seat, active))
        if game["active"] != bob_seat:
            b.send_json({"type": "next_turn"})
            error = until(b, is_type("error"))["message"]
            assert error == "Only the host or the active player can do that"
        b.send_json({"type": "buy", "as_player": stranger})
        assert until(b, is_type("error"))["message"] == "Only the host can do that"
        a.send_json({"type": "buy", "as_player": bob_seat})
        error = until(a, is_type("error"))["message"]
        assert error == "The host can only play for local players"

        a.send_json({"type": "end_game"})
        room = until(a, state_where(lambda r: r["game"] is None))["room"]
        assert room["deck"]["status"] == "none" and room["playback"]["status"] == "idle"


def test_stopping_the_speaker_test_pauses_at_once(
    client: TestClient, fake: FakeSpotify, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(rooms, "TEST_PLAYBACK_SECONDS", 3600)
    alice = Browser(client)
    alice.login("alice")
    assert alice.pick(liked=True)["status"] == "done"
    code = alice.request("POST", "/api/rooms").json()["code"]

    with alice.socket(code) as a:
        until(a, is_type("state"))
        a.send_json({"type": "test_playback"})
        assert until(a, is_type("playback_test"))["ok"] is True
        a.send_json({"type": "stop_test"})
        for _ in range(200):
            if fake.pauses:
                break
            time.sleep(0.01)
        assert fake.pauses == ["alice"], "the music stops when the player taps Stop"


def test_local_game_plays_only_on_the_host_and_recovers_from_a_playback_failure(
    client: TestClient, fake: FakeSpotify, caplog: pytest.LogCaptureFixture
):
    caplog.set_level(logging.INFO, logger="jamster")
    alice, bob = Browser(client), Browser(client)
    alice.login("alice")
    bob.login("bob")
    assert alice.pick(liked=True)["status"] == bob.pick(liked=True)["status"] == "done"
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

        # Restarting plays the same song again from the start; only the referee may do it.
        if room["game"]["active"] != next(p["id"] for p in room["players"] if p["name"] == "Bob"):
            b.send_json({"type": "restart_playback"})
            message = until(b, is_type("error"))["message"]
            assert message == "Only the host or the active player can do that"
        a.send_json({"type": "restart_playback"})
        for _ in range(200):
            if len(fake.plays) == 2:
                break
            time.sleep(0.01)
        first, again = fake.plays
        assert (again.user, again.uri, again.position_ms) == ("alice", first.uri, 0)

    # A player who reconnects gets their seat back.
    with bob.socket(code) as b:
        assert until(b, is_type("state"))["you"]["player_id"] is not None


def test_years_are_looked_up_only_when_a_card_is_drawn(client: TestClient, fake: FakeSpotify):
    alice = Browser(client)
    alice.login("alice")
    assert alice.pick(liked=True)["status"] == "done"
    code = alice.request("POST", "/api/rooms").json()["code"]
    fake.lookup_allowance = 2  # just the opening deal: Alice's starting card and the first song

    with alice.socket(code) as a:
        a.send_json(settings(deck_size=10))
        a.send_json({"type": "start_game"})
        dealing = until(a, state_where(lambda r: r["deck"]["status"] == "dealing"))["room"]
        assert dealing["deck"]["total"] == 2
        all_dealt = until(a, state_where(lambda r: r["deck"]["done"] == 2))["room"]["deck"]
        assert len(all_dealt["dealt"]) == 1, "the first card in play stays hidden"
        game = until(a, state_where(lambda r: r["game"] is not None))["room"]["game"]
        assert all_dealt["order"] == [p["id"] for p in game["players"]]
        assert all_dealt["dealt"] == game["players"][0]["timeline"], "the dealt card is kept"
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


def test_the_challenge_window_closes_when_time_is_up(client: TestClient, fake: FakeSpotify):
    alice = Browser(client)
    alice.login("alice")
    assert alice.pick(liked=True)["status"] == "done"
    code = alice.request("POST", "/api/rooms").json()["code"]

    with alice.socket(code) as a:
        a.send_json({"type": "add_player", "name": "Carol"})  # played by the host
        a.send_json(settings(deck_size=10, challenge_seconds=1))
        a.send_json({"type": "start_game"})
        game = until(a, state_where(lambda r: r["game"] is not None))["room"]["game"]
        assert game["window_left_ms"] is None

        active = game["active"]
        a.send_json({"type": "place", "slot": 0, "as_player": active})
        a.send_json({"type": "lock", "as_player": active})
        game = until(a, state_where(lambda r: r["game"]["phase"] == "challenging"))["room"]["game"]
        assert 0 < game["window_left_ms"] <= 1000

        started = time.monotonic()
        game = until(a, state_where(lambda r: r["game"]["phase"] == "revealed"))["room"]["game"]
        assert time.monotonic() - started > 0.5, "nobody challenged, so it waits for the timer"
        assert game["challenges"] == [] and game["window_left_ms"] is None


def test_the_next_turn_starts_by_itself_unless_someone_keeps_listening(client: TestClient):
    alice = Browser(client)
    alice.login("alice")
    assert alice.pick(liked=True)["status"] == "done"
    code = alice.request("POST", "/api/rooms").json()["code"]

    with alice.socket(code) as a:
        a.send_json(settings(deck_size=10, next_turn_seconds=1))
        a.send_json({"type": "start_game"})
        until(a, state_where(lambda r: r["game"] is not None))

        def reveal() -> State:
            """Alone in the game, locking in reveals at once."""
            a.send_json({"type": "place", "slot": 0})
            a.send_json({"type": "lock"})
            return until(a, state_where(lambda r: r["game"]["phase"] == "revealed"))["room"]

        game = reveal()["game"]
        assert 0 < game["advance_left_ms"] <= 1000
        game = until(a, state_where(lambda r: r["game"]["turn_number"] == 2))["room"]["game"]
        assert (game["phase"], game["advance_left_ms"]) == ("placing", None)

        reveal()
        a.send_json({"type": "hold_turn"})
        held = until(a, state_where(lambda r: r["game"]["advance_left_ms"] is None))["room"]
        assert held["game"]["phase"] == "revealed"
        time.sleep(1.3)
        a.send_json({"type": "set_named", "value": False})  # any request returns the state
        room = until(a, state_where(lambda r: r["game"]["named"] is False))["room"]
        assert room["game"]["turn_number"] == 2, "held: no automatic next turn"
        a.send_json({"type": "next_turn"})
        until(a, state_where(lambda r: r["game"]["turn_number"] == 3))


def closed_with(ws: WebSocketTestSession) -> int:
    """The close code the server ends this socket with, skipping the messages before it."""
    with pytest.raises(WebSocketDisconnect) as closed:
        for _ in range(1000):
            ws.receive_json()
    return closed.value.code


def test_leaving_the_lobby_frees_the_seat_and_closing_ends_the_room(client: TestClient):
    alice, bob, carol = Browser(client), Browser(client), Browser(client)
    alice.login("alice")
    bob.get("/api/me")
    carol.get("/api/me")
    code = alice.request("POST", "/api/rooms").json()["code"]

    with alice.socket(code) as a:
        with bob.socket(code) as b:
            b.send_json({"type": "join", "name": "Bob"})
            until(a, state_where(lambda r: len(r["players"]) == 2))
            b.send_json({"type": "leave_room"})
            assert closed_with(b) == LEFT_ROOM
        room = until(a, state_where(lambda r: len(r["players"]) == 1))["room"]
        assert [p["name"] for p in room["players"]] == ["Alice"]

        a.send_json({"type": "leave_room"})
        assert until(a, is_type("error"))["message"] == "The host closes the room instead"

        with carol.socket(code) as c:
            c.send_json({"type": "join", "name": "Carol"})
            until(a, state_where(lambda r: len(r["players"]) == 2))
            c.send_json({"type": "close_room"})
            assert until(c, is_type("error"))["message"] == "Only the host can do that"
            a.send_json({"type": "close_room"})
            assert closed_with(a) == ROOM_CLOSED
            assert closed_with(c) == ROOM_CLOSED

    with carol.socket(code) as c:
        assert closed_with(c) == NO_SUCH_ROOM


def test_an_away_player_keeps_their_seat_and_the_host_may_skip_their_turn(client: TestClient):
    alice, bob = Browser(client), Browser(client)
    alice.login("alice")
    bob.get("/api/me")
    assert alice.pick(liked=True)["status"] == "done"
    code = alice.request("POST", "/api/rooms").json()["code"]

    with alice.socket(code) as a:
        with bob.socket(code) as b:
            b.send_json({"type": "join", "name": "Bob"})
            room = until(a, state_where(lambda r: len(r["players"]) == 2))["room"]
            ids = {p["name"]: p["id"] for p in room["players"]}
            assert [p["local"] for p in room["players"]] == [False, False]
            a.send_json(settings(deck_size=10, next_turn_seconds=0))
            a.send_json({"type": "start_game"})
            game = until(a, state_where(lambda r: r["game"] is not None))["room"]["game"]

            a.send_json({"type": "skip_turn"})
            assert until(a, is_type("error"))["message"].endswith("is here to play")

            if game["active"] == ids["Bob"]:  # play Bob's turn, so that Alice's comes next
                b.send_json({"type": "place", "slot": 0})
                b.send_json({"type": "lock"})
                a.send_json({"type": "pass"})
                until(a, state_where(lambda r: r["game"]["phase"] == "revealed"))
                a.send_json({"type": "next_turn"})
                until(a, state_where(lambda r: r["game"]["active"] == ids["Alice"]))

            # Bob challenges, then leaves before guessing: his challenge goes, for free.
            a.send_json({"type": "place", "slot": 0})
            a.send_json({"type": "lock"})
            until(a, state_where(lambda r: r["game"]["phase"] == "challenging"))
            b.send_json({"type": "buzz"})
            until(a, state_where(lambda r: r["game"]["phase"] == "picking"))
            b.send_json({"type": "leave_room"})
            assert closed_with(b) == LEFT_ROOM

        room = until(a, state_where(lambda r: r["game"]["phase"] == "revealed"))["room"]
        bob_seat = next(p for p in room["players"] if p["id"] == ids["Bob"])
        assert (bob_seat["connected"], bob_seat["local"]) == (False, False)
        assert room["game"]["challenges"] == []
        assert next(p for p in room["game"]["players"] if p["id"] == ids["Bob"])["tokens"] == 2

        # Bob is on turn but away: the host skips it, and the card is thrown away.
        a.send_json({"type": "next_turn"})
        game = until(a, state_where(lambda r: r["game"]["active"] == ids["Bob"]))["room"]["game"]
        a.send_json({"type": "skip_turn"})
        skipped = until(a, state_where(lambda r: r["game"]["active"] == ids["Alice"]))
        after = skipped["room"]["game"]
        assert after["turn_number"] == game["turn_number"] + 1
        assert after["deck_remaining"] == game["deck_remaining"] - 1
        assert [len(p["timeline"]) for p in after["players"]] == [
            len(p["timeline"]) for p in game["players"]
        ]

        # Opening the room again in the same browser gives Bob his seat back.
        with bob.socket(code) as b:
            assert until(b, is_type("state"))["you"]["player_id"] == ids["Bob"]
