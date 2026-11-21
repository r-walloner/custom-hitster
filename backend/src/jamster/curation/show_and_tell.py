"""Show & Tell: every library brings an equal share of the songs that are most its own, the
ones its player knows well and the others hardly know."""

import random
from dataclasses import dataclass, field
from typing import ClassVar

from .base import Candidate, CurationStrategy, Pool
from .songs import (
    Knowledge,
    Ranking,
    Selection,
    Weights,
    cap_of,
    common_rules,
    fill,
    jitter,
    year_quotas,
)


@dataclass(frozen=True)
class ShowAndTell(CurationStrategy):
    key: ClassVar[str] = "show_and_tell"
    name: ClassVar[str] = "Show & Tell"

    weights: Weights = field(default_factory=Weights)
    others_weight: float = 0.7  # how much the others knowing a song counts against it
    own_min: float = 0.5  # songs the owner knows at least this well come first
    year_power: float = 0.5
    year_span: int = 5
    artist_cap: float = 0.05
    jitter: float = 0.1

    def curate(self, pool: Pool, size: int, rng: random.Random) -> list[Candidate]:
        k = Knowledge.of(pool, self.weights)
        libraries = k.libraries()
        in_library = [i for i in range(len(k.songs)) if k.owners(i)]
        quotas = year_quotas(
            [k.songs[i].year for i in in_library], size, self.year_power, self.year_span, rng
        )
        selection = Selection(self.key, k, quotas, self.year_span, cap_of(self.artist_cap, size))
        rankings: list[Ranking] = []
        for p in libraries:
            keyed = []
            for i in in_library:
                if not k.direct[p][i]:
                    continue
                own = k.scores[p][i]
                score = own - self.others_weight * k.best_other(i, p)
                keyed.append((own >= self.own_min, jitter(score, rng, self.jitter), i, score))
            keyed.sort(key=lambda x: (not x[0], -x[1], x[2]))
            rankings.append((p, [(i, score) for _, _, i, score in keyed]))
        fill(selection, rankings, size, "core")
        return selection.picked

    def rules(self, size: int) -> list[str]:
        return [
            f"**Core**, all {size} songs: every library in turn brings the songs that are most "
            f"its own. Songs its player knows at least {self.own_min:g} come first, best score "
            "first, then the rest.",
            *common_rules(
                size=size,
                year_power=self.year_power,
                year_span=self.year_span,
                artist_cap=self.artist_cap,
                jitter=self.jitter,
            ),
        ]

    def scores(self) -> dict[str, str]:
        return {
            "core": (
                "Any song in the owner's library. Score: how much it is the owner's own, their "
                f"familiarity minus {self.others_weight:g} × the best familiarity of anyone "
                "else. Up to 1 when the owner knows it well and nobody else does; below 0 when "
                "others know it better."
            ),
        }
