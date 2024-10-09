import random
import os
import json
import spotipy
from spotipy.cache_handler import CacheFileHandler
from spotipy.oauth2 import SpotifyOAuth

cache_handler = CacheFileHandler(cache_path=".playback_auth")
auth_manager = SpotifyOAuth(
    scope="user-modify-playback-state",
    client_id="",
    client_secret="",
    redirect_uri="http://localhost:8080",
    show_dialog=True,
    cache_handler=cache_handler,
)
sp = spotipy.Spotify(auth_manager=auth_manager)

current_user = sp.current_user()
print("Logged in as: " + current_user["display_name"])

with open("playset.json") as f:
    playset = json.load(f)
random.shuffle(playset)

for track in playset:
    print(track['uri'])
    sp.start_playback(uris=[track['uri']])

    # wait for user input
    input("Press Enter to continue...")
    print(track['name'])
    artist_names = [artist['name'] for artist in track['artists']]
    print(", ".join(artist_names))
    print(track['album']['name'])
    print()
    input("Press Enter to continue...")