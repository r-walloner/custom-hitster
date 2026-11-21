"""Everything that crosses the WebSocket. Mirrored by hand in frontend/src/api/messages.ts."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, TypeAdapter

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=24)]


class RoomSettings(BaseModel):
    mode: Literal["local", "remote"] = "local"  # local: host's Spotify. remote: every player's.
    cards_to_win: int = Field(default=10, ge=2, le=30)
    starting_tokens: int = Field(default=3, ge=0, le=5)
    deck_size: int = Field(default=60, ge=10, le=300)
    strategy: str = "majority"
    # How long the others may challenge after the active player locked in.
    challenge_seconds: int = Field(default=15, ge=1, le=60)
    # How long the revealed card stays before the next turn starts by itself; 0 turns it off.
    next_turn_seconds: int = Field(default=15, ge=0, le=300)


# --- client -> server ------------------------------------------------------------------------


class _Client(BaseModel):
    model_config = ConfigDict(extra="forbid")


class _Acting(_Client):
    as_player: str | None = None  # the host plays for a local (hot-seat) player


class Join(_Client):
    type: Literal["join"]
    name: Name


class AddPlayer(_Client):
    type: Literal["add_player"]
    name: Name


class Rename(_Client):
    """A player renames themselves; the host may also rename a hot-seat player. Lobby only."""

    type: Literal["rename"]
    player_id: str
    name: Name


class RemovePlayer(_Client):
    type: Literal["remove_player"]
    player_id: str


class LeaveRoom(_Client):
    """A guest leaves. In the lobby their seat goes; in a game it stays, as an away player."""

    type: Literal["leave_room"]


class CloseRoom(_Client):
    """The host ends the room for everyone, from the lobby."""

    type: Literal["close_room"]


class SetSettings(_Client):
    type: Literal["set_settings"]
    settings: RoomSettings


class StartGame(_Client):
    type: Literal["start_game"]


class EndGame(_Client):
    type: Literal["end_game"]


class GetDevices(_Client):
    type: Literal["get_devices"]


class SetDevice(_Client):
    type: Literal["set_device"]
    device_id: str | None
    name: str | None


class TestPlayback(_Client):
    type: Literal["test_playback"]


class StopTest(_Client):
    """Stop the speaker test before its time is up: the player tapped Stop."""

    type: Literal["stop_test"]


class RetryPlayback(_Client):
    """Start the song again for the players whose playback failed, at the others' position."""

    type: Literal["retry_playback"]


class HoldTurn(_Client):
    """Stop the countdown to the next turn, to keep listening to the revealed song."""

    type: Literal["hold_turn"]


class RestartPlayback(_Client):
    """Start the song again from the beginning for everyone who hears the music."""

    type: Literal["restart_playback"]


class SkipTurn(_Client):
    """The host skips the turn of an away player; the card in play is thrown away."""

    type: Literal["skip_turn"]


class Place(_Acting):
    type: Literal["place"]
    slot: int


class LockIn(_Acting):
    type: Literal["lock"]


class Skip(_Acting):
    type: Literal["skip"]


class Buzz(_Acting):
    type: Literal["buzz"]


class PickSlot(_Acting):
    """A challenger marks a slot; it can still be changed until LockPick."""

    type: Literal["pick_slot"]
    slot: int


class LockPick(_Acting):
    type: Literal["lock_pick"]


class Pass(_Acting):
    type: Literal["pass"]


class Buy(_Acting):
    type: Literal["buy"]


class Reveal(_Client):
    type: Literal["reveal"]


class SetNamed(_Client):
    type: Literal["set_named"]
    value: bool


class NextTurn(_Client):
    type: Literal["next_turn"]


ClientMessage = Annotated[
    Join
    | AddPlayer
    | Rename
    | RemovePlayer
    | LeaveRoom
    | CloseRoom
    | SetSettings
    | StartGame
    | EndGame
    | GetDevices
    | SetDevice
    | TestPlayback
    | StopTest
    | RetryPlayback
    | RestartPlayback
    | HoldTurn
    | SkipTurn
    | Place
    | LockIn
    | Skip
    | Buzz
    | PickSlot
    | LockPick
    | Pass
    | Buy
    | Reveal
    | SetNamed
    | NextTurn,
    Field(discriminator="type"),
]
client_message: TypeAdapter[ClientMessage] = TypeAdapter(ClientMessage)


# --- server -> client ------------------------------------------------------------------------


class LibraryView(BaseModel):
    status: Literal["none", "running", "done", "error"]
    detail: str
    tracks: int


class PlayerView(BaseModel):
    id: str
    name: str
    is_host: bool
    connected: bool  # False for hot-seat players and for players who are away
    local: bool  # a hot-seat player, whom the host plays for
    spotify: bool
    library: LibraryView | None
    device: str | None


class PlaybackFailure(BaseModel):
    player_id: str
    message: str


class PlaybackView(BaseModel):
    status: Literal["idle", "starting", "playing", "failed"] = "idle"
    failures: list[PlaybackFailure] = []
    elapsed_ms: int | None = None  # once playing or failed: how far the song is
    duration_ms: int | None = None  # the length of the song in play


class CardView(BaseModel):
    id: str
    name: str
    artists: list[str]
    year: int
    image_url: str | None


class DeckView(BaseModel):
    """Dealing: the game starts once the opening cards (one per player plus one) have years."""

    status: Literal["none", "dealing", "error"] = "none"
    done: int = 0
    total: int = 0
    error: str | None = None
    order: list[str] = []  # while dealing: the player ids in turn order, shuffled up front
    dealt: list[CardView] = []  # the starting cards so far, one per player in `order`


class RevealedCard(CardView):
    year_source: str
    known_by: list[str]


class GamePlayerView(BaseModel):
    id: str
    tokens: int
    timeline: list[CardView]


class ChallengeView(BaseModel):
    player_id: str
    slot: int | None
    locked: bool


class OutcomeView(BaseModel):
    correct: bool
    card_to: str | None
    bought: bool  # the player on turn bought the card instead of guessing


class GameView(BaseModel):
    phase: Literal["placing", "challenging", "picking", "revealed", "finished"]
    turn_number: int
    active: str
    deck_remaining: int
    players: list[GamePlayerView]
    slot: int | None
    challenges: list[ChallengeView]
    passed: list[str]
    card: RevealedCard | None  # hidden until the reveal
    outcome: OutcomeView | None
    named: bool | None
    winners: list[str]
    drawing: bool  # the next card's year is being looked up; draws wait until it is done
    window_left_ms: int | None  # while challenging: time left until the window closes
    advance_left_ms: int | None  # once revealed: time left until the next turn starts by itself


class RoomView(BaseModel):
    code: str
    settings: RoomSettings
    strategies: list[str]
    players: list[PlayerView]
    deck: DeckView
    playback: PlaybackView
    game: GameView | None


class YouView(BaseModel):
    player_id: str | None  # None while only watching
    is_host: bool
    spotify: bool


class StateMessage(BaseModel):
    type: Literal["state"] = "state"
    you: YouView
    room: RoomView


class ErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    message: str


class DeviceView(BaseModel):
    id: str
    name: str
    kind: str
    is_active: bool


class DevicesMessage(BaseModel):
    type: Literal["devices"] = "devices"
    devices: list[DeviceView]


class PlaybackTestMessage(BaseModel):
    type: Literal["playback_test"] = "playback_test"
    ok: bool
    message: str
