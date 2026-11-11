import copy
from itertools import count

import pytest

from jamster import engine as e
from jamster.models import Card

_ids = count()


def card(year: int) -> Card:
    return Card(
        track_id=f"t{next(_ids)}",
        uri="spotify:track:x",
        name=f"Song from {year}",
        artists=("Artist",),
        year=year,
        year_source="spotify",
        image_url=None,
        known_by=(),
    )


def game(*years: int, players: str = "ab", **rules: int) -> e.Game:
    """Players get the first years as starting cards; the next year is the card in play."""
    return e.new_game(list(players), [card(y) for y in years], e.Rules(**rules))


def play(g: e.Game, *actions: e.Action) -> e.Game:
    for action in actions:
        g = e.apply(g, action)
    return g


def years(g: e.Game, player: str) -> list[int]:
    return [c.year for c in next(p for p in g.players if p.id == player).timeline]


def tokens(g: e.Game, player: str) -> int:
    return next(p for p in g.players if p.id == player).tokens


def test_deal():
    g = game(1980, 1990, 2000, 2010)
    assert years(g, "a") == [1980] and years(g, "b") == [1990]
    assert (g.active, g.card.year, g.phase, len(g.deck)) == ("a", 2000, "placing", 1)


def test_deck_must_cover_starting_cards_and_one_turn():
    with pytest.raises(e.RuleError):
        game(1980, 1990)


@pytest.mark.parametrize(
    ("slot", "year", "expected"),
    [(0, 1970, True), (0, 1985, False), (1, 1985, True), (2, 1985, False), (2, 1995, True)]
    + [(0, 1980, True), (1, 1980, True), (1, 1990, True), (2, 1990, True)],  # equal years
)
def test_fits(slot: int, year: int, expected: bool):
    assert e.fits([card(1980), card(1990)], slot, year) is expected


def test_correct_placement_keeps_the_card():
    g = play(game(1980, 1990, 2000, 2010), e.Place("a", 1), e.Lock("a"))
    assert g.phase == "challenging"
    g = play(g, e.Pass("b"))
    assert g.phase == "revealed" and g.outcome == e.Outcome(True, "a")
    assert years(g, "a") == [1980, 2000]


def test_wrong_placement_discards_the_card():
    g = play(game(1980, 1990, 2000, 2010), e.Place("a", 0), e.Lock("a"), e.Pass("b"))
    assert g.outcome == e.Outcome(False, None)
    assert years(g, "a") == [1980] and years(g, "b") == [1990]


def test_placement_can_change_until_locked():
    g = play(game(1980, 1990, 2000, 2010), e.Place("a", 0), e.Place("a", 1))
    assert g.slot == 1
    with pytest.raises(e.RuleError):
        play(g, e.Lock("a"), e.Place("a", 0))


def test_only_the_active_player_places():
    with pytest.raises(e.RuleError):
        play(game(1980, 1990, 2000, 2010), e.Place("b", 0))


def challenge(g: e.Game, player: str, slot: int) -> e.Game:
    return play(g, e.PickSlot(player, slot), e.LockPick(player))


def test_right_challenge_steals_the_card_into_the_challengers_timeline():
    g = play(game(1980, 1990, 1985, 2010), e.Place("a", 0), e.Lock("a"), e.Buzz("b"))
    assert g.phase == "picking", "b was the only one who could challenge"
    g = challenge(g, "b", 1)
    assert g.outcome == e.Outcome(False, "b")
    assert years(g, "a") == [1980] and years(g, "b") == [1985, 1990]
    assert tokens(g, "b") == 1


def test_challenging_a_correct_placement_only_costs_the_token():
    g = play(game(1980, 1990, 2000, 2010), e.Place("a", 1), e.Lock("a"), e.Buzz("b"))
    g = challenge(g, "b", 0)
    assert g.outcome == e.Outcome(True, "a")
    assert years(g, "b") == [1990] and tokens(g, "b") == 1


def test_marking_a_slot_reveals_nothing_until_it_is_locked_in():
    g = play(game(1980, 1990, 1985, 2010), e.Place("a", 0), e.Lock("a"), e.Buzz("b"))
    g = play(g, e.PickSlot("b", 1))
    assert (g.phase, g.outcome, tokens(g, "b")) == ("picking", None, 2)
    with pytest.raises(e.RuleError, match="taken"):
        play(g, e.PickSlot("b", 0))  # the active player's slot
    g = play(g, e.PickSlot("b", 1))  # marking the same slot again is fine
    with pytest.raises(e.RuleError, match="Mark a slot"):
        play(
            game(1980, 1990, 1985, 2010), e.Place("a", 0), e.Lock("a"), e.Buzz("b"), e.LockPick("b")
        )


def three_player_challenge(card_year: int) -> e.Game:
    """a has [1980, 1990] and has wrongly put the card first; b challenged before c."""
    g = game(1980, 2001, 2002, card_year, 2010, players="abc")
    g.players[0].timeline.append(card(1990))
    return play(g, e.Place("a", 0), e.Lock("a"), e.Buzz("b"), e.Buzz("c"))


def test_challengers_pick_in_challenge_order():
    g = three_player_challenge(1985)
    assert g.phase == "picking", "the window closes once everyone has decided"
    with pytest.raises(e.RuleError, match="not your pick"):
        play(g, e.PickSlot("c", 1))
    g = challenge(g, "b", 2)
    with pytest.raises(e.RuleError, match="not your pick"):
        play(g, e.PickSlot("b", 1))
    g = challenge(g, "c", 1)
    assert g.outcome == e.Outcome(False, "c")
    assert tokens(g, "b") == 1 and tokens(g, "c") == 1


def test_first_challenger_wins_when_two_challenges_are_right():
    g = challenge(challenge(three_player_challenge(1990), "b", 2), "c", 1)
    assert g.outcome == e.Outcome(False, "b")


def test_a_slot_can_only_be_marked_once():
    g = challenge(three_player_challenge(1985), "b", 1)
    with pytest.raises(e.RuleError, match="taken"):
        play(g, e.PickSlot("c", 1))


def test_no_challenge_once_every_slot_is_spoken_for():
    g = play(game(1980, 2001, 2002, 1970, 2010, players="abc"), e.Place("a", 1), e.Lock("a"))
    g = play(g, e.Buzz("b"))  # slot 0 is the only free one
    assert g.phase == "picking", "c cannot challenge any more, so the window closes"
    with pytest.raises(e.RuleError, match="over"):
        play(g, e.Buzz("c"))


def test_the_window_stays_open_until_everyone_decided_or_time_is_up():
    g = game(1980, 2001, 2002, 1985, 2010, players="abc")
    g.players[0].timeline.append(card(1990))  # three slots: room for a and two challengers
    g = play(g, e.Place("a", 0), e.Lock("a"), e.Buzz("b"))
    assert g.phase == "challenging", "c may still challenge"
    assert play(g, e.CloseWindow()).phase == "picking"
    timed_out = play(game(1980, 1990, 2000, 2010), e.Place("a", 1), e.Lock("a"), e.CloseWindow())
    assert timed_out.phase == "revealed" and timed_out.outcome == e.Outcome(True, "a")
    with pytest.raises(e.RuleError, match="over"):
        play(timed_out, e.CloseWindow())


def test_passing_is_final_and_buzzing_needs_a_token():
    g = play(game(1980, 2001, 2002, 1985, 2010, players="abc"), e.Place("a", 0), e.Lock("a"))
    with pytest.raises(e.RuleError, match="passed"):
        play(g, e.Pass("b"), e.Buzz("b"))
    g.players[1].tokens = 0
    with pytest.raises(e.RuleError, match="tokens"):
        play(g, e.Buzz("b"))


def test_lock_reveals_at_once_when_nobody_can_challenge():
    g = play(game(1980, 1990, 2000, 2010, starting_tokens=0), e.Place("a", 1), e.Lock("a"))
    assert g.phase == "revealed"


def test_forced_reveal_drops_unlocked_challenges_for_free():
    g = play(game(1980, 1990, 2000, 2010), e.Place("a", 1), e.Lock("a"), e.Buzz("b"))
    g = play(g, e.PickSlot("b", 0), e.Reveal())
    assert g.phase == "revealed" and g.challenges == [] and tokens(g, "b") == 2


def test_naming_the_song_earns_a_token_up_to_the_maximum():
    revealed = play(game(1980, 1990, 2000, 2010, 2020), e.Place("a", 0), e.Lock("a"), e.Pass("b"))
    g = play(revealed, e.SetNamed(True), e.NextTurn())
    assert tokens(g, "a") == 3  # earned even though the placement was wrong
    assert (g.active, g.card.year, g.phase, g.turn_number, g.draws) == ("b", 2010, "placing", 2, 2)
    assert (g.slot, g.challenges, g.passed, g.outcome, g.named) == (None, [], [], None, None)

    assert tokens(play(revealed, e.SetNamed(True), e.SetNamed(False), e.NextTurn()), "a") == 2
    revealed.players[0].tokens = 5
    assert tokens(play(revealed, e.SetNamed(True), e.NextTurn()), "a") == 5


def test_skip_costs_a_token_and_changes_the_song():
    g = play(game(1980, 1990, 2000, 2010), e.Place("a", 0), e.Skip("a"))
    assert (g.card.year, g.slot, g.draws, tokens(g, "a")) == (2010, None, 2, 1)
    g.players[0].tokens = 0
    with pytest.raises(e.RuleError, match="tokens"):
        play(g, e.Skip("a"))


def test_buying_a_card():
    g = game(1980, 1990, 2000, 1970, 2010, starting_tokens=3)
    with pytest.raises(e.RuleError, match="Finish your turn"):
        play(g, e.Buy("a"))
    g = play(g, e.Buy("b"))  # others may buy at any time
    assert years(g, "b") == [1970, 1990] and tokens(g, "b") == 0
    assert g.card.year == 2000 and g.draws == 1  # the song in play is untouched
    g = play(g, e.Place("a", 1), e.Lock("a"))  # b has no tokens left to challenge
    g = play(g, e.Buy("a"))
    assert years(g, "a") == [1980, 2000, 2010]


def test_buying_away_the_tokens_cancels_a_pending_challenge():
    g = game(1980, 1990, 2000, 2010, 2020, starting_tokens=3)
    g = play(g, e.Place("a", 1), e.Lock("a"), e.Buzz("b"), e.Buy("b"))
    assert g.phase == "revealed" and g.challenges == []


def test_reaching_the_target_wins():
    g = play(game(1980, 1990, 2000, 2010, cards_to_win=2), e.Place("a", 1), e.Lock("a"))
    g = play(g, e.Pass("b"))
    assert g.phase == "finished" and g.winners == ["a"]
    with pytest.raises(e.RuleError, match="over"):
        play(g, e.NextTurn())


def test_an_empty_deck_ends_the_game_on_cards_then_tokens():
    g = play(game(1980, 1990, 2000), e.Place("a", 1), e.Lock("a"), e.Pass("b"), e.NextTurn())
    assert g.phase == "finished" and g.winners == ["a"]

    tie = play(game(1980, 1990, 2000), e.Place("a", 0), e.Lock("a"), e.Pass("b"), e.NextTurn())
    assert tie.winners == ["a", "b"]


def test_apply_never_changes_its_input():
    g = game(1980, 1990, 2000, 2010)
    before = copy.deepcopy(g)
    e.apply(g, e.Place("a", 1))
    with pytest.raises(e.RuleError):
        e.apply(g, e.Lock("a"))
    assert g == before
