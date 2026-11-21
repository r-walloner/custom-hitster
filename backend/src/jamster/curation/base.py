"""The Strategy interface of deck curation, and what every strategy gets to work with.

A strategy is a `CurationStrategy` subclass: a dataclass whose fields are its tunable
parameters, with one method, `curate`. `deck.curate` is the context that picks one by key
and runs it. Strategies stay pure: no network, no database, no clock, and no year lookups.
They go by the years the database already knows, else Spotify's release year.

Spotify's developer policy forbids feeding Spotify data into an ML model or an LLM.
"""

import random
from abc import ABC, abstractmethod
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import ClassVar

from ..models import Signal, Track, Why


@dataclass(frozen=True, slots=True)
class TasteProfile:
    """Everything imported about one player."""

    player_id: str
    name: str
    tracks: Mapping[str, tuple[Signal, ...]]  # track id -> signals
    artists: Mapping[str, tuple[Signal, ...]]  # artist id -> top-artist signals (value: rank)


@dataclass(frozen=True, slots=True)
class Classic:
    """A song from the classics list, matched to a Spotify track, with the list's year."""

    track: Track
    year: int


@dataclass(frozen=True, slots=True)
class Pool:
    """What a strategy may choose from."""

    profiles: Sequence[TasteProfile]
    catalog: Mapping[str, Track]  # every track in some profile, plus the classics' tracks
    years: Mapping[str, int]  # track id -> year, as far as the database knows it already
    classics: Sequence[Classic] = ()
    this_year: int | None = None  # songs from later years are left out


@dataclass(frozen=True, slots=True)
class Candidate:
    track_id: str
    known_by: tuple[str, ...]  # player ids with a signal for the song, the owner first
    why: Why


class CurationStrategy(ABC):
    """Picks the songs of a deck."""

    key: ClassVar[str]  # how settings and STRATEGIES name it
    name: ClassVar[str]  # how people call it

    @abstractmethod
    def curate(self, pool: Pool, size: int, rng: random.Random) -> list[Candidate]:
        """Up to `size` candidates from `pool`, in the order they were picked."""

    @abstractmethod
    def rules(self, size: int) -> list[str]:
        """How a deck of `size` is picked, one rule per item, for the people reading a deck
        report. Name the parameters' current values; `songs.common_rules` has the shared ones."""

    @abstractmethod
    def scores(self) -> dict[str, str]:
        """Per reason (core, signature, wildcard, classic): which songs qualify and what the
        score means, for the people reading a deck report."""
