from json import load
from random import shuffle
from sys import stdout
from spotipy.exceptions import SpotifyException

from common import authenticate_spotify, color, read_and_check_dotenv

sp = authenticate_spotify(scope="user-modify-playback-state")

# load the playset
# ---
with open("playset.json") as f:
    playset = load(f)
shuffle(playset)
print(f"Loaded playset with {len(playset)} songs")

# play the tracks
# ---
for track in playset:
    print(color.BOLD, "\n🎵 Playing a song... Take a guess!", color.END)
    try:
        sp.start_playback(uris=[track["uri"]])
        input("   Press ENTER to reveal the solution...")

        artist_names = [artist["name"] for artist in track["artists"]]
        print(
            color.BOLD,
            "\n  ",
            track["name"],
            color.END,
            color.ITALIC,
            "\n   by ",
            ", ".join(artist_names),
            "\n  ",
            track["album"]["release_date"],
            color.END,
        )

    except SpotifyException as e:
        print("❌", color.RED, "Error playing song:\n", e.msg, color.END)

    input("\nPress ENTER to play the next song...")
