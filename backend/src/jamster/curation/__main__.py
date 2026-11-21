"""Run a curation strategy on its own against a Jamster database and write the deck it picks,
to evaluate a strategy and tune its parameters. Run from `backend/`:

    uv run python -m jamster.curation balanced
    uv run python -m jamster.curation balanced --set year_power=0.3 --set weights.saved=0.5
    uv run python -m jamster.curation show_and_tell --split 3 --report familiarity
    uv run python -m jamster.curation wildcards --out /tmp/wild

Every run writes two files, a Markdown report and the same deck as JSON lines (the format of
the deck files), and prints their paths. They go to data/curation/ unless --out says where.

The database is opened read-only, so this is safe while the server runs, and nothing is
looked up: no MusicBrainz, no Spotify.
"""

import argparse
import dataclasses
import datetime
import json
import random
import sqlite3
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from .. import classics, db
from ..deck import entries_of, load_pool
from ..models import Signal
from . import DEFAULT, STRATEGIES, Classic, CurationStrategy, Pool, TasteProfile
from .report import deck_lines, markdown, parameters


def with_value(obj: Any, path: Sequence[str], raw: str) -> Any:
    """A copy of the dataclass `obj` with the field at `path` set from text."""
    name, *rest = path
    fields = {f.name for f in dataclasses.fields(obj)}
    if name not in fields:
        raise SystemExit(f"no parameter {name!r}; there are: {', '.join(sorted(fields))}")
    current = getattr(obj, name)
    if rest:
        return dataclasses.replace(obj, **{name: with_value(current, rest, raw)})
    if isinstance(current, bool):
        value: Any = raw.lower() in ("1", "true", "yes", "on")
    else:
        value = type(current)(raw)
    return dataclasses.replace(obj, **{name: value})


def split(profile: TasteProfile, n: int, overlap: float, rng: random.Random) -> list[TasteProfile]:
    """`n` made-up players from one library: each song goes to one of them, and with the
    chance `overlap` to a second one too; each top artist goes to each player by chance."""
    tracks: list[dict[str, tuple[Signal, ...]]] = [{} for _ in range(n)]
    for track_id, signals in profile.tracks.items():
        owners = rng.sample(range(n), 2 if n > 1 and rng.random() < overlap else 1)
        for o in owners:
            tracks[o][track_id] = signals
    artists: list[dict[str, tuple[Signal, ...]]] = [{} for _ in range(n)]
    for artist_id, signals in profile.artists.items():
        for o in range(n):
            if rng.random() < 0.5:
                artists[o][artist_id] = signals
    return [
        TasteProfile(
            f"{profile.player_id}/{o + 1}", f"{profile.name}/{o + 1}", tracks[o], artists[o]
        )
        for o in range(n)
    ]


def build_pool(args: argparse.Namespace, notes: list[str]) -> Pool:
    path = Path(args.db)
    if not path.exists():
        raise SystemExit(f"no database at {path}; pass --db")
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    players = db.players_with_tracks(conn)
    if args.players:
        wanted = [w.strip().lower() for w in args.players.split(",")]
        chosen = [p for p in players if p.name.lower() in wanted or p.id.lower() in wanted]
        if len(chosen) != len(wanted):
            names = ", ".join(p.name for p in players) or "none"
            raise SystemExit(f"not all of {args.players!r} have songs; players with songs: {names}")
        players = chosen
    if not players:
        raise SystemExit("no player in this database has songs in a picked source")
    pool = load_pool(conn, [p.id for p in players], with_classics=False)
    conn.close()

    if args.split:
        if len(pool.profiles) != 1:
            raise SystemExit("--split takes exactly one player; choose one with --players")
        made_up = split(pool.profiles[0], args.split, args.overlap, random.Random(args.seed))
        pool = dataclasses.replace(pool, profiles=made_up)
        notes.append(
            f"The players are made up: {pool.profiles[0].name.split('/')[0]}'s library split "
            f"{args.split} ways, {args.overlap:.0%} of the songs shared by two."
        )
    if args.classics:
        # Straight from the list rather than the database, which has them only once the
        # server has started with this list.
        listed = classics.load(Path(args.classics))
        found = [Classic(e.track, e.year) for e in listed if e.track]
        waiting = [Classic(classics.placeholder(e), e.year) for e in listed if not e.looked_up]
        pool = dataclasses.replace(
            pool,
            catalog={**pool.catalog, **{c.track.id: c.track for c in found + waiting}},
            classics=found + waiting,
        )
        if waiting:
            notes.append(
                f"{len(waiting)} classics are not looked up on Spotify yet and stand in "
                "unmatched; `python -m jamster.classics` looks them up."
            )
    return pool


def default_out(strategy: str, seed: int) -> Path:
    """data/curation/<UTC time>-<strategy>-seed<seed>, next to the database and the deck files."""
    now = datetime.datetime.now(datetime.UTC)
    return Path("data") / "curation" / f"{now:%Y-%m-%dT%H-%M-%S}-{strategy}-seed{seed}"


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="python -m jamster.curation",
        description="Pick a deck with one strategy and explain every song in it.",
    )
    parser.add_argument("strategy", nargs="?", default=DEFAULT, choices=list(STRATEGIES))
    parser.add_argument("--db", default="data/jamster.db", help="default: %(default)s")
    parser.add_argument("--players", help="names or Spotify ids, comma-separated; default: all")
    parser.add_argument("--size", type=int, default=100, help="default: %(default)s")
    parser.add_argument("--seed", type=int, default=1, help="default: %(default)s")
    parser.add_argument(
        "--set",
        action="append",
        default=[],
        metavar="NAME=VALUE",
        help="change a parameter, such as year_power=0.3 or weights.saved=0.5",
    )
    parser.add_argument("--split", type=int, help="make up this many players from one library")
    parser.add_argument("--overlap", type=float, default=0.2, help="with --split; default: 0.2")
    parser.add_argument(
        "--classics",
        default=str(classics.DEFAULT_FILE),
        help="the classics list; '' for no classics; default: %(default)s",
    )
    parser.add_argument(
        "--out",
        metavar="PATH",
        help="where to write, without the extension: PATH.md and PATH.jsonl; default: "
        "data/curation/<time>-<strategy>-seed<seed>",
    )
    parser.add_argument("--report", action="append", choices=["familiarity"], default=[])
    args = parser.parse_args(argv)

    strategy: CurationStrategy = STRATEGIES[args.strategy]
    for change in args.set:
        name, sep, raw = change.partition("=")
        if not sep:
            raise SystemExit(f"--set wants NAME=VALUE, not {change!r}")
        strategy = with_value(strategy, name.split("."), raw)

    notes: list[str] = []
    pool = build_pool(args, notes)
    entries = entries_of(pool, strategy, args.size, random.Random(args.seed))
    items = [(e.track, e.known_by, e.why) for e in entries]

    meta = {
        "strategy": strategy.key,
        "size": args.size,
        "seed": args.seed,
        "parameters": parameters(strategy),
        "players": [p.name for p in pool.profiles],
        "notes": notes,
    }
    report = markdown(
        strategy,
        pool,
        items,
        size=args.size,
        seed=args.seed,
        notes=notes,
        familiarity_report="familiarity" in args.report,
    )
    base = Path(args.out) if args.out else default_out(strategy.key, args.seed)
    md_path, jsonl_path = base.with_name(base.name + ".md"), base.with_name(base.name + ".jsonl")
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(report)
    jsonl_path.write_text(
        "".join(json.dumps(line, ensure_ascii=False) + "\n" for line in deck_lines(meta, items))
    )
    sys.stdout.write(f"{md_path}\n{jsonl_path}\n")


if __name__ == "__main__":
    main()
