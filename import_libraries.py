from json import dump
from os import mkdir, path
from tqdm import tqdm
from common import authenticate_spotify, for_all_items_in


# Import libraries until asked to stop
while True:
    # Authenticate user
    # ------
    print("Authenticating player")
    sp = authenticate_spotify(
        scope="user-library-read playlist-read-private",
        cache=False,
        cache_path=".auth_cache_import",
    )

    current_user = sp.current_user()
    print("Authenticated as: ", current_user["display_name"])

    # Get user's saved tracks and playlists
    # ------
    library = dict()
    # maps track ids to their track object

    def add_track_to_library(item):
        """Add the track object of the item to the library."""
        track = item["track"]
        library[track["id"]] = track

    # get saved tracks
    print("Reading library (this may take a while)")
    print("\tReading saved tracks")
    response = sp.current_user_saved_tracks(limit=50)
    for_all_items_in(response, add_track_to_library, sp)

    # get tracks from users playlists
    print("\n\tReading playlists")
    playlists = set()
    response = sp.current_user_playlists(limit=50)
    for_all_items_in(response, lambda item: playlists.add(item["id"]), sp)
    for playlist_id in tqdm(playlists, position=1, leave=None):
        response = sp.playlist_tracks(playlist_id)
        for_all_items_in(response, add_track_to_library, sp)

    print("\nDone reading player library.")
    print("Found ", len(library), " tracks.")

    # Save library
    # ------
    output_path = path.abspath("libraries/player_" + current_user["id"] + ".json")
    print("\nSaving library to ", output_path)

    if not path.isdir(path.dirname(output_path)):
        mkdir(path.dirname(output_path))

    with open(output_path, "w") as file:
        dump(
            {
                "player": current_user,
                "library": list(library.values()),
            },
            file,
        )
    print("Done")

    # Ask user if they want to authenticate another player
    # ------
    if input("\nAuthenticate another player? [Y/n] ").strip().lower() == "n":
        break
    print()
