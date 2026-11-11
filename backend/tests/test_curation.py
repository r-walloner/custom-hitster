import random

from jamster.curation import STRATEGIES, TasteProfile, majority
from jamster.models import Signal, Track


def profile(player: str, *track_ids: str) -> TasteProfile:
    saved = (Signal("saved", 1),)
    return TasteProfile(player, player.title(), dict.fromkeys(track_ids, saved), {})


def catalog(*track_ids: str) -> dict[str, Track]:
    return {t: Track(t, f"spotify:track:{t}", t, (), "", None, "2000", None) for t in track_ids}


def test_majority_prefers_widely_known_tracks_and_fills_up_with_the_rest():
    profiles = [
        profile("ann", "all", "two", "one"),
        profile("ben", "all", "two"),
        profile("cy", "all"),
    ]
    picked = majority(profiles, catalog("all", "two", "one"), 10, random.Random(0))
    assert [(c.track_id, c.reason) for c in picked] == [
        ("all", "majority"),
        ("two", "majority"),  # 2 of 3 players is at least 65 %
        ("one", "fill"),
    ]
    assert picked[1].known_by == ("ann", "ben")


def test_majority_respects_the_size_and_the_catalog():
    profiles = [profile("ann", "a", "b", "c", "gone")]
    picked = majority(profiles, catalog("a", "b", "c"), 2, random.Random(0))
    assert len(picked) == 2 and "gone" not in {c.track_id for c in picked}


def test_default_strategy_is_registered():
    assert STRATEGIES["majority"] is majority
