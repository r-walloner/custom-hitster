"""Balanced: songs the group knows, a fair share for every library, the years spread out,
a few signature songs of one player, and classics where the libraries leave decades thin."""

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
    ranked,
    year_quotas,
)


@dataclass(frozen=True)
class Balanced(CurationStrategy):
    key: ClassVar[str] = "balanced"
    name: ClassVar[str] = "Balanced"

    weights: Weights = field(default_factory=Weights)
    classics_share: float = 0.10
    signature_share: float = 0.10
    year_power: float = 0.5  # 1: years as the players listen, 0.5: square root, 0: flat
    year_span: int = 5  # years per quota
    breadth_bonus: float = 0.5  # added for each further player who knows a song
    knows: float = 0.3  # the familiarity that counts as knowing a song, for the bonus
    signature_own: float = 0.6  # a signature song's owner knows it at least this well,
    signature_others: float = 0.2  # and everyone else less than this
    artist_cap: float = 0.05  # the most of a deck one artist may fill, unless songs run out
    jitter: float = 0.15
    first_decade: int = 1950  # the decades classics fill, from this one to the current one

    def curate(self, pool: Pool, size: int, rng: random.Random) -> list[Candidate]:
        k = Knowledge.of(pool, self.weights)
        libraries = k.libraries()
        players = range(len(k.profiles))
        in_library = [i for i in range(len(k.songs)) if any(k.direct[p][i] for p in players)]
        mine = set(in_library)
        classics = [i for i, s in enumerate(k.songs) if s.classic and i not in mine]

        def group(i: int) -> float:
            knowing = sum(k.scores[p][i] >= self.knows for p in players)
            return sum(k.scores[p][i] for p in players) + self.breadth_bonus * max(0, knowing - 1)

        n_classics = min(round(self.classics_share * size), len(classics))
        n_library = size - n_classics
        n_signature = round(self.signature_share * size)
        quotas = year_quotas(
            [k.songs[i].year for i in in_library], n_library, self.year_power, self.year_span, rng
        )
        selection = Selection(self.key, k, quotas, self.year_span, cap_of(self.artist_cap, size))

        core: list[Ranking] = [
            (p, ranked([(i, group(i)) for i in in_library if k.direct[p][i]], rng, self.jitter))
            for p in libraries
        ]
        fill(selection, core, n_library - n_signature, "core")

        signature: list[Ranking] = []
        for p in libraries:
            scored = [
                (i, k.scores[p][i] - k.best_other(i, p))
                for i in in_library
                if k.direct[p][i]
                and len(k.owners(i)) == 1
                and k.scores[p][i] >= self.signature_own
                and k.best_other(i, p) < self.signature_others
            ]
            signature.append((p, ranked(scored, rng, self.jitter)))
        fill(selection, signature, n_signature, "signature")
        fill(selection, core, n_library - len(selection.picked), "core")  # too few signatures

        self._add_classics(selection, classics, size, pool.this_year, rng)
        return selection.picked

    def rules(self, size: int) -> list[str]:
        classics = round(self.classics_share * size)
        signature = round(self.signature_share * size)
        return [
            f"**Core**, {size - classics - signature} songs: from the players' libraries, the "
            "songs the group knows best, the libraries taking turns.",
            f"**Signature**, {signature} songs: one player's own, the songs only their library "
            "has and they know well. If there are too few, core songs take their place.",
            f"**Classics**, {classics} songs: well-known songs from the classics list that no "
            "library has, each from a decade drawn by how far the deck falls short of an even "
            f"share there, from the {self.first_decade}s to now. With too few classics, core "
            "songs take their place; with too few library songs, more classics do.",
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
                "Any song in a library. Score: how well the group knows it, every player's "
                f"familiarity added up, plus {self.breadth_bonus:g} for each further player "
                f"who knows it at least {self.knows:g}. With 3 players who all know it fully, "
                f"that is 3 + 2 × {self.breadth_bonus:g} = {3 + 2 * self.breadth_bonus:g}."
            ),
            "signature": (
                "A song only one library has, which its player knows at least "
                f"{self.signature_own:g} and everyone else less than {self.signature_others:g}. "
                "Score: the owner's familiarity minus the best familiarity of anyone else, "
                "from 0 to 1; near 1, only the owner knows it, and well."
            ),
            "classic": (
                "A song from the classics list that no library has. Score: how many songs its "
                "decade was short of an even share of the deck when it was picked; the higher, "
                "the thinner the libraries left that decade, and the next classic from the "
                "same decade scores 1 less."
            ),
        }

    def _add_classics(
        self,
        selection: Selection,
        classics: list[int],
        size: int,
        this_year: int | None,
        rng: random.Random,
    ) -> None:
        """Fill the deck up with classics, each from a decade picked by how far the deck falls
        short of an even spread there."""
        songs = selection.knowledge.songs
        last = max([this_year or 0, *(songs[i].year for i in classics)]) // 10 * 10
        decades = list(range(self.first_decade, last + 10, 10))
        if not decades:
            return
        have = {d: 0 for d in decades}
        for c in selection.picked:
            decade = c.why.year // 10 * 10
            if decade in have:
                have[decade] += 1
        left = {d: [i for i in classics if songs[i].year // 10 * 10 == d] for d in decades}
        target = size / len(decades)
        while len(selection.picked) < size:
            open_decades = [d for d in decades if left[d]]
            if not open_decades:
                return
            gaps = [max(0.0, target - have[d]) for d in open_decades]
            if not any(gaps):
                gaps = [1.0] * len(open_decades)
            decade = rng.choices(open_decades, weights=gaps)[0]
            i = left[decade].pop(rng.randrange(len(left[decade])))
            selection.take(i, "classic", None, target - have[decade])
            have[decade] += 1
