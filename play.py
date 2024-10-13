from json import load
from random import shuffle

from common import authenticate_spotify, read_and_check_dotenv

environ = read_and_check_dotenv()

# authenticate with Spotify
sp = authenticate_spotify(scope="user-modify-playback-state")

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
