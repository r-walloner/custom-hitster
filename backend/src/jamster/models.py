from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class Artist:
    id: str
    name: str


@dataclass(frozen=True, slots=True)
class Track:
    id: str
    uri: str
    name: str
    artists: tuple[Artist, ...]
    album_name: str
    image_url: str | None
    release_date: str | None  # Spotify's album date: "1975", "1975-10" or "1975-10-31"
    isrc: str | None
    duration_ms: int


@dataclass(frozen=True, slots=True)
class Signal:
    """One piece of evidence that a player knows a track or an artist."""

    kind: str  # saved | playlist | top_short | top_medium | top_long | recent
    value: int  # top_*: 1-based rank. playlist: number of playlists. recent: plays. saved: 1.


@dataclass(frozen=True, slots=True)
class Knower:
    """How well one player knows a song, and the evidence for it."""

    name: str
    familiarity: float  # 0 to 1
    evidence: tuple[str, ...]  # "saved", "top_medium #12", "artist: 7 songs"


@dataclass(frozen=True, slots=True)
class Why:
    """Why a curation strategy put a song into a deck. Made when the song is picked and never
    changed after, so a deck can be explained after the game."""

    strategy: str  # the strategy's key
    reason: str  # core | signature | wildcard | classic
    owner: str | None  # the name of the library that brought the song in
    score: float  # the strategy's own score; its meaning depends on the strategy
    pick: int  # 1-based position in the order the strategy picked
    year: int  # the year curation went by, which may still change when the card is drawn
    year_source: str  # cached | spotify | list
    merged: int  # how many Spotify tracks were merged into this song
    knowers: tuple[Knower, ...]  # every player with any familiarity, best first

    def short(self) -> str:
        """One line for the game log, logged while the card is in play, so without its year."""
        head = f"{self.strategy} {self.reason}"
        if self.reason == "classic" and not self.knowers:
            return f"{head}, from the classics list"
        known = ", ".join(
            f"{k.name} {k.familiarity:.2f} ({', '.join(k.evidence)})" for k in self.knowers[:3]
        )
        more = f" and {len(self.knowers) - 3} more" if len(self.knowers) > 3 else ""
        return f"{head}, score {self.score:.2f}: {known or 'nobody knows it'}{more}"

    def as_dict(self) -> dict[str, Any]:
        return {
            "strategy": self.strategy,
            "reason": self.reason,
            "owner": self.owner,
            "score": round(self.score, 3),
            "pick": self.pick,
            "year": self.year,
            "year_source": self.year_source,
            "merged": self.merged,
            "knowers": [
                {
                    "name": k.name,
                    "familiarity": round(k.familiarity, 3),
                    "evidence": list(k.evidence),
                }
                for k in self.knowers
            ],
        }


@dataclass(frozen=True, slots=True)
class Card:
    track_id: str
    uri: str
    name: str
    artists: tuple[str, ...]
    year: int
    year_source: str  # musicbrainz | spotify | manual | classic
    image_url: str | None
    known_by: tuple[str, ...]  # display names of the players with a signal for this track
    duration_ms: int
    why: Why | None = None  # server only: why the strategy picked it, for the log
