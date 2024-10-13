from json import dump, load
from math import floor
from os import listdir, path

from common import spotify

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

sp = spotify()

# load player libraries
# ------
print("Loading player libraries")

for file in listdir("libraries"):
    if not (file.startswith("player_") and file.endswith(".json")):
        continue

    with open(path.join("libraries", file)) as file:
        player, library = load(file).values()

        players[player["id"]] = player
        print("\tLoaded ", player["display_name"])

        # Add players's library to playset
        # ------
        known_tracks[player["id"]] = set()
        known_artists[player["id"]] = dict()

        for track in library:
            playset[track["id"]] = track
            known_tracks[player["id"]].add(track["id"])
            for artist in track["artists"]:
                all_artists.add(artist["id"])
                if not artist["id"] in known_artists[player["id"]]:
                    known_artists[player["id"]][artist["id"]] = 0
                known_artists[player["id"]][artist["id"]] += 1

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
