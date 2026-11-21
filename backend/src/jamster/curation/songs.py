"""The building blocks the strategies share: songs merged from tracks, how well each player
knows each song, year quotas, and the round-robin fill that keeps libraries equal.

All pure: the randomness comes in through the `rng` the caller passes.
"""

import math
import random
import re
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field

from ..models import Knower, Track, Why
from .base import Candidate, Pool, TasteProfile

EARLIEST = 1900  # dates before this are placeholders

# --- songs -----------------------------------------------------------------------------------

# Title tags that name a release of a song rather than another version of it. Remixes, live
# and acoustic versions keep their tags, so they stay songs of their own.
_RELEASE_TAG = re.compile(
    r"^(?:"
    r"(?:\d{4} )?(?:digital(?:ly)? )?remaster(?:ed)?(?: \d{4})?(?: version| edition)?"
    r"|radio edit|single version|album version|original mix|original version"
    r"|mono(?: version)?|stereo(?: version)?"
    r"|(?:feat|ft|featuring|with)\b.*"
    r")$"
)
_BRACKETS = re.compile(r"[(\[]([^)\]]*)[)\]]")


def _clean(text: str) -> str:
    kept = "".join(c if c.isalnum() else " " for c in text.lower())
    return " ".join(kept.split())


def normalize(title: str) -> str:
    """A title without the tags of a mere re-release: "Song - Remastered 2011" and
    "Song (feat. X)" become "song", while "Song - X Remix" stays "song x remix"."""
    tags: list[str] = []

    def lift(match: re.Match[str]) -> str:
        tags.append(match[1])
        return " "

    base, *rest = _BRACKETS.sub(lift, title.lower()).split(" - ")
    kept = [base, *(t for t in (*rest, *tags) if not _RELEASE_TAG.match(_clean(t)))]
    return " ".join(c for c in map(_clean, kept) if c)


def year_of(date: str | None) -> int | None:
    try:
        return int((date or "")[:4])
    except ValueError:
        return None


@dataclass(frozen=True, slots=True)
class Song:
    """One song, however many Spotify tracks it came as."""

    track: Track  # the one to play
    track_ids: tuple[str, ...]
    artist_ids: frozenset[str]  # every credited artist of every track
    year: int
    year_source: str  # list | cached | spotify
    classic: bool  # on the classics list

    @property
    def main_artist(self) -> str | None:
        return self.track.artists[0].id if self.track.artists else None


def merge(pool: Pool) -> list[Song]:
    """The pool's tracks grouped into songs: the same ISRC, or the same title (without release
    tags) by the same main artist. Songs without a plausible year are left out."""
    ids = sorted(pool.catalog)
    parent = {t: t for t in ids}

    def root(t: str) -> str:
        while parent[t] != t:
            parent[t] = parent[parent[t]]
            t = parent[t]
        return t

    first: dict[tuple[str, ...], str] = {}
    for t in ids:
        track = pool.catalog[t]
        keys: list[tuple[str, ...]] = []
        if track.isrc:
            keys.append(("isrc", track.isrc.upper()))
        if track.artists:
            keys.append(("title", normalize(track.name), track.artists[0].id))
        for key in keys:
            if key in first:
                parent[root(t)] = root(first[key])
            else:
                first[key] = t

    groups: dict[str, list[str]] = {}
    for t in ids:
        groups.setdefault(root(t), []).append(t)

    listed = {c.track.id: c.year for c in pool.classics}
    latest = pool.this_year or 9999
    songs: list[Song] = []
    sources = {
        "list": lambda t: listed.get(t),
        "cached": lambda t: pool.years.get(t),
        "spotify": lambda t: year_of(pool.catalog[t].release_date),
    }
    for members in groups.values():
        # An earlier source beats any year from a later one: the classics list is checked by
        # hand, a cached year came from MusicBrainz, and Spotify's is often a remaster's.
        # Within a source, the earliest year wins.
        best: tuple[str, int, str] | None = None
        for source, year_for in sources.items():
            found = [
                (year, t)
                for t in members
                if (year := year_for(t)) is not None and EARLIEST <= year <= latest
            ]
            if found:
                best = (source, *min(found))
                break
        if best is None:
            continue
        source, year, rep = best
        songs.append(
            Song(
                track=pool.catalog[rep],
                track_ids=tuple(members),
                artist_ids=frozenset(a.id for t in members for a in pool.catalog[t].artists),
                year=year,
                year_source=source,
                classic=any(t in listed for t in members),
            )
        )
    songs.sort(key=lambda s: s.track.id)
    return songs


# --- familiarity -----------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Weights:
    """How much each piece of evidence says about knowing a song, from 0 to 1. The pieces
    combine as a noisy-OR, 1 - Π(1 - w), so every further piece raises the score a little and
    none takes it past 1. A top list's weight falls from its value at rank 1 to `rank_floor`
    times that at rank 50.

    Tuned on 2026-11-21 against one real library (2,700 liked songs, 160 playlists) with
    `python -m jamster.curation --report familiarity`. The library's own songs then spread
    over 0.34 (10th percentile), 0.56 (median), 0.78 (90th), 0.83 (95th) and 1.00; split three
    ways (`--split 3`), the songs a player knows only through the artist score 0.06, 0.16,
    0.35, 0.40 and 0.45. Retune once several real libraries are in.
    """

    top_long: float = 0.85
    top_medium: float = 0.75
    top_short: float = 0.6
    rank_floor: float = 0.6
    saved: float = 0.35
    playlist: float = 0.3  # for each playlist it is in
    recent: float = 0.2  # played once lately
    recent_more: float = 0.1  # for each further play
    recent_max: float = 0.5
    artist_top_long: float = 0.25  # only the artist's best top list counts
    artist_top_medium: float = 0.2
    artist_top_short: float = 0.15
    artist_depth: float = 0.3  # the library's other songs by the artist, at `depth_full` of them
    depth_full: int = 30


_TOP_KINDS = ("top_long", "top_medium", "top_short")


def _by_rank(best: float, rank: int, floor: float) -> float:
    return best * (1 - (1 - floor) * (min(max(rank, 1), 50) - 1) / 49)


def artist_depth(profile: TasteProfile, songs: Sequence[Song]) -> Counter[str]:
    """How many of the profile's songs each artist is credited on."""
    depth: Counter[str] = Counter()
    for song in songs:
        if any(t in profile.tracks for t in song.track_ids):
            depth.update(song.artist_ids)
    return depth


def familiarity(
    profile: TasteProfile, song: Song, depth: Counter[str], w: Weights
) -> tuple[float, tuple[str, ...]]:
    """How well the player knows the song, from 0 to 1, and the evidence, in words."""
    ranks: dict[str, int] = {}
    saved, playlists, plays = False, 0, 0
    for t in song.track_ids:
        for signal in profile.tracks.get(t, ()):
            if signal.kind in _TOP_KINDS:
                ranks[signal.kind] = min(ranks.get(signal.kind, 99), signal.value)
            elif signal.kind == "saved":
                saved = True
            elif signal.kind == "playlist":
                playlists += signal.value
            elif signal.kind == "recent":
                plays += signal.value
    direct = bool(ranks or saved or playlists or plays)

    pieces: list[tuple[float, str]] = []
    for kind in _TOP_KINDS:
        if kind in ranks:
            pieces.append(
                (_by_rank(getattr(w, kind), ranks[kind], w.rank_floor), f"{kind} #{ranks[kind]}")
            )
    if saved:
        pieces.append((w.saved, "saved"))
    for _ in range(playlists):
        pieces.append((w.playlist, f"playlists ×{playlists}"))
    if plays:
        weight = min(w.recent_max, w.recent + w.recent_more * (plays - 1))
        pieces.append((weight, f"recent ×{plays}"))

    artist_best: tuple[float, str] | None = None
    for a in song.artist_ids:
        for signal in profile.artists.get(a, ()):
            weight = getattr(w, f"artist_{signal.kind}", 0.0)
            weight = _by_rank(weight, signal.value, w.rank_floor)
            label = f"top artist ({signal.kind.removeprefix('top_')} #{signal.value})"
            if artist_best is None or weight > artist_best[0]:
                artist_best = (weight, label)
    if artist_best:
        pieces.append(artist_best)
    others = max((depth[a] for a in song.artist_ids), default=0) - (1 if direct else 0)
    if others > 0:
        weight = w.artist_depth * min(1.0, math.log1p(others) / math.log1p(w.depth_full))
        pieces.append((weight, f"artist: {others} other song{'s' if others > 1 else ''}"))

    unknown = 1.0
    for weight, _ in pieces:
        unknown *= 1 - min(max(weight, 0.0), 1.0)
    labels = tuple(dict.fromkeys(label for _, label in pieces))
    return 1 - unknown, labels


@dataclass(slots=True)
class Knowledge:
    """Every player's familiarity with every song of a pool."""

    songs: list[Song]
    profiles: Sequence[TasteProfile]
    scores: list[list[float]]  # [player][song]
    evidence: list[list[tuple[str, ...]]]
    direct: list[list[bool]]  # [player][song]: the song is in the player's library
    depths: list[Counter[str]]

    @classmethod
    def of(cls, pool: Pool, weights: Weights) -> Knowledge:
        songs = merge(pool)
        scores, evidence, direct, depths = [], [], [], []
        for profile in pool.profiles:
            depth = artist_depth(profile, songs)
            pairs = [familiarity(profile, s, depth, weights) for s in songs]
            scores.append([p[0] for p in pairs])
            evidence.append([p[1] for p in pairs])
            direct.append([any(t in profile.tracks for t in s.track_ids) for s in songs])
            depths.append(depth)
        return cls(songs, pool.profiles, scores, evidence, direct, depths)

    def libraries(self) -> list[int]:
        """The players with at least one song."""
        return [p for p in range(len(self.profiles)) if any(self.direct[p])]

    def owners(self, i: int) -> list[int]:
        return [p for p in range(len(self.profiles)) if self.direct[p][i]]

    def best_other(self, i: int, p: int) -> float:
        return max((s[i] for q, s in enumerate(self.scores) if q != p), default=0.0)

    def knowers(self, i: int) -> tuple[Knower, ...]:
        found = [
            Knower(self.profiles[p].name, self.scores[p][i], self.evidence[p][i])
            for p in range(len(self.profiles))
            if self.scores[p][i] > 0
        ]
        return tuple(sorted(found, key=lambda k: -k.familiarity))


# --- years -----------------------------------------------------------------------------------


def bucket(year: int, width: int) -> int:
    return year - year % max(width, 1)


def year_quotas(
    years: Sequence[int], size: int, power: float, width: int, rng: random.Random
) -> dict[int, int]:
    """How many songs each span of `width` years may put into a deck of `size`.

    A span's share follows its number of songs to the `power`: 1 is as the players listen,
    0.5 the square root, 0 flat. No span gets more than it has, and what that leaves over
    goes to the others. Spans of several years, because single years have too few songs for
    a share to mean anything.
    """
    counts = Counter(bucket(y, width) for y in years)
    total = sum(counts.values())
    size = min(size, total)
    if size <= 0:
        return {}
    shares: dict[int, float] = {}
    open_spans, left = set(counts), float(size)
    while open_spans:
        weight = sum(counts[b] ** power for b in open_spans)
        full = [b for b in open_spans if left * counts[b] ** power / weight >= counts[b]]
        if not full:
            for b in open_spans:
                shares[b] = left * counts[b] ** power / weight
            break
        for b in full:
            shares[b] = counts[b]
            left -= counts[b]
            open_spans.discard(b)
    quotas = {b: int(math.floor(s + 1e-9)) for b, s in shares.items()}
    rest = size - sum(quotas.values())
    # The remainder by the largest fraction; ties at random, so no span is always favoured.
    order = sorted(
        (b for b in shares if quotas[b] < counts[b]),
        key=lambda b: (shares[b] - quotas[b], rng.random()),
        reverse=True,
    )
    for b in order[:rest]:
        quotas[b] += 1
    return quotas


# --- choosing --------------------------------------------------------------------------------


def jitter(score: float, rng: random.Random, amount: float) -> float:
    """The score with a little noise, so the same group doesn't get the same deck each game."""
    return score + rng.uniform(-amount, amount) if amount else score


Ranking = tuple[int, list[tuple[int, float]]]  # (player, [(song, score), best first])


@dataclass(slots=True)
class Selection:
    """A deck being picked: the year quotas, a soft limit per artist, and the picks so far."""

    strategy: str
    knowledge: Knowledge
    quotas: dict[int, int]
    width: int
    artist_cap: int
    picked: list[Candidate] = field(default_factory=lambda: [])
    taken: set[int] = field(default_factory=lambda: set())
    spans: Counter[int] = field(default_factory=lambda: Counter())
    artists: Counter[str] = field(default_factory=lambda: Counter())

    def fits(self, i: int, level: int) -> bool:
        """Level 0 keeps the year quotas and the artist cap, 1 only the cap, 2 neither."""
        song = self.knowledge.songs[i]
        if level < 1 and self.spans[bucket(song.year, self.width)] >= self.quotas.get(
            bucket(song.year, self.width), 0
        ):
            return False
        if level < 2 and song.main_artist and self.artists[song.main_artist] >= self.artist_cap:
            return False
        return True

    def take(self, i: int, reason: str, owner: int | None, score: float) -> None:
        k = self.knowledge
        song = k.songs[i]
        self.taken.add(i)
        self.spans[bucket(song.year, self.width)] += 1
        if song.main_artist:
            self.artists[song.main_artist] += 1
        owners = k.owners(i)
        if owner is not None and owner in owners:
            owners.remove(owner)
            owners.insert(0, owner)
        why = Why(
            strategy=self.strategy,
            reason=reason,
            owner=k.profiles[owner].name if owner is not None else None,
            score=score,
            pick=len(self.picked) + 1,
            year=song.year,
            year_source=song.year_source,
            merged=len(song.track_ids),
            knowers=k.knowers(i),
        )
        known_by = tuple(k.profiles[p].player_id for p in owners)
        self.picked.append(Candidate(song.track.id, known_by, why))


def cap_of(share: float, size: int) -> int:
    return max(1, math.ceil(share * size))


def fill(selection: Selection, rankings: Sequence[Ranking], n: int, reason: str) -> int:
    """Take up to `n` songs, the libraries taking turns. On its turn a library takes its best
    song that keeps the year quotas and the artist cap; failing that, its best song that keeps
    the cap; failing that, its best song. So every library gets an equal share as long as it
    has songs, and the quotas give way only for a library that can't keep them. Returns how
    many it took."""
    took = 0
    # One position per library and level. A song that doesn't fit at a level never will:
    # quotas and the cap only fill up.
    positions = [[0, 0, 0] for _ in rankings]
    live = list(range(len(rankings)))
    while took < n and live:
        for r in list(live):
            if took >= n:
                break
            player, ranked = rankings[r]
            found: tuple[int, float] | None = None
            for level in range(3):
                at = positions[r][level]
                while at < len(ranked) and found is None:
                    i, score = ranked[at]
                    at += 1
                    if i not in selection.taken and selection.fits(i, level):
                        found = (i, score)
                positions[r][level] = at
                if found:
                    break
            if found is None:
                live.remove(r)
                continue
            selection.take(found[0], reason, player, found[1])
            took += 1
    return took


def ranked(
    scored: list[tuple[int, float]], rng: random.Random, amount: float
) -> list[tuple[int, float]]:
    """Best first by the jittered score; each keeps its plain score for the explanation."""
    keyed = [(jitter(s, rng, amount), i, s) for i, s in scored]
    keyed.sort(key=lambda x: (-x[0], x[1]))
    return [(i, s) for _, i, s in keyed]
