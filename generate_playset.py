from json import dump
from math import floor
from os import environ, path, remove
from dotenv import load_dotenv
import spotipy
from tqdm import tqdm

# Load and check environment variables
# ------
load_dotenv()
if not (
    environ.get("SPOTIFY_CLIENT_SECRET")
    and environ.get("SPOTIFY_CLIENT_ID")
    and environ.get("SPOTIFY_REDIRECT_URI")
):
    raise ValueError(
        "Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI in the .env file or as environment variables."
    )

# Initialize data structures
# ------
# maps song ids to their track object
playset = dict()
# maps user ids to a set of song ids
known_tracks = dict()
# maps user ids to a dict of pairs (artist id, number of songs known by that artist)
known_artists = dict()
# set of all artist ids in the playset
all_artists = set()
# maps all players by their user id
players = dict()

# add players
while True:
    # Authenticate new user
    # ------
    print("Authenticating player ", len(players) + 1)
    cache_handler = spotipy.CacheFileHandler(cache_path=".auth_cache_generate")
    if path.isfile(cache_handler.cache_path):
        remove(cache_handler.cache_path)

    auth_manager = spotipy.SpotifyOAuth(
        client_id=environ.get("SPOTIFY_CLIENT_ID"),
        client_secret=environ.get("SPOTIFY_CLIENT_SECRET"),
        redirect_uri=environ.get("SPOTIFY_REDIRECT_URI"),
        scope="user-library-read playlist-read-private",
        show_dialog=True,
        cache_handler=cache_handler,
    )
    sp = spotipy.Spotify(auth_manager=auth_manager)

    current_user = sp.current_user()
    players[current_user["id"]] = current_user
    print("Authenticated as: ", current_user["display_name"])

    # Get user's saved tracks and playlists
    # ------
    known_tracks[current_user["id"]] = set()
    known_artists[current_user["id"]] = dict()

    def add_track_to_playset(item):
        """Add a track to the playset and update the known tracks and artists."""
        track = item["track"]
        playset[track["id"]] = track
        known_tracks[current_user["id"]].add(track["id"])
        for artist in track["artists"]:
            all_artists.add(artist["id"])
            if not artist["id"] in known_artists[current_user["id"]]:
                known_artists[current_user["id"]][artist["id"]] = 0
            known_artists[current_user["id"]][artist["id"]] += 1

    def for_all_items_in(response, callback):
        """Run a callback for all items in a paginated response."""
        with tqdm(total=response["total"], position=2, leave=None) as pbar:
            while response:
                for item in response["items"]:
                    callback(item)
                    pbar.update()
                if response["next"]:
                    response = sp.next(response)
                else:
                    response = None

    # get saved tracks
    print("Reading library (this may take a while)")
    print("\tReading saved tracks")
    response = sp.current_user_saved_tracks(limit=50)
    for_all_items_in(response, add_track_to_playset)

    # get tracks from users playlists
    print("\n\tReading playlists")
    playlists = set()
    response = sp.current_user_playlists(limit=50)
    for_all_items_in(response, lambda item: playlists.add(item["id"]))
    for playlist_id in tqdm(playlists, position=1, leave=None):
        response = sp.playlist_tracks(playlist_id)
        for_all_items_in(response, add_track_to_playset)

    print("\nDone reading player library.")
    print(
        "Found ",
        len(known_tracks[current_user["id"]]),
        " tracks from ",
        len(known_artists[current_user["id"]]),
        " artists.",
    )

    # continue until all players are added
    if input("\nAdd another player [y/N]? ").strip().lower() != "y":
        break

# Filter and enrich playset
# ------
print("\nInitial playset size: ", len(playset))

# annotate reason for including each track
for track in playset.values():
    track["inclusion_reason"] = "player library"

# filter out tracks known by too few players
min_player_threshold = floor(len(players) / 2) + 1
input = input(
    "Minimum number of players to keep a song [default: "
    + str(min_player_threshold)
    + "]: "
).strip()
if input:
    min_player_threshold = int(input)


def track_known_by_enough_players(track):
    """Check if a track is known by enough players."""
    known_by = 0
    for player in known_tracks.keys():
        if track["id"] in known_tracks[player]:
            known_by += 1
    return known_by >= min_player_threshold


print("Filtering songs known by at least ", min_player_threshold, " players...")
playset = dict(
    (id, track) for id, track in playset.items() if track_known_by_enough_players(track)
)
print(len(playset), " songs remaining.")


# Output playset
# ------
def encode_track(track):
    """Encode a track object as a JSON serializable dictionary containing only the necessary information."""
    return dict(
        id=track["id"],
        uri=track["uri"],
        url=track["external_urls"]["spotify"],
        name=track["name"],
        album=dict(
            id=track["album"]["id"],
            uri=track["album"]["uri"],
            url=track["album"]["external_urls"]["spotify"],
            name=track["album"]["name"],
            type=track["album"]["album_type"],
            release_date=track["album"]["release_date"],
            release_date_precision=track["album"]["release_date_precision"],
            images=track["album"]["images"],
        ),
        artists=[
            dict(
                id=artist["id"],
                uri=artist["uri"],
                url=artist["external_urls"]["spotify"],
                name=artist["name"],
                type=artist["type"],
            )
            for artist in track["artists"]
        ],
        known_by=None, # TODO
        inclusion_reason=track["inclusion_reason"],
    )


output_path = path.abspath("playset.json")
print("\nFinal playset size: ", len(playset))
print("Writing playset to ", output_path, "...")

with open(output_path, "w") as f:
    dump(list(encode_track(track) for id, track in playset.items()), f, indent=None)
