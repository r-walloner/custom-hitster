"""The game rules as a pure state machine: apply(game, action) -> game. No I/O, no clock.

A turn runs placing -> challenging -> picking -> revealed, then the next player's turn starts.

  placing      The active player hears the song, puts the card into a slot of their timeline and
               locks it in. They may pay a token to skip to another song.
  challenging  The challenge window: the other players challenge or pass. It closes when everyone
               has decided, or when the caller says time is up (CloseWindow); the room runs the
               countdown, since the engine has no clock. Without a challenge the card is revealed.
  picking      In challenge order, each challenger marks a different slot of the active player's
               timeline and locks it in, paying a token. Then the card is revealed.
  revealed     A correct placement keeps the card. Otherwise the first challenger with a correct
               slot takes it. Naming title and artist earns the active player a token.

Slot i of a timeline is the gap before card i; slot len(timeline) is the end.
"""

import copy
from bisect import bisect_right
from dataclasses import dataclass, field
from typing import Literal

from .models import Card

Phase = Literal["placing", "challenging", "picking", "revealed", "finished"]


class RuleError(Exception):
    """The action is not allowed right now. The message is shown to the player."""


@dataclass(frozen=True, slots=True)
class Rules:
    cards_to_win: int = 10
    starting_tokens: int = 2
    max_tokens: int = 5
    skip_cost: int = 1
    challenge_cost: int = 1
    buy_cost: int = 3


@dataclass(slots=True)
class Player:
    id: str
    tokens: int
    timeline: list[Card]  # always in year order


@dataclass(slots=True)
class Challenge:
    player: str
    slot: int | None = None  # None until the challenger has marked a slot
    locked: bool = False  # the challenger confirmed the slot and paid for it


@dataclass(frozen=True, slots=True)
class Outcome:
    correct: bool  # did the active player place the card correctly?
    card_to: str | None  # who got the card; None if it was discarded


@dataclass(slots=True)
class Game:
    rules: Rules
    players: list[Player]  # in turn order
    deck: list[Card]  # next card first
    active: str
    card: Card  # the card in play; stays set after the game finishes
    phase: Phase = "placing"
    turn_number: int = 1
    draws: int = 1  # counts cards put into play, so callers can tell when the song changed
    slot: int | None = None  # where the active player put the card
    challenges: list[Challenge] = field(default_factory=list)  # in challenge order
    passed: list[str] = field(default_factory=list)
    outcome: Outcome | None = None
    named: bool | None = None  # did the active player name title and artist?
    winners: list[str] = field(default_factory=list)


# --- actions ---------------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Place:
    player: str
    slot: int


@dataclass(frozen=True, slots=True)
class Lock:
    player: str


@dataclass(frozen=True, slots=True)
class Skip:
    player: str


@dataclass(frozen=True, slots=True)
class Buzz:
    player: str


@dataclass(frozen=True, slots=True)
class PickSlot:
    player: str
    slot: int


@dataclass(frozen=True, slots=True)
class Pass:
    player: str


@dataclass(frozen=True, slots=True)
class CloseWindow:
    """Time is up for challenging. Players who have not decided have passed."""


@dataclass(frozen=True, slots=True)
class LockPick:
    player: str


@dataclass(frozen=True, slots=True)
class Reveal:
    """Reveal now, whatever is pending. Challengers who have not locked in pay nothing."""


@dataclass(frozen=True, slots=True)
class SetNamed:
    value: bool


@dataclass(frozen=True, slots=True)
class NextTurn:
    pass


@dataclass(frozen=True, slots=True)
class Buy:
    player: str


Action = (
    Place
    | Lock
    | Skip
    | Buzz
    | Pass
    | CloseWindow
    | PickSlot
    | LockPick
    | Reveal
    | SetNamed
    | NextTurn
    | Buy
)


# --- rules -----------------------------------------------------------------------------------


def fits(timeline: list[Card], slot: int, year: int) -> bool:
    """Is a card from `year` in order at `slot`? Equal years may go on either side."""
    before = timeline[slot - 1].year if slot > 0 else None
    after = timeline[slot].year if slot < len(timeline) else None
    return (before is None or before <= year) and (after is None or year <= after)


def new_game(player_ids: list[str], deck: list[Card], rules: Rules) -> Game:
    """Deal each player a starting card and put the first card into play."""
    if not player_ids:
        raise RuleError("A game needs at least one player")
    if len(deck) < len(player_ids) + 1:
        raise RuleError("The deck is too small for this many players")
    deck = list(deck)
    players = [Player(pid, rules.starting_tokens, [deck.pop(0)]) for pid in player_ids]
    return Game(rules=rules, players=players, deck=deck, active=player_ids[0], card=deck.pop(0))


def apply(game: Game, action: Action) -> Game:
    """The game after `action`. Raises RuleError, leaving `game` untouched, if it is illegal."""
    g = copy.deepcopy(game)
    _require(g.phase != "finished", "The game is over")
    match action:
        case Place(player, slot):
            _require(g.phase == "placing", "The card is already locked in")
            _require(player == g.active, "It is not your turn")
            _require(0 <= slot <= len(_player(g, player).timeline), "There is no such slot")
            g.slot = slot

        case Lock(player):
            _require(g.phase == "placing", "The card is already locked in")
            _require(player == g.active, "It is not your turn")
            _require(g.slot is not None, "Place the card first")
            g.phase = "challenging"
            _settle_window(g)

        case Skip(player):
            _require(g.phase == "placing", "You can only skip before locking in")
            _require(player == g.active, "It is not your turn")
            _pay(g, player, g.rules.skip_cost)
            _require(bool(g.deck), "The deck is empty")
            g.card = g.deck.pop(0)
            g.slot = None
            g.draws += 1

        case Buzz(player):
            _require(g.phase == "challenging", "The time to challenge is over")
            _require(player != g.active, "You cannot challenge your own card")
            _require(player not in g.passed, "You already passed")
            _require(all(c.player != player for c in g.challenges), "You already challenged")
            _require(_can_challenge(g, player), "Not enough tokens")
            _require(_room_for_challenge(g), "There is no free slot left")
            g.challenges.append(Challenge(player))
            _settle_window(g)

        case Pass(player):
            _require(g.phase == "challenging", "The time to challenge is over")
            _require(player != g.active, "You cannot pass on your own card")
            _player(g, player)
            _require(all(c.player != player for c in g.challenges), "You already challenged")
            if player not in g.passed:
                g.passed.append(player)
            _settle_window(g)

        case CloseWindow():
            _require(g.phase == "challenging", "The time to challenge is over")
            _close_window(g)

        case PickSlot(player, slot):
            _require(g.phase == "picking", "There is nothing to pick right now")
            current = _picking(g)
            _require(current.player == player, "It is not your pick yet")
            _require(slot in _free_slots(g) or slot == current.slot, "That slot is taken")
            current.slot = slot

        case LockPick(player):
            _require(g.phase == "picking", "There is nothing to pick right now")
            current = _picking(g)
            _require(current.player == player, "It is not your pick yet")
            _require(current.slot is not None, "Mark a slot first")
            _pay(g, player, g.rules.challenge_cost)
            current.locked = True
            _settle_picks(g)

        case Reveal():
            _require(g.phase in ("challenging", "picking"), "Lock the card in first")
            _reveal(g)

        case SetNamed(value):
            _require(g.phase == "revealed", "The card is not revealed yet")
            g.named = value

        case NextTurn():
            _require(g.phase == "revealed", "The card is not revealed yet")
            if g.named:
                active = _player(g, g.active)
                active.tokens = min(g.rules.max_tokens, active.tokens + 1)
            _next_turn(g)

        case Buy(player):
            # Buying changes the buyer's timeline, so the active player waits until their own
            # card is resolved; otherwise the slots in play would shift.
            _require(player != g.active or g.phase == "revealed", "Finish your turn first")
            _require(bool(g.deck), "The deck is empty")
            _pay(g, player, g.rules.buy_cost)
            _insert_in_order(_player(g, player).timeline, g.deck.pop(0))
            _check_win(g)
            if g.phase in ("challenging", "picking"):
                # A buyer left without tokens can no longer pay for a pending challenge.
                g.challenges = [
                    c
                    for c in g.challenges
                    if c.locked or c.player != player or _can_challenge(g, player)
                ]
                if g.phase == "challenging":
                    _settle_window(g)
                else:
                    _settle_picks(g)
    return g


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise RuleError(message)


def _player(g: Game, player_id: str) -> Player:
    for player in g.players:
        if player.id == player_id:
            return player
    raise RuleError("You are not in this game")


def _pay(g: Game, player_id: str, cost: int) -> None:
    player = _player(g, player_id)
    _require(player.tokens >= cost, "Not enough tokens")
    player.tokens -= cost


def _free_slots(g: Game) -> set[int]:
    """Slots of the active player's timeline that neither they nor a challenger has taken."""
    taken = {g.slot, *(c.slot for c in g.challenges)}
    return set(range(len(_player(g, g.active).timeline) + 1)) - taken


def _insert_in_order(timeline: list[Card], card: Card) -> None:
    timeline.insert(bisect_right([c.year for c in timeline], card.year), card)


def _can_challenge(g: Game, player_id: str) -> bool:
    return _player(g, player_id).tokens >= g.rules.challenge_cost


def _room_for_challenge(g: Game) -> bool:
    """Every challenger needs a slot of their own besides the active player's."""
    return len(_player(g, g.active).timeline) > len(g.challenges)


def _picking(g: Game) -> Challenge:
    """The challenger whose turn it is to mark a slot."""
    current = next((c for c in g.challenges if not c.locked), None)
    _require(current is not None, "There is nothing to pick right now")
    assert current is not None
    return current


def _settle_window(g: Game) -> None:
    """Close the window early once nobody is left who could still challenge."""
    for player in g.players:
        decided = (
            player.id == g.active
            or player.id in g.passed
            or any(c.player == player.id for c in g.challenges)
        )
        if not decided and _can_challenge(g, player.id) and _room_for_challenge(g):
            return
    _close_window(g)


def _close_window(g: Game) -> None:
    if g.challenges:
        g.phase = "picking"
    else:
        _reveal(g)


def _settle_picks(g: Game) -> None:
    if all(c.locked for c in g.challenges):
        _reveal(g)


def _reveal(g: Game) -> None:
    active = _player(g, g.active)
    assert g.slot is not None
    g.challenges = [c for c in g.challenges if c.locked]
    card_to: str | None = None
    correct = fits(active.timeline, g.slot, g.card.year)
    if correct:
        active.timeline.insert(g.slot, g.card)
        card_to = active.id
    else:
        for challenge in g.challenges:
            assert challenge.slot is not None
            if fits(active.timeline, challenge.slot, g.card.year):
                _insert_in_order(_player(g, challenge.player).timeline, g.card)
                card_to = challenge.player
                break
    g.outcome = Outcome(correct, card_to)
    g.phase = "revealed"
    _check_win(g)


def _check_win(g: Game) -> None:
    winners = [p.id for p in g.players if len(p.timeline) >= g.rules.cards_to_win]
    if winners:
        g.winners = winners
        g.phase = "finished"


def _next_turn(g: Game) -> None:
    if not g.deck:
        # Out of cards: most cards wins, tokens break a tie, and a full tie is shared.
        best = max((len(p.timeline), p.tokens) for p in g.players)
        g.winners = [p.id for p in g.players if (len(p.timeline), p.tokens) == best]
        g.phase = "finished"
        return
    order = [p.id for p in g.players]
    g.active = order[(order.index(g.active) + 1) % len(order)]
    g.card = g.deck.pop(0)
    g.phase = "placing"
    g.turn_number += 1
    g.draws += 1
    g.slot = None
    g.challenges = []
    g.passed = []
    g.outcome = None
    g.named = None
