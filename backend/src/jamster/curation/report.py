"""A deck in two formats: JSON lines for the deck files and tools, Markdown for people.

Both explain every song with its `Why`, so a playtest can be followed up with "why did this
song end up in the deck?"
"""

import dataclasses
import statistics
from collections import Counter
from collections.abc import Mapping, Sequence
from typing import Any

from ..models import Track, Why
from .base import CurationStrategy, Pool
from .songs import Knowledge, Weights, year_of

Item = tuple[Track, Sequence[str], Why | None]  # a song, who knows it (names), why it's in


def deck_lines(meta: Mapping[str, Any], items: Sequence[Item]) -> list[dict[str, Any]]:
    """The first line describes the deck, then one line per song in deck order."""
    lines: list[dict[str, Any]] = [{"type": "deck", **meta}]
    for position, (track, known_by, why) in enumerate(items, start=1):
        lines.append(
            {
                "type": "song",
                "position": position,
                "track_id": track.id,
                "uri": track.uri,
                "title": track.name,
                "artists": [a.name for a in track.artists],
                "album": track.album_name,
                "spotify_year": year_of(track.release_date),
                "known_by": list(known_by),
                **(why.as_dict() if why else {}),
            }
        )
    return lines


def parameters(strategy: CurationStrategy) -> dict[str, Any]:
    """The strategy's tunable fields, nested ones flattened: {"weights.saved": 0.4, ...}."""
    out: dict[str, Any] = {}

    def walk(obj: Any, prefix: str) -> None:
        for f in dataclasses.fields(obj):
            value = getattr(obj, f.name)
            if dataclasses.is_dataclass(value) and not isinstance(value, type):
                walk(value, f"{prefix}{f.name}.")
            else:
                out[f"{prefix}{f.name}"] = value

    if dataclasses.is_dataclass(strategy):
        walk(strategy, "")
    return out


def _cell(text: object) -> str:
    return str(text).replace("|", "\\|").replace("\n", " ")


def _bar(n: int, most: int, width: int = 40) -> str:
    return "█" * max(1 if n else 0, round(width * n / most)) if most else ""


def markdown(
    strategy: CurationStrategy,
    pool: Pool,
    items: Sequence[Item],
    *,
    size: int,
    seed: int | None,
    notes: Sequence[str] = (),
    familiarity_report: bool = False,
) -> str:
    out: list[str] = [f"# {strategy.name} deck: {len(items)} of {size} songs (seed {seed})", ""]
    out += [f"> {note}" for note in notes]
    if notes:
        out.append("")
    params = parameters(strategy)
    out += ["## Parameters", ""]
    out += [f"- `{k}` = {v}" for k, v in params.items()]

    weights = getattr(strategy, "weights", Weights())
    knowledge = Knowledge.of(pool, weights)
    out += ["", "## Pool", "", "| Player | Tracks | Top songs | Top artists |", "|---|---|---|---|"]
    for p in pool.profiles:
        tops = sum(any(s.kind.startswith("top") for s in sig) for sig in p.tracks.values())
        out.append(f"| {_cell(p.name)} | {len(p.tracks)} | {tops} | {len(p.artists)} |")
    out += [
        "",
        f"{len(pool.catalog)} tracks merge into {len(knowledge.songs)} songs with a year; "
        f"{len(pool.classics)} classics.",
    ]

    out += [
        "",
        "## Deck",
        "",
        "| # | Year | From | Reason | Owner | Score | Song | Knowers |",
        "|---|---|---|---|---|---|---|---|",
    ]
    whys = [(track, why) for track, _, why in items if why]
    for track, why in sorted(whys, key=lambda x: x[1].pick):
        knowers = "; ".join(
            f"{k.name} {k.familiarity:.2f} ({', '.join(k.evidence)})" for k in why.knowers
        )
        song = f"{', '.join(a.name for a in track.artists)} – {track.name}"
        out.append(
            f"| {why.pick} | {why.year} | {why.year_source} | {why.reason} | "
            f"{_cell(why.owner or '')} | {why.score:.2f} | {_cell(song)} | {_cell(knowers)} |"
        )

    out += ["", "## Summary", ""]
    decades = Counter(why.year // 10 * 10 for _, why in whys)
    most = max(decades.values(), default=0)
    out.append("```")
    for decade in sorted(decades):
        n = decades[decade]
        share = 100 * n / len(whys)
        out.append(f"{decade}s {n:>4} {share:>4.0f} % {_bar(n, most)}")
    out.append("```")

    def counts(title: str, counter: Counter[str], limit: int | None = None) -> None:
        listed = ", ".join(f"{k} {n}" for k, n in counter.most_common(limit))
        out.append(f"- {title}: {listed or 'none'}")

    counts("Reasons", Counter(why.reason for _, why in whys))
    counts("Owners", Counter(why.owner or "(none)" for _, why in whys))
    counts("Year from", Counter(why.year_source for _, why in whys))
    artists = Counter(t.artists[0].name for t, _ in whys if t.artists)
    counts("Top artists", artists, 5)
    out.append(f"- Different artists: {len(artists)}")

    if familiarity_report:
        out += ["", "## Familiarity", ""]
        out.append(
            "Deciles of each player's familiarity: over the songs in their library, and over "
            "the songs they only know through the artist."
        )
        out += [
            "",
            "| Player | Songs | 10 % | 20 % | 30 % | 40 % | 50 % | 60 % | 70 % | 80 % "
            "| 90 % | 95 % | max |",
            "|---|---|" + "---|" * 11,
        ]
        for p, profile in enumerate(pool.profiles):
            mine = [s for s, d in zip(knowledge.scores[p], knowledge.direct[p], strict=True) if d]
            through_artist = [
                s
                for s, d in zip(knowledge.scores[p], knowledge.direct[p], strict=True)
                if not d and s > 0
            ]
            for label, values in (("library", mine), ("artist only", through_artist)):
                out.append(
                    f"| {_cell(profile.name)}, {label} | {len(values)} | {_deciles(values)} |"
                )
    out.append("")
    return "\n".join(out)


def _deciles(values: Sequence[float]) -> str:
    if len(values) < 2:
        return " | ".join(["–"] * 11)
    cuts = statistics.quantiles(values, n=20, method="inclusive")  # every 5 %
    picked = [cuts[i] for i in (1, 3, 5, 7, 9, 11, 13, 15, 17, 18)] + [max(values)]
    return " | ".join(f"{v:.2f}" for v in picked)
