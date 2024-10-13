from os import environ, path, remove
from dotenv import load_dotenv
import spotipy
from tqdm import tqdm


def read_and_check_dotenv():
    """Load and check environment variables."""
    load_dotenv()
    if not (
        environ.get("SPOTIFY_CLIENT_SECRET")
        and environ.get("SPOTIFY_CLIENT_ID")
        and environ.get("SPOTIFY_REDIRECT_URI")
    ):
        raise ValueError(
            "Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI in the .env file or as environment variables."
        )
    
    return environ


def authenticate_spotify(scope, cache=True, cache_path=".auth_cache") -> spotipy.Spotify:
    """Authenticate with Spotify."""
    environ = read_and_check_dotenv()

    cache_handler = spotipy.CacheFileHandler(cache_path=cache_path)
    if not cache and path.isfile(cache_handler.cache_path):
        remove(cache_handler.cache_path)

    auth_manager = spotipy.SpotifyOAuth(
        client_id=environ.get("SPOTIFY_CLIENT_ID"),
        client_secret=environ.get("SPOTIFY_CLIENT_SECRET"),
        redirect_uri=environ.get("SPOTIFY_REDIRECT_URI"),
        scope=scope,
        show_dialog=True,
        cache_handler=cache_handler
    )
    return spotipy.Spotify(auth_manager=auth_manager)


def spotify():
    """Return an unauthenticated Spotify client."""
    environ = read_and_check_dotenv()

    auth_manager = spotipy.SpotifyClientCredentials(
        client_id=environ.get("SPOTIFY_CLIENT_ID"),
        client_secret=environ.get("SPOTIFY_CLIENT_SECRET")
    )
    return spotipy.Spotify(auth_manager=auth_manager)

def for_all_items_in(response, callback, sp, progress=True):
    """Run a callback for all items in a paginated response."""
    if progress:
        pbar = tqdm(total=response["total"], position=2, leave=None)
    else:
        pbar = None

    while response:
        for item in response["items"]:
            callback(item)
            if pbar:
                pbar.update()
        if response["next"]:
            response = sp.next(response)
        else:
            response = None

    if pbar:
        pbar.close()
