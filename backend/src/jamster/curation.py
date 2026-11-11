"""Chooses which songs go into a group's deck.

A strategy is a function with the signature of `Strategy`. Register it in STRATEGIES and it
shows up in the lobby settings. Strategies stay pure: no network, no database.

Spotify's developer policy forbids feeding Spotify data into an ML model or an LLM.
"""

import math
import random
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Protocol

from .models import Signal, Track


@dataclass(frozen=True, slots=True)
class TasteProfile:
    """Everything imported about one player."""

    player_id: str
    name: str
    tracks: Mapping[str, tuple[Signal, ...]]  # track id -> signals
    artists: Mapping[str, tuple[Signal, ...]]  # artist id -> top-artist signals


@dataclass(frozen=True, slots=True)
class Candidate:
    track_id: str
    known_by: tuple[str, ...]  # player ids
    reason: str  # why the strategy picked it, for debugging a deck


class Strategy(Protocol):
    def __call__(
        self,
        profiles: Sequence[TasteProfile],
        catalog: Mapping[str, Track],
        size: int,
        rng: random.Random,
    ) -> list[Candidate]:
        """Up to `size` candidates from `catalog`, best first."""
        ...


def majority(
    profiles: Sequence[TasteProfile],
    catalog: Mapping[str, Track],
    size: int,
    rng: random.Random,
    *,
    share: float = 0.65,
) -> list[Candidate]:
    """Tracks that at least `share` of the players have any signal for, then the next-best known.

    TODO: this is the placeholder. A real strategy should weigh the signal kinds into a "knows it
    well" score, merge remasters and duplicates of one song, and spread the deck across decades.
    """
    needed = max(1, math.ceil(share * len(profiles)))
    known_by: dict[str, list[str]] = {}
    for profile in profiles:
        for track_id in profile.tracks:
            if track_id in catalog:
                known_by.setdefault(track_id, []).append(profile.player_id)
    ids = list(known_by)
    rng.shuffle(ids)
    ids.sort(key=lambda t: len(known_by[t]), reverse=True)  # stable: random within a count
    return [
        Candidate(t, tuple(known_by[t]), "majority" if len(known_by[t]) >= needed else "fill")
        for t in ids[:size]
    ]


STRATEGIES: dict[str, Strategy] = {"majority": majority}
