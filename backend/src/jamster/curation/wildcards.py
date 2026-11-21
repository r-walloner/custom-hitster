"""Wildcards: the deep cuts. Songs only one library has and its player barely knows, by
artists nobody else knows, spread evenly over the years."""

import random
from dataclasses import dataclass, field
from typing import ClassVar

from .base import Candidate, CurationStrategy, Pool
from .songs import Knowledge, Ranking, Selection, Weights, cap_of, fill, ranked, year_quotas


@dataclass(frozen=True)
class Wildcards(CurationStrategy):
    key: ClassVar[str] = "wildcards"
    name: ClassVar[str] = "Wildcards"

    weights: Weights = field(default_factory=Weights)
    lone_bonus: float = 0.3  # the only song by its artist in that library
    stranger_bonus: float = 0.3  # nobody else knows the song or its artist at all
    year_power: float = 0.0  # flat
    year_span: int = 5
    artist_cap: float = 0.03
    jitter: float = 0.15

    def curate(self, pool: Pool, size: int, rng: random.Random) -> list[Candidate]:
        k = Knowledge.of(pool, self.weights)
        alone = [i for i in range(len(k.songs)) if len(k.owners(i)) == 1]
        quotas = year_quotas(
            [k.songs[i].year for i in alone], size, self.year_power, self.year_span, rng
        )
        selection = Selection(self.key, k, quotas, self.year_span, cap_of(self.artist_cap, size))
        rankings: list[Ranking] = []
        for p in k.libraries():
            scored = []
            for i in alone:
                if not k.direct[p][i]:
                    continue
                song = k.songs[i]
                lone = max((k.depths[p][a] for a in song.artist_ids), default=0) <= 1
                stranger = k.best_other(i, p) == 0
                score = 1 - k.scores[p][i] + self.lone_bonus * lone + self.stranger_bonus * stranger
                scored.append((i, score))
            rankings.append((p, ranked(scored, rng, self.jitter)))
        fill(selection, rankings, size, "wildcard")
        return selection.picked
