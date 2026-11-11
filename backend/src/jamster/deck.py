"""Turns the players' libraries into a deck. Curating is instant; a card's year is looked up only
when the card is about to be needed, because MusicBrainz allows one lookup per second."""

import random
import sqlite3
from dataclasses import dataclass

from . import db
from .curation import STRATEGIES, TasteProfile
from .models import Card, Track
from .years import YearResolver


@dataclass(frozen=True, slots=True)
class Entry:
    """A curated track whose year may not be known yet."""

    track: Track
    known_by: tuple[str, ...]  # display names of the players with a signal for it


def load_profile(conn: sqlite3.Connection, player_id: str) -> TasteProfile | None:
    player = db.get_player(conn, player_id)
    if player is None:
        return None
    return TasteProfile(
        player_id=player.id,
        name=player.name,
        tracks=db.track_signals(conn, player_id),
        artists=db.artist_signals(conn, player_id),
    )


def curate(
    conn: sqlite3.Connection, player_ids: list[str], strategy: str, size: int, rng: random.Random
) -> list[Entry]:
    """Up to `size` tracks for these players, in random order."""
    profiles = [p for p in (load_profile(conn, pid) for pid in player_ids) if p]
    if not profiles:
        return []
    names = {p.player_id: p.name for p in profiles}
    catalog = db.tracks_known_to(conn, [p.player_id for p in profiles])
    candidates = STRATEGIES[strategy](profiles, catalog, size, rng)
    entries = [
        Entry(catalog[c.track_id], tuple(names[pid] for pid in c.known_by)) for c in candidates
    ]
    rng.shuffle(entries)
    return entries


def cached_first(conn: sqlite3.Connection, entries: list[Entry], count: int) -> list[Entry]:
    """`entries` with up to `count` tracks whose year is already cached moved to the front, so
    the opening deal needs as few lookups as possible. The rest keep their order."""
    front: list[Entry] = []
    for entry in entries:
        if len(front) == count:
            break
        if db.get_year(conn, entry.track.id):
            front.append(entry)
    return front + [e for e in entries if e not in front]


async def to_card(resolver: YearResolver, entry: Entry) -> Card | None:
    """The card for an entry, or None if no source knows a plausible year for it."""
    resolved = await resolver.resolve(entry.track)
    if resolved is None:
        return None
    track = entry.track
    return Card(
        track_id=track.id,
        uri=track.uri,
        name=track.name,
        artists=tuple(a.name for a in track.artists),
        year=resolved[0],
        year_source=resolved[1],
        image_url=track.image_url,
        known_by=entry.known_by,
    )
