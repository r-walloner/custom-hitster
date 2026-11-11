"""Live rooms: connections, the lobby, the running game and playback. Held in memory only,
so a server restart ends every game."""

import asyncio
import logging
import random
import secrets
import sqlite3
import time
from collections.abc import Coroutine
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ValidationError
from starlette.websockets import WebSocket

from . import db, engine
from . import messages as m
from .curation import STRATEGIES
from .deck import Entry, cached_first, curate, to_card
from .importer import Importer
from .models import Card
from .spotify import Spotify, SpotifyError
from .years import YearResolver

log = logging.getLogger(__name__)

CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"  # no I or O, which read as 1 and 0
MAX_PLAYERS = 10
IDLE_SECONDS = 6 * 3600  # an empty room is dropped after this long
TEST_PLAYBACK_SECONDS = 5


class RoomLog(logging.LoggerAdapter[logging.Logger]):
    """Prefixes every record with the room code, so one game can be followed in the log."""

    def process(self, msg: Any, kwargs: Any) -> tuple[Any, Any]:
        return f"[{self.extra['room'] if self.extra else '?'}] {msg}", kwargs


def describe(card: Card) -> str:
    return f'"{card.name}" by {", ".join(card.artists)} ({card.year})'


def _count(n: int, noun: str) -> str:
    return f"{n} {noun}" if n == 1 else f"{n} {noun}s"


def where(timeline: list[Card], slot: int) -> str:
    """A slot of a timeline in words: "before 1984", "between 1984 and 1991", "after 1991"."""
    if not timeline:
        return "on the empty timeline"
    if slot == 0:
        return f"before {timeline[0].year}"
    if slot == len(timeline):
        return f"after {timeline[-1].year}"
    return f"between {timeline[slot - 1].year} and {timeline[slot].year}"


class RoomError(Exception):
    """The request is not allowed. The message is shown to the player who sent it."""


@dataclass(slots=True)
class Services:
    conn: sqlite3.Connection
    spotify: Spotify
    importer: Importer
    resolver: YearResolver
    rng: random.Random


@dataclass(slots=True)
class Seat:
    """A player in a room. Seat ids are the player ids the game engine sees."""

    id: str
    name: str
    client_id: str | None  # the browser that controls the seat; None for a hot-seat player
    spotify_id: str | None
    device_id: str | None = None
    device_name: str | None = None


class Room:
    def __init__(
        self, code: str, services: Services, host_client: str, host_spotify: str, host_name: str
    ) -> None:
        self.code = code
        self.log = RoomLog(log, {"room": code})
        self.host_client = host_client
        self.seats = [Seat(secrets.token_hex(4), host_name, host_client, host_spotify)]
        self.settings = m.RoomSettings()
        self.deck_view = m.DeckView()
        self.game: engine.Game | None = None
        self.playback = m.PlaybackView()
        self.last_active = time.monotonic()
        self._s = services
        self._deck_epoch = 0  # bumped whenever a deal in progress would no longer be valid
        self._game_number = 0  # bumped whenever a game starts or ends
        self._pending: list[Entry] = []  # the undrawn deck; years are looked up when drawn
        self._drawing = asyncio.Lock()
        self._window = 0  # bumped whenever a challenge window opens, so stale timers do nothing
        self._window_ends = 0.0  # time.monotonic() when the open window closes
        self._play_started = 0.0
        self._sockets: dict[WebSocket, tuple[str, str | None]] = {}  # -> (client id, spotify id)
        self._sending = asyncio.Lock()
        self._tasks: set[asyncio.Task[Any]] = set()

    # --- connections ---------------------------------------------------------------------

    @property
    def empty(self) -> bool:
        return not self._sockets

    def has_spotify_player(self, spotify_id: str) -> bool:
        return any(s.spotify_id == spotify_id for s in self.seats)

    async def connect(self, ws: WebSocket, client_id: str, spotify_id: str | None) -> None:
        self._sockets[ws] = (client_id, spotify_id)
        seat = self._seat_of(client_id)
        self.log.info("%s connected", seat.name if seat else "a visitor")
        # A guest who has signed in with Spotify since joining gets their library linked.
        if (
            seat
            and spotify_id
            and seat.spotify_id is None
            and self.game is None
            and not self.has_spotify_player(spotify_id)
        ):
            seat.spotify_id = spotify_id
            self.log.info("%s linked their Spotify library", seat.name)
            self._invalidate_deck()
        await self.broadcast()

    async def disconnect(self, ws: WebSocket) -> None:
        client = self._sockets.pop(ws, None)
        if client:
            seat = self._seat_of(client[0])
            self.log.info("%s disconnected", seat.name if seat else "a visitor")
        self.last_active = time.monotonic()
        await self.broadcast()

    async def handle(self, ws: WebSocket, raw: Any) -> None:
        """Process one message from a client, then send everyone the current state."""
        self.last_active = time.monotonic()
        client_id, _ = self._sockets[ws]
        try:
            await self._dispatch(ws, client_id, m.client_message.validate_python(raw))
        except ValidationError as exc:
            self.log.debug("not understood: %r (%s)", raw, exc)
            await self._send(ws, m.ErrorMessage(message="That request was not understood"))
        except (RoomError, engine.RuleError) as exc:
            seat = self._seat_of(client_id)
            kind = raw.get("type") if isinstance(raw, dict) else raw
            self.log.debug("refused %s from %s: %s", kind, seat.name if seat else "a visitor", exc)
            await self._send(ws, m.ErrorMessage(message=str(exc)))
        except Exception:
            self.log.exception("handling %r failed", raw)
            await self._send(ws, m.ErrorMessage(message="Something went wrong on the server"))
        # Every request gets a state back, refused ones too: clients wait for it to unlock buttons.
        await self.broadcast()

    async def broadcast(self) -> None:
        # The snapshot is taken inside the lock, so states always arrive in order.
        async with self._sending:
            room = self._view()
            for ws, (client_id, spotify_id) in list(self._sockets.items()):
                seat = self._seat_of(client_id)
                you = m.YouView(
                    player_id=seat.id if seat else None,
                    is_host=client_id == self.host_client,
                    spotify=bool(seat.spotify_id if seat else spotify_id),
                )
                await self._deliver(ws, m.StateMessage(you=you, room=room))

    def refresh(self) -> None:
        """Broadcast soon; for callers that are not coroutines."""
        self._spawn(self.broadcast())

    async def _send(self, ws: WebSocket, message: BaseModel) -> None:
        async with self._sending:
            await self._deliver(ws, message)

    async def _deliver(self, ws: WebSocket, message: BaseModel) -> None:
        try:
            await ws.send_text(message.model_dump_json())
        except Exception:
            self._sockets.pop(ws, None)  # gone; its receive loop cleans up

    def _spawn(self, coro: Coroutine[Any, Any, None]) -> None:
        task = asyncio.create_task(coro)
        self._tasks.add(task)
        task.add_done_callback(self._task_done)

    def _task_done(self, task: asyncio.Task[Any]) -> None:
        self._tasks.discard(task)
        if not task.cancelled() and task.exception():
            self.log.error("background task failed", exc_info=task.exception())

    # --- views ---------------------------------------------------------------------------

    def _view(self) -> m.RoomView:
        connected = {client_id for client_id, _ in self._sockets.values()}
        return m.RoomView(
            code=self.code,
            settings=self.settings,
            strategies=list(STRATEGIES),
            players=[
                m.PlayerView(
                    id=s.id,
                    name=s.name,
                    is_host=s.client_id == self.host_client,
                    connected=s.client_id in connected,
                    spotify=s.spotify_id is not None,
                    library=self._library(s.spotify_id),
                    device=s.device_name,
                )
                for s in self.seats
            ],
            deck=self.deck_view,
            playback=self.playback,
            game=_game_view(
                self.game, len(self._pending), self._drawing.locked(), self._window_left_ms()
            )
            if self.game
            else None,
        )

    def _library(self, spotify_id: str | None) -> m.LibraryView | None:
        if spotify_id is None:
            return None
        status = self._s.importer.status(spotify_id)
        return m.LibraryView.model_validate(status, from_attributes=True)

    # --- requests ------------------------------------------------------------------------

    def _seat_of(self, client_id: str) -> Seat | None:
        return next((s for s in self.seats if s.client_id == client_id), None)

    def _own_seat(self, client_id: str) -> Seat:
        seat = self._seat_of(client_id)
        if seat is None:
            raise RoomError("Join the room first")
        return seat

    def _spotify_seat(self, client_id: str) -> tuple[Seat, str]:
        seat = self._own_seat(client_id)
        if seat.spotify_id is None:
            raise RoomError("Sign in with Spotify first")
        return seat, seat.spotify_id

    def _host_only(self, client_id: str) -> None:
        if client_id != self.host_client:
            raise RoomError("Only the host can do that")

    def _lobby_only(self) -> None:
        if self.game is not None:
            raise RoomError("That is only possible before the game starts")

    def _actor(self, client_id: str, as_player: str | None) -> str:
        """The seat an action is for: the sender's own, or any seat if the host says so."""
        if as_player is None:
            return self._own_seat(client_id).id
        self._host_only(client_id)
        return as_player

    def _referee_only(self, client_id: str) -> None:
        """Revealing, judging the answer and moving on are for the host and the active player."""
        seat = self._seat_of(client_id)
        active = self.game.active if self.game else None
        if client_id != self.host_client and (seat is None or seat.id != active):
            raise RoomError("Only the host or the active player can do that")

    def _add_seat(self, name: str, client_id: str | None, spotify_id: str | None) -> None:
        if len(self.seats) >= MAX_PLAYERS:
            raise RoomError("The room is full")
        seat = Seat(secrets.token_hex(4), name, client_id, spotify_id)
        self.seats.append(seat)
        how = "with Spotify" if spotify_id else "without Spotify"
        self.log.info("%s joined, %s", name, how if client_id else "played by the host")
        self._invalidate_deck()

    def _invalidate_deck(self) -> None:
        if self.deck_view.status == "dealing":
            self.log.info("dealing abandoned: players or settings changed")
        self._deck_epoch += 1
        self.deck_view = m.DeckView()

    async def _dispatch(self, ws: WebSocket, client_id: str, message: m.ClientMessage) -> None:
        match message:
            case m.Join(name=name):
                self._lobby_only()
                if self._seat_of(client_id):
                    raise RoomError("You already joined")
                _, spotify_id = self._sockets[ws]
                if spotify_id and self.has_spotify_player(spotify_id):
                    spotify_id = None  # the same account in a second browser plays as a guest
                self._add_seat(name, client_id, spotify_id)

            case m.AddPlayer(name=name):
                self._host_only(client_id)
                self._lobby_only()
                self._add_seat(name, None, None)

            case m.RemovePlayer(player_id=player_id):
                self._host_only(client_id)
                self._lobby_only()
                if any(s.id == player_id and s.client_id == self.host_client for s in self.seats):
                    raise RoomError("The host cannot be removed")
                self.log.info("%s was removed", self._name(player_id))
                self.seats = [s for s in self.seats if s.id != player_id]
                self._invalidate_deck()

            case m.SetSettings(settings=settings):
                self._host_only(client_id)
                self._lobby_only()
                if settings.strategy not in STRATEGIES:
                    raise RoomError("There is no such curation strategy")
                old, self.settings = self.settings, settings
                changes = [
                    f"{key} {value} -> {getattr(settings, key)}"
                    for key, value in old.model_dump().items()
                    if getattr(settings, key) != value
                ]
                if changes:
                    self.log.info("settings: %s", ", ".join(changes))
                if (old.deck_size, old.strategy) != (settings.deck_size, settings.strategy):
                    self._invalidate_deck()

            case m.StartGame():
                self._host_only(client_id)
                self._lobby_only()
                if self.deck_view.status == "dealing":
                    raise RoomError("The game is already starting")
                ids = [s.spotify_id for s in self.seats if s.spotify_id]
                if not any(db.count_tracks(self._s.conn, pid) for pid in ids):
                    raise RoomError("No library has been imported yet")
                self._invalidate_deck()
                self.deck_view = m.DeckView(status="dealing", total=len(self.seats) + 1)
                self._spawn(self._deal(self._deck_epoch, ids))

            case m.EndGame():
                self._host_only(client_id)
                if self.game is None:
                    raise RoomError("No game is running")
                self.log.info("the host ended the game | %s", self._standings(self.game))
                self.game = None
                self._forget_deck()
                self.playback = m.PlaybackView()
                self._spawn(self._pause(self._listeners()))

            case m.GetDevices():
                _, spotify_id = self._spotify_seat(client_id)
                try:
                    devices = await self._s.spotify.devices(spotify_id)
                except SpotifyError as exc:
                    raise RoomError(exc.friendly) from exc
                self.log.debug(
                    "devices of %s: %s",
                    self._name(self._own_seat(client_id).id),
                    ", ".join(f"{d.name} ({d.type})" for d in devices) or "none",
                )
                views = [
                    m.DeviceView(id=d.id, name=d.name, kind=d.type, is_active=d.is_active)
                    for d in devices
                ]
                await self._send(ws, m.DevicesMessage(devices=views))

            case m.SetDevice(device_id=device_id, name=name):
                seat, _ = self._spotify_seat(client_id)
                seat.device_id, seat.device_name = device_id, name if device_id else None
                self.log.info("%s plays music on %s", seat.name, name or "their active device")

            case m.TestPlayback():
                self._lobby_only()
                seat, spotify_id = self._spotify_seat(client_id)
                uri = db.random_track_uri(self._s.conn, spotify_id)
                if uri is None:
                    raise RoomError("Import your library first")
                error = await self._play_one(seat, uri, 0)
                self.log.info("%s tested playback: %s", seat.name, error or "it works")
                text = error or f"Playing {TEST_PLAYBACK_SECONDS} seconds from your library"
                await self._send(ws, m.PlaybackTestMessage(ok=error is None, message=text))
                if error is None:
                    self._spawn(self._stop_test(seat))

            case m.RetryPlayback():
                failed = {f.player_id for f in self.playback.failures}
                if self.game is not None and failed:
                    self.log.info(
                        "retrying playback for %s", ", ".join(self._name(s) for s in failed)
                    )
                    self._start_playback(only=failed)

            case m.RestartPlayback():
                self._referee_only(client_id)
                if self.game is None or self.game.phase == "finished":
                    raise RoomError("No song is playing")
                seat = self._seat_of(client_id)
                self.log.info("%s restarted the song", seat.name if seat else "the host")
                self._start_playback()

            case m.Place(slot=slot, as_player=who):
                self._act(engine.Place(self._actor(client_id, who), slot))
            case m.LockIn(as_player=who):
                self._act(engine.Lock(self._actor(client_id, who)))
            case m.Skip(as_player=who):
                actor = self._actor(client_id, who)
                await self._prepare_draw()
                self._act(engine.Skip(actor))
            case m.Buzz(as_player=who):
                self._act(engine.Buzz(self._actor(client_id, who)))
            case m.PickSlot(slot=slot, as_player=who):
                self._act(engine.PickSlot(self._actor(client_id, who), slot))
            case m.LockPick(as_player=who):
                self._act(engine.LockPick(self._actor(client_id, who)))
            case m.Pass(as_player=who):
                self._act(engine.Pass(self._actor(client_id, who)))
            case m.Buy(as_player=who):
                actor = self._actor(client_id, who)
                await self._prepare_draw()
                self._act(engine.Buy(actor))
            case m.Reveal():
                self._referee_only(client_id)
                self._act(engine.Reveal())
            case m.SetNamed(value=value):
                self._referee_only(client_id)
                self._act(engine.SetNamed(value))
            case m.NextTurn():
                self._referee_only(client_id)
                if self.game and self.game.phase != "revealed":
                    raise engine.RuleError("The card is not revealed yet")  # before any lookup
                await self._prepare_draw()
                self._act(engine.NextTurn())

    def _act(self, action: engine.Action) -> None:
        if self.game is None:
            raise RoomError("No game is running")
        before = self.game
        self.game = game = engine.apply(before, action)
        if line := self._narrate(action, before, game):
            self.log.info("%s", line)
        if game.outcome and not before.outcome:
            self.log.info("%s", self._reveal_line(game))
        if game.phase == "picking" and before.phase != "picking":
            order = ", ".join(self._name(c.player) for c in game.challenges)
            self.log.info("challenges are closed; picking in this order: %s", order)
        if game.phase == "finished" and before.phase != "finished":
            self._log_game_over(game)
        elif game.draws != before.draws:
            self._log_new_card(game)
        if game.draws != before.draws:
            self._start_playback()
        if game.phase == "challenging" and before.phase != "challenging":
            self._open_window()

    # --- challenge window ----------------------------------------------------------------

    def _open_window(self) -> None:
        """Start the countdown during which the others may challenge."""
        self._window += 1
        seconds = self.settings.challenge_seconds
        self._window_ends = time.monotonic() + seconds
        self._spawn(self._close_window_later(self._window, seconds))

    async def _close_window_later(self, window: int, seconds: float) -> None:
        await asyncio.sleep(seconds)
        if window != self._window or self.game is None or self.game.phase != "challenging":
            return  # closed early, because everyone decided, or a later turn has its own window
        self._act(engine.CloseWindow())
        await self.broadcast()

    def _window_left_ms(self) -> int | None:
        if self.game is None or self.game.phase != "challenging":
            return None
        return max(0, int((self._window_ends - time.monotonic()) * 1000))

    def _name(self, seat_id: str) -> str:
        return next((s.name for s in self.seats if s.id == seat_id), seat_id)

    def _narrate(self, action: engine.Action, before: engine.Game, after: engine.Game) -> str:
        """The move in words. Slots refer to the active player's timeline."""
        name = self._name
        timeline = next(p.timeline for p in before.players if p.id == before.active)
        match action:
            case engine.Place(player, slot):
                return f"{name(player)} puts the card {where(timeline, slot)}"
            case engine.Lock(player):
                return f"{name(player)} locks in"
            case engine.Skip(player):
                return f"{name(player)} pays a token to skip {describe(before.card)}"
            case engine.Buzz(player):
                return f"{name(player)} challenges"
            case engine.PickSlot(player, slot):
                return f"{name(player)} says it goes {where(timeline, slot)}"
            case engine.LockPick(player):
                return f"{name(player)} locks in their challenge"
            case engine.Pass(player):
                return f"{name(player)} passes"
            case engine.CloseWindow():
                return "time is up for challenges"
            case engine.Reveal():
                return "the card is revealed early"
            case engine.SetNamed(value):
                said = "named" if value else "did not name"
                return f"{name(after.active)} {said} title and artist"
            case engine.Buy(player):
                return f"{name(player)} buys {describe(before.deck[0])} for 3 tokens"
            case engine.NextTurn():
                return ""  # the new card's line says it all

    def _reveal_line(self, game: engine.Game) -> str:
        assert game.outcome is not None
        active = self._name(game.active)
        if game.outcome.correct:
            result = f"{active} was right"
        elif game.outcome.card_to:
            result = f"{active} was wrong, {self._name(game.outcome.card_to)} takes the card"
        else:
            result = f"{active} was wrong, the card is discarded"
        return f"it was {describe(game.card)}: {result}"

    def _standings(self, game: engine.Game) -> str:
        return "; ".join(
            f"{self._name(p.id)} {_count(len(p.timeline), 'card')}, {_count(p.tokens, 'token')}"
            for p in game.players
        )

    def _log_new_card(self, game: engine.Game) -> None:
        self.log.info(
            "turn %d, %s's turn: playing %s | %s",
            game.turn_number,
            self._name(game.active),
            describe(game.card),
            self._standings(game),
        )

    def _log_game_over(self, game: engine.Game) -> None:
        self.log.info(
            "game over after %d turns, %s won | %s",
            game.turn_number,
            " and ".join(self._name(w) for w in game.winners),
            self._standings(game),
        )

    # --- deck ----------------------------------------------------------------------------

    async def _deal(self, epoch: int, spotify_ids: list[str]) -> None:
        """Start the game as soon as the opening cards have years: one per player and the first
        card in play. Every other card's year is looked up when it is drawn."""
        needed = len(self.seats) + 1
        cards: list[Card] = []
        try:
            entries = curate(
                self._s.conn,
                list(dict.fromkeys(spotify_ids)),
                self.settings.strategy,
                self.settings.deck_size,
                self._s.rng,
            )
            entries = cached_first(self._s.conn, entries, needed)
            self.log.info(
                "dealing: %d songs chosen by %r, looking up the years of the first %d",
                len(entries),
                self.settings.strategy,
                needed,
            )
            while entries and len(cards) < needed:
                entry = entries.pop(0)
                card = await to_card(self._s.resolver, entry)
                if epoch != self._deck_epoch:
                    return  # players or settings changed meanwhile
                if card is None:
                    self.log.info("no year for %r (%s), dropped", entry.track.name, entry.track.uri)
                if card:
                    cards.append(card)
                    self.deck_view = m.DeckView(status="dealing", done=len(cards), total=needed)
                    await self.broadcast()
        except Exception:
            self.log.exception("dealing failed")
            if epoch == self._deck_epoch:
                self.deck_view = m.DeckView(status="error", error="Starting the game failed")
                await self.broadcast()
            return
        if epoch != self._deck_epoch:
            return
        if len(cards) < needed:
            self.log.warning("only %d of %d opening cards have a year", len(cards), needed)
            self.deck_view = m.DeckView(
                status="error", error="Too few songs with a known year for this many players"
            )
        else:
            order = [s.id for s in self.seats]
            self._s.rng.shuffle(order)
            rules = engine.Rules(
                cards_to_win=self.settings.cards_to_win,
                starting_tokens=self.settings.starting_tokens,
            )
            self.game = engine.new_game(order, cards, rules)
            self.log.info(
                "game started in %s mode, first to %d cards, %d starting tokens; dealt %s",
                self.settings.mode,
                rules.cards_to_win,
                rules.starting_tokens,
                ", ".join(
                    f"{self._name(p.id)} {describe(p.timeline[0])}" for p in self.game.players
                ),
            )
            self.deck_view = m.DeckView()  # dealt
            self._invalidate_deck()  # the dealt cards are in the game now
            self._forget_deck()
            self._pending = entries
            self._log_new_card(self.game)
            self._start_playback()
        await self.broadcast()

    def _forget_deck(self) -> None:
        """Drop the undrawn cards of the game that just started or ended."""
        self._game_number += 1
        self._pending = []

    async def _prepare_draw(self) -> None:
        """Look up the year of the next card just before it is drawn, so MusicBrainz is asked
        only about songs that are actually played. Cached years cost nothing."""
        if self._drawing.locked():
            raise RoomError("The next song is still loading")
        if self.game is None or self.game.deck or not self._pending:
            return  # a card is ready, or the deck has really run out
        async with self._drawing:
            await self.broadcast()  # shows everyone that the next song is loading
            number = self._game_number
            while self.game is not None and not self.game.deck and self._pending:
                entry = self._pending.pop(0)
                card = await to_card(self._s.resolver, entry)
                if number != self._game_number or self.game is None:
                    return  # the game ended meanwhile
                if card:
                    self.game.deck.append(card)
                else:
                    self.log.info("no year for %r (%s), dropped", entry.track.name, entry.track.uri)

    # --- playback ------------------------------------------------------------------------

    def _listeners(self) -> list[Seat]:
        """The seats whose Spotify account plays the music."""
        if self.settings.mode == "local":
            return [s for s in self.seats if s.client_id == self.host_client]
        return [s for s in self.seats if s.spotify_id]

    def _start_playback(self, only: set[str] | None = None) -> None:
        """Play the card in play for everyone, or (on a retry) for the seats in `only`,
        who then join at the position the others have reached."""
        assert self.game is not None
        if only is None:
            self._play_started = time.monotonic()
            position_ms, kept = 0, []
        else:
            position_ms = int((time.monotonic() - self._play_started) * 1000)
            kept = [f for f in self.playback.failures if f.player_id not in only]
        targets = [s for s in self._listeners() if only is None or s.id in only]
        if not targets:
            self.log.warning("nobody in the room can play music: no seat has Spotify")
        self.playback = m.PlaybackView(status="starting", failures=kept)
        self._spawn(self._play(self.game.draws, self.game.card.uri, targets, position_ms, kept))

    async def _play(
        self,
        draw: int,
        uri: str,
        targets: list[Seat],
        position_ms: int,
        kept: list[m.PlaybackFailure],
    ) -> None:
        errors = await asyncio.gather(*(self._play_one(s, uri, position_ms) for s in targets))
        if self.game is None or self.game.draws != draw:
            return  # the song changed while Spotify was answering
        failures = kept + [
            m.PlaybackFailure(player_id=seat.id, message=error)
            for seat, error in zip(targets, errors, strict=True)
            if error
        ]
        self.playback = m.PlaybackView(
            status="failed" if failures else "playing", failures=failures
        )
        await self.broadcast()

    async def _play_one(self, seat: Seat, uri: str, position_ms: int) -> str | None:
        """Start a track on one seat's Spotify. Returns what to tell the player if it failed."""
        if seat.spotify_id is None:
            self.log.warning("cannot play %s for %s: no Spotify account", uri, seat.name)
            return "No Spotify account connected"
        try:
            await self._s.spotify.play(seat.spotify_id, uri, seat.device_id, position_ms)
        except SpotifyError as exc:
            self.log.warning(
                "playing %s on %s's Spotify (%s) failed: %s",
                uri,
                seat.name,
                seat.device_name or "active device",
                exc,
            )
            return exc.friendly
        return None

    async def _pause(self, seats: list[Seat]) -> None:
        async def pause(seat: Seat) -> None:
            if seat.spotify_id:
                try:
                    await self._s.spotify.pause(seat.spotify_id, seat.device_id)
                except SpotifyError as exc:
                    self.log.debug("pausing failed, maybe nothing was playing: %s", exc)

        await asyncio.gather(*(pause(s) for s in seats))

    async def _stop_test(self, seat: Seat) -> None:
        await asyncio.sleep(TEST_PLAYBACK_SECONDS)
        if self.game is None:
            await self._pause([seat])


def _card_view(card: Card) -> dict[str, Any]:
    return {
        "id": card.track_id,
        "name": card.name,
        "artists": list(card.artists),
        "year": card.year,
        "image_url": card.image_url,
    }


def _game_view(
    game: engine.Game, pending: int, drawing: bool, window_left_ms: int | None
) -> m.GameView:
    """What clients may see: the card in play stays hidden until it is revealed. `pending`
    counts the undrawn cards whose years have not been looked up yet."""
    revealed = game.phase in ("revealed", "finished")
    card = game.card
    return m.GameView(
        phase=game.phase,
        turn_number=game.turn_number,
        active=game.active,
        deck_remaining=len(game.deck) + pending,
        players=[
            m.GamePlayerView(
                id=p.id,
                tokens=p.tokens,
                timeline=[m.CardView(**_card_view(c)) for c in p.timeline],
            )
            for p in game.players
        ],
        slot=game.slot,
        challenges=[
            m.ChallengeView(player_id=c.player, slot=c.slot, locked=c.locked)
            for c in game.challenges
        ],
        passed=game.passed,
        card=m.RevealedCard(
            **_card_view(card), year_source=card.year_source, known_by=list(card.known_by)
        )
        if revealed
        else None,
        outcome=m.OutcomeView(correct=game.outcome.correct, card_to=game.outcome.card_to)
        if game.outcome
        else None,
        named=game.named,
        winners=game.winners,
        drawing=drawing,
        window_left_ms=window_left_ms,
    )


class Rooms:
    def __init__(self, services: Services) -> None:
        self._services = services
        self._rooms: dict[str, Room] = {}

    def create(self, host_client: str, host_spotify: str, host_name: str) -> Room:
        now = time.monotonic()
        self._rooms = {
            code: room
            for code, room in self._rooms.items()
            if not (room.empty and now - room.last_active > IDLE_SECONDS)
        }
        while (code := "".join(secrets.choice(CODE_LETTERS) for _ in range(4))) in self._rooms:
            pass
        room = Room(code, self._services, host_client, host_spotify, host_name)
        self._rooms[code] = room
        room.log.info("room created by %s", host_name)
        return room

    def get(self, code: str) -> Room | None:
        return self._rooms.get(code.upper())

    def on_library_change(self, spotify_id: str) -> None:
        """Lobbies show each player's import progress; keep them current."""
        for room in self._rooms.values():
            if room.game is None and room.has_spotify_player(spotify_id):
                room.refresh()
