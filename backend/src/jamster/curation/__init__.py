"""Deck curation: which songs go into a group's deck.

The Strategy pattern: `CurationStrategy` is the interface, `Balanced`, `ShowAndTell` and
`Wildcards` are the concrete strategies, and `deck.curate` is the context that runs the one
the room's settings name. Register a new strategy in STRATEGIES and it shows up in the lobby
settings; give it a name in the frontend's `screens/settings/options.ts`.

Run one on its own against a database with `python -m jamster.curation`.

Spotify's developer policy forbids feeding Spotify data into an ML model or an LLM.
"""

from .balanced import Balanced
from .base import Candidate, Classic, CurationStrategy, Pool, TasteProfile
from .show_and_tell import ShowAndTell
from .songs import Weights
from .wildcards import Wildcards

STRATEGIES: dict[str, CurationStrategy] = {
    s.key: s for s in (Balanced(), ShowAndTell(), Wildcards())
}
DEFAULT = Balanced.key

__all__ = [
    "DEFAULT",
    "STRATEGIES",
    "Balanced",
    "Candidate",
    "Classic",
    "CurationStrategy",
    "Pool",
    "ShowAndTell",
    "TasteProfile",
    "Weights",
    "Wildcards",
]
