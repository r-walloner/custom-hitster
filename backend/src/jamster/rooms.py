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
        self._pending: list[Entry] = []  # the rest of the deck, whose years are not known yet
        self._deck_grew = asyncio.Event()  # set when a card from `_pending` reached the deck
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
        # A guest who has signed in with Spotify since joining gets their library linked.
        if (
            seat
            and spotify_id
            and seat.spotify_id is None
            and self.game is None
            and not self.has_spotify_player(spotify_id)
        ):
            seat.spotify_id = spotify_id
            self._invalidate_deck()
        await self.broadcast()

    async def disconnect(self, ws: WebSocket) -> None:
        self._sockets.pop(ws, None)
        self.last_active = time.monotonic()
        await self.broadcast()

    async def handle(self, ws: WebSocket, raw: Any) -> None:
        """Process one message from a client, then send everyone the new state."""
        self.last_active = time.monotonic()
        client_id, _ = self._sockets[ws]
        try:
            await self._dispatch(ws, client_id, m.client_message.validate_python(raw))
        except ValidationError:
            await self._send(ws, m.ErrorMessage(message="That request was not understood"))
        except (RoomError, engine.RuleError) as exc:
            await self._send(ws, m.ErrorMessage(message=str(exc)))
        except Exception:
            log.exception("room %s: handling %r failed", self.code, raw)
            await self._send(ws, m.ErrorMessage(message="Something went wrong on the server"))
        else:
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
            log.error("room %s: background task failed", self.code, exc_info=task.exception())

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
            game=_game_view(self.game, len(self._pending)) if self.game else None,
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
        self.seats.append(Seat(secrets.token_hex(4), name, client_id, spotify_id))
        self._invalidate_deck()

    def _invalidate_deck(self) -> None:
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
                self.seats = [s for s in self.seats if s.id != player_id]
                self._invalidate_deck()

            case m.SetSettings(settings=settings):
                self._host_only(client_id)
                self._lobby_only()
                if settings.strategy not in STRATEGIES:
                    raise RoomError("There is no such curation strategy")
                old, self.settings = self.settings, settings
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
                self.game = None
                self._stop_looking_ahead()
                self.playback = m.PlaybackView()
                self._spawn(self._pause(self._listeners()))

            case m.GetDevices():
                _, spotify_id = self._spotify_seat(client_id)
                try:
                    devices = await self._s.spotify.devices(spotify_id)
                except SpotifyError as exc:
                    raise RoomError(exc.friendly) from exc
                views = [
                    m.DeviceView(id=d.id, name=d.name, kind=d.type, is_active=d.is_active)
                    for d in devices
                ]
                await self._send(ws, m.DevicesMessage(devices=views))

            case m.SetDevice(device_id=device_id, name=name):
                seat, _ = self._spotify_seat(client_id)
                seat.device_id, seat.device_name = device_id, name if device_id else None

            case m.TestPlayback():
                self._lobby_only()
                seat, spotify_id = self._spotify_seat(client_id)
                uri = db.random_track_uri(self._s.conn, spotify_id)
                if uri is None:
                    raise RoomError("Import your library first")
                error = await self._play_one(seat, uri, 0)
                text = error or f"Playing {TEST_PLAYBACK_SECONDS} seconds from your library"
                await self._send(ws, m.PlaybackTestMessage(ok=error is None, message=text))
                if error is None:
                    self._spawn(self._stop_test(seat))

            case m.RetryPlayback():
                failed = {f.player_id for f in self.playback.failures}
                if self.game is not None and failed:
                    self._start_playback(only=failed)

            case m.Place(slot=slot, as_player=who):
                self._act(engine.Place(self._actor(client_id, who), slot))
            case m.LockIn(as_player=who):
                self._act(engine.Lock(self._actor(client_id, who)))
            case m.Skip(as_player=who):
                actor = self._actor(client_id, who)
                await self._next_card_known()
                self._act(engine.Skip(actor))
            case m.Buzz(as_player=who):
                self._act(engine.Buzz(self._actor(client_id, who)))
            case m.PickSlot(slot=slot, as_player=who):
                self._act(engine.PickSlot(self._actor(client_id, who), slot))
            case m.Pass(as_player=who):
                self._act(engine.Pass(self._actor(client_id, who)))
            case m.Buy(as_player=who):
                actor = self._actor(client_id, who)
                await self._next_card_known()
                self._act(engine.Buy(actor))
            case m.Reveal():
                self._referee_only(client_id)
                self._act(engine.Reveal())
            case m.SetNamed(value=value):
                self._referee_only(client_id)
                self._act(engine.SetNamed(value))
            case m.NextTurn():
                self._referee_only(client_id)
                await self._next_card_known()
                self._act(engine.NextTurn())

    def _act(self, action: engine.Action) -> None:
        if self.game is None:
            raise RoomError("No game is running")
        draws = self.game.draws
        self.game = engine.apply(self.game, action)
        if self.game.draws != draws:
            self._start_playback()

    # --- deck ----------------------------------------------------------------------------

    async def _deal(self, epoch: int, spotify_ids: list[str]) -> None:
        """Start the game as soon as the opening cards have years: one per player and the first
        card in play. The years of the rest of the deck are looked up while the game runs."""
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
            while entries and len(cards) < needed:
                card = await to_card(self._s.resolver, entries.pop(0))
                if epoch != self._deck_epoch:
                    return  # players or settings changed meanwhile
                if card:
                    cards.append(card)
                    self.deck_view = m.DeckView(status="dealing", done=len(cards), total=needed)
                    await self.broadcast()
        except Exception:
            log.exception("room %s: dealing failed", self.code)
            if epoch == self._deck_epoch:
                self.deck_view = m.DeckView(status="error", error="Starting the game failed")
                await self.broadcast()
            return
        if epoch != self._deck_epoch:
            return
        if len(cards) < needed:
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
            self._invalidate_deck()  # the dealt cards are in the game now
            self._stop_looking_ahead()
            self._pending = entries
            self._spawn(self._look_ahead(self._game_number))
            self._start_playback()
        await self.broadcast()

    async def _look_ahead(self, number: int) -> None:
        """Move the pending entries into the game's deck, in order, as their years arrive."""
        try:
            while self._pending:
                card = await to_card(self._s.resolver, self._pending[0])
                if number != self._game_number or self.game is None:
                    return
                self._pending.pop(0)
                if card:
                    self.game.deck.append(card)
                self._deck_grew.set()
                if self.game.phase == "finished":
                    self._pending = []
        except Exception:
            if number == self._game_number:
                self._pending = []  # the game plays on with the cards it has
            raise
        finally:
            self._deck_grew.set()

    def _stop_looking_ahead(self) -> None:
        self._game_number += 1
        self._pending = []
        self._deck_grew.set()  # wakes anyone waiting for a card that will not come

    async def _next_card_known(self) -> None:
        """Wait until the next card has its year, unless the deck has really run out.

        Normally the look-ahead is many cards ahead and this returns at once.
        """
        while self.game is not None and not self.game.deck and self._pending:
            self._deck_grew.clear()
            await self._deck_grew.wait()

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
            return "No Spotify account connected"
        try:
            await self._s.spotify.play(seat.spotify_id, uri, seat.device_id, position_ms)
        except SpotifyError as exc:
            return exc.friendly
        return None

    async def _pause(self, seats: list[Seat]) -> None:
        async def pause(seat: Seat) -> None:
            if seat.spotify_id:
                try:
                    await self._s.spotify.pause(seat.spotify_id, seat.device_id)
                except SpotifyError:
                    pass  # best effort: nothing may be playing

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


def _game_view(game: engine.Game, pending: int) -> m.GameView:
    """What clients may see: the card in play stays hidden until it is revealed. `pending`
    counts the cards whose years are still being looked up."""
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
        challenges=[m.ChallengeView(player_id=c.player, slot=c.slot) for c in game.challenges],
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
        return room

    def get(self, code: str) -> Room | None:
        return self._rooms.get(code.upper())

    def on_library_change(self, spotify_id: str) -> None:
        """Lobbies show each player's import progress; keep them current."""
        for room in self._rooms.values():
            if room.game is None and room.has_spotify_player(spotify_id):
                room.refresh()
