from json import load
from os import environ
from random import shuffle
from dotenv import load_dotenv
import spotipy

# load and check environment variables
load_dotenv()
if not (
    environ.get("SPOTIFY_CLIENT_SECRET")
    and environ.get("SPOTIFY_CLIENT_ID")
    and environ.get("SPOTIFY_REDIRECT_URI")
):
    raise ValueError(
        "Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI in the .env file or as environment variables."
    )

# authenticate with Spotify
cache_handler = spotipy.CacheFileHandler(cache_path=".auth_cache_play")
auth_manager = spotipy.SpotifyOAuth(
    client_id=environ.get("SPOTIFY_CLIENT_ID"),
    client_secret=environ.get("SPOTIFY_CLIENT_SECRET"),
    redirect_uri=environ.get("SPOTIFY_REDIRECT_URI"),
    scope="user-modify-playback-state",
    show_dialog=True,
    cache_handler=cache_handler,
)
sp = spotipy.Spotify(auth_manager=auth_manager)

current_user = sp.current_user()
print("Logged in as: " + current_user["display_name"])

# load the playset
with open("playset_core.json") as f:
    playset = load(f)
shuffle(playset)
print(f"Playset loaded with {len(playset)} tracks.")

# play the tracks
for track in playset:
    print("playing next song")
    sp.start_playback(uris=[track["uri"]])

    # wait for user input
    input("Press Enter to reveal the solution...")
    print()
    print("Title: ", track["name"])
    artist_names = [artist["name"] for artist in track["artists"]]
    print("Artist(s): ", ", ".join(artist_names))
    print("Album: ", track["album"]["name"])
    print()
    input("Press Enter to play the next song...")
