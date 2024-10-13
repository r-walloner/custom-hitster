from datetime import datetime
from json import dumps, load
import logging
from os import mkdir, path
from random import shuffle
from spotipy.exceptions import SpotifyException

from common import authenticate_spotify, color, read_and_check_dotenv, text_join

sp = authenticate_spotify(scope="user-modify-playback-state")

# start logging
# ---
timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
log_path = path.abspath(f"game_logs/game_log_{timestamp}.log")
if not path.isdir(path.dirname(log_path)):
    mkdir(path.dirname(log_path))

logging.basicConfig(filename=log_path, level=logging.DEBUG)
log = logging.getLogger(__name__)
log.info("Game started")

# load the playset
# ---
playset_path = path.abspath("playset.json")
log.info(f"Loading playset from {playset_path}")
with open("playset.json") as f:
    playset = load(f)
shuffle(playset)
log.info(f"Loaded playset with {len(playset)} songs")


# play the tracks
# ---
for track in playset:
    artist_names = text_join([artist["name"] for artist in track["artists"]])
    log.info(
        f"Playing track {track['name']} by {artist_names} from {track['album']['release_date']}"
    )
    log.debug(dumps(track, indent=2))

    print(color.BOLD, "\n🎵 Playing a song... Take a guess!", color.END)
    try:
        sp.start_playback(uris=[track["uri"]])
        input("   Press ENTER to reveal the solution...")

        print(
            color.BOLD,
            "\n  ",
            track["name"],
            color.END,
            color.ITALIC,
            "\n   by",
            artist_names,
            "\n  ",
            track["album"]["release_date"],
            color.END,
            "\n\n  ",
            text_join(track["known_by"]),
            "know this song."
        )

    except SpotifyException as e:
        log.error("Error playing song")
        print("❌", color.RED, "Error playing song:\n", e.msg, color.END)

    input("\nPress ENTER to play the next song...")
