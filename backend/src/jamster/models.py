from dataclasses import dataclass


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


@dataclass(frozen=True, slots=True)
class Signal:
    """One piece of evidence that a player knows a track or an artist."""

    kind: str  # saved | playlist | top_short | top_medium | top_long | recent
    value: int  # top_*: 1-based rank. playlist: number of playlists. recent: plays. saved: 1.


@dataclass(frozen=True, slots=True)
class Card:
    track_id: str
    uri: str
    name: str
    artists: tuple[str, ...]
    year: int
    year_source: str  # musicbrainz | spotify | manual
    image_url: str | None
    known_by: tuple[str, ...]  # display names of the players with a signal for this track
