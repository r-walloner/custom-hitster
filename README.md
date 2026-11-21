# Jamster

A web party game for one friend group.
A song plays, the player on turn places it on their timeline by release year, and the others may challenge the placement.
The deck is built from the players' own Spotify libraries.

> [!WARNING]
> The code passes its tests against a fake Spotify, and a whole game has been played in a browser against that fake, but it has never run against the real Spotify API.
> Expect to fix things on the first real game.

## Constraints

Jamster is a private tool and cannot become a public one.

- Spotify limits the app to 5 accounts, each added by hand in the Spotify developer dashboard.
- Spotify's developer policy forbids games, so the realistic risk is that Spotify revokes the app's credentials.
- Controlling playback needs Spotify Premium on every account that plays music.
- Running games live in server memory, so a restart ends them and the server must run as one process.

[docs/project-brief.md](docs/project-brief.md) records every design decision, what was rejected and why.

## How a game works

### Before the game

1. Choose "Log in with Spotify" on the home page. Logged in, the home page also offers Host a game, Your songs and your account (name, sign out, delete).
   The server lists your library within seconds: your liked songs, the playlists you own or collaborate on, your top songs and your recent plays.
   On the Your songs screen you tick which of them go into the deck, and only the ticked ones are copied, one at a time; unticking one stops its copy.
   You reach it from the home page, and from the lobby, so every signed-in player can change their picks until the host starts.
   Recent plays, top songs and liked songs sit at the top, in that order; your playlists follow in the order Spotify lists them.
   Every source starts ticked, including playlists found on a later Refresh, so your whole library is copied unless you untick some of it.
   Refresh on that screen lists the library again and imports only what changed.
2. Create a room and share its link or four-letter code.
3. Others join with a nickname.
   Signing in with Spotify is optional and adds their library to the deck.
   Anyone can change their own name in the lobby; a local player with the wrong name is removed and added again.
   A signed-in player's name is saved with their account, so it comes back in the next room; the Account pop-up on the home page can change it too.
4. The host can add local players, who have no phone; the host's screen shows their buttons on their own rows, so one device is enough.
5. The host picks the playback mode on the speaker screen (Music plays on, in the lobby): one speaker (the host's Spotify, same room) or separate speakers (everyone's own Spotify, remote).
   In the lobby settings the host also picks how the deck is built: Balanced, Show & Tell or Wildcards (see [Deck strategies](#deck-strategies)).
6. Each player whose Spotify plays music picks a speaker and can tap Test on it to hear 10 seconds of a song from their library.
7. The host starts the game.
   The deck is chosen at once, but each song needs its release year, which MusicBrainz gives out at about one song per second.
   So the game starts as soon as the opening cards have years, and every later card is looked up when its round starts, which adds about a second to "Next turn" for a song new to Jamster.

### A turn

1. The song plays, and the card stays hidden.
2. The player on turn taps a `+` on their timeline to place the card, then locks it in.
   Skipping to another song costs 1 token.
   Instead of locking it in, they can buy the card for 3 tokens: it goes into their timeline without guessing, nobody can challenge it, and it is revealed at once.
3. A countdown starts, 10 seconds unless the host sets another time in the lobby.
   Until it runs out, every other player may challenge on their own device; the host also decides for the local players, on their rows, so a hot-seat game works within the countdown.
   The first to challenge is the only challenger, and the countdown ends there; whoever has not challenged when it runs out has passed.
4. If nobody challenged, the card is revealed.
   Otherwise the challenger taps a free `+` where they think the card belongs and locks it in, which costs 1 token.
5. The card is revealed.
   A correct placement keeps the card.
   Otherwise the first challenger with a correct slot takes it, and if there is none the card is discarded.
6. The host confirms whether the player on turn named the title and artist aloud, which earns 1 token (5 at most).
7. A second countdown, 15 seconds unless the host sets another time or turns it off in the lobby, starts the next turn by itself.
   The host can start it at once with "Next song", or stop the countdown with "Keep listening" and move on by hand.

A player who leaves the lobby gives up their seat; one who leaves a game, or loses their connection, keeps it and gets it back by opening the room link again in the same browser.
While they are away:

- On their turn everyone waits for them, or the host skips the turn and the card is thrown away.
- If they challenged and it is their turn to guess, their challenge is dropped without costing a token: at once if they left, after 10 seconds if their connection dropped.
- In remote play, a player who left gets no more songs on their Spotify until they return.

The host's "Close room" in the lobby ends the room for everyone.
An abandoned room is dropped once it has been empty for six hours.

The first player to reach the target number of cards wins.
If the deck runs out first, the player with the most cards wins.

The Spotify app on the playing device shows the title, so nobody should look at it.

## Backend TODOs for the designed screens

The frontend follows the screens in `docs/design/screens/`, but some of what they show has no data behind it yet.
Each item below says what the screen does meanwhile.
Remove an item once the backend provides it and the screen uses it.

Nothing is missing at the moment.

## Planned deck modes

Two more deck strategies are designed but not built yet.

- **Deep Dive: one artist.**
  The host picks an artist, and the deck is that artist's songs: the players' own, plus songs fetched for the game.
  It needs an artist picker in the lobby, and suggestions of artists the whole group knows well whose songs span many years.
  It also needs a fetch step before curation, about 5 to 10 requests per game: `GET /search` for `artist:"…"` (10 tracks per request, with ISRCs), and `GET /artists/{id}/albums` with albums and singles only, for the artist's own release years.
  It should take 2 or 3 songs per album at most, because songs from the same year are free placements.
- **Nostalgia: songs liked long ago.**
  Songs a player liked years ago and no longer plays: an old `added_at`, and in no top list or recent plays.
  The reveal could say "Robin liked this in 2018".
  It needs the `added_at` of liked songs and playlist entries, which the importer already receives but does not store, so it means a schema change and a fresh database.

One thing is left out on purpose: the deck can't be fed from the artists a player follows.
Development Mode has no artist top tracks, and album tracks come without the ISRC the year lookup needs, so an artist's songs would cost many requests and still lack years.

## Setup

### Spotify app

Create an app at https://developer.spotify.com/dashboard.
The account that owns it needs Premium.

1. Under Settings, User Management, add each player by name and Spotify email.
2. Register these redirect URIs exactly:

   | Redirect URI | Used by |
   |---|---|
   | `http://127.0.0.1:5173/auth/callback` | development through Vite |
   | `http://127.0.0.1:8000/auth/callback` | the container on your own machine |
   | `https://<your-domain>/auth/callback` | production |

Spotify rejects `http://localhost`, so always browse to `127.0.0.1`.

### Configuration

Copy `.env.example` to `.env` in the repository root and fill it in.
The backend and Docker Compose both read it.

| Variable | Meaning |
|---|---|
| `JAMSTER_SPOTIFY_CLIENT_ID`, `JAMSTER_SPOTIFY_CLIENT_SECRET` | Credentials of the Spotify app. |
| `JAMSTER_SESSION_SECRET` | Any long random string, used to sign the session cookie. |
| `JAMSTER_BASE_URL` | Public address in production, such as `https://jamster.example.com`, and empty locally. |
| `JAMSTER_MUSICBRAINZ_CONTACT` | A URL or email address sent to MusicBrainz, whose API rules ask for one. |
| `JAMSTER_CLASSICS_FILE` | The list of well-known songs Balanced mixes in, by default `backend/src/jamster/classics.json`. |
| `JAMSTER_LOG_LEVEL` | `INFO` (the default), `DEBUG`, `WARNING` or `ERROR`. |
| `JAMSTER_LOG_TO` | `file` (the default) or `stdout`. The container image defaults to `stdout`. |
| `JAMSTER_LOG_FILE` | The log file, by default `jamster.log` in the data directory, so `backend/data/jamster.log` in development. |

The log variables are optional.
At `INFO`, the log tells each game move by move: whose turn it is, which song plays, every placement, challenge and reveal, and the standings.
It also records players coming and going, settings changes, logins and imports.
Failures the game survives, such as a song Spotify refuses to play, are `WARNING` lines with Spotify's reason.
`DEBUG` adds every Spotify and MusicBrainz call and every refused request.
Only Jamster's own lines are logged below `WARNING`, so the web server's request lines stay out.
The log names the song in play but keeps its year back until the turn is over, when the reveal line gives it with the result, such as `"Africa" by Toto is from 1982: Robin was wrong, the card is discarded`.
A skipped song is thrown away unrevealed, so its year isn't logged either.
The song's name still gives it away, so don't watch the log during a game.
The log file rotates at 10 MB and keeps five old files.

Each turn's log line also says why its song is in the deck, such as `balanced core, score 1.42: Robin 0.82 (saved, top_medium #12), Ben 0.30 (artist: 7 other songs)`.
The whole deck, with that explanation for every song, is written to `decks/` in the data directory when a game is dealt, in two files that the dealing line in the log names: a Markdown report, the one `python -m jamster.curation` writes, whose Order column is the order the cards are drawn in, and the same deck as JSON lines in that order.
The newest 100 decks are kept.

Generate the session secret with:

```sh
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Development

The backend needs Python 3.14 and [uv](https://docs.astral.sh/uv/).
The frontend needs Node 24.

### Run it

Start the backend from `backend/`.
It serves the API on http://127.0.0.1:8000 and reloads when code changes.

```sh
uv sync
uv run fastapi dev
```

Start the frontend from `frontend/` in a second terminal.
It serves the app on http://127.0.0.1:5173 and forwards `/api`, `/auth` and `/ws` to the backend.

```sh
npm install
npm run dev
```

To let phones on the same network join as guests, run `npm run dev -- --host` and open `http://<laptop-ip>:5173/room/<code>` on the phone.
Spotify sign-in does not work from that address, because Spotify only accepts `127.0.0.1` or HTTPS.

### Check it

From `backend/`:

```sh
uv run ruff format . && uv run ruff check .
uv run pyright
uv run pytest
```

These format and lint the code, type-check it, and run the tests.
The end-to-end tests play whole games through the real app against `tests/fake_spotify.py`, so they need no network and no credentials.

From `frontend/`:

```sh
npm run lint
npm run build
```

`npm run build` also type-checks the frontend.
There are no frontend tests.

### Layout

| Path | Contents |
|---|---|
| `backend/src/jamster/engine.py` | The game rules as a pure state machine. |
| `backend/src/jamster/rooms.py` | Rooms in memory, the socket messages, playback control. |
| `backend/src/jamster/spotify.py`, `importer.py` | Spotify login, API client and library import. |
| `backend/src/jamster/years.py` | Release years from MusicBrainz, with Spotify's date as fallback. |
| `backend/src/jamster/curation/`, `deck.py` | Deck strategies, the command that tries them, and deck building. |
| `backend/src/jamster/classics.py`, `classics.json` | The list of well-known songs and their matching on Spotify. |
| `backend/src/jamster/db.py` | The SQLite schema and every query. |
| `backend/src/jamster/web.py` | Routes, the room WebSocket, static files. |
| `backend/src/jamster/logs.py` | Where log records go, and from which level. |
| `frontend/src/` | The React app: `api/` talks to the backend, `components/` holds the reusable components, `screens/` has one folder per screen area (`screens/room/Room.tsx` picks a room's screen from its state). |

`backend/src/jamster/messages.py` and `frontend/src/api/messages.ts` describe the same WebSocket messages and are kept in sync by hand.

There is no migration tool.
After a change to the schema in `db.py`, delete the database file, and every player signs in again.

### Deck strategies

A strategy picks the songs of a deck from the players' libraries.
The host chooses one in the lobby settings.

| Strategy | What it picks |
|---|---|
| Balanced (the default) | Songs the group knows, preferring those several players know. Each library gets an equal share, the years are spread out, 10 % are signature songs, one player's own that they know well and the others don't, and 10 % are well-known classics, aimed at the decades the libraries leave thin. |
| Show & Tell | Each library brings an equal share of the songs that are most its own: its player knows them well, the others hardly do. |
| Wildcards | The deep cuts: songs only one library has and its player barely knows, by artists nobody else knows, spread evenly over the years. |

How they work:

- **Familiarity.** Every strategy starts from how well each player knows each song, a score from 0 to 1. The score combines the evidence: top lists, liked, playlists and recent plays, plus the artist's place in the player's top artists and how many of the player's songs are by that artist. A player who doesn't have a song can still know it a little through its artist.
- **Merging.** Releases of one song merge into one card: the same ISRC, or the same title by the same main artist once tags like "Remastered 2011" or "feat. X" are dropped. Remixes, live versions and covers stay separate songs.
- **Years.** Years are shaped in spans of five years, each span's share following its number of songs to a power: 0.5 (the square root) for Balanced and Show & Tell, 0 (flat) for Wildcards. The years used are those MusicBrainz already gave, else Spotify's, which is sometimes a remaster's. Curation never looks a year up.
- **Equal shares.** The libraries take turns. A library that has no song left that fits the year shares or the artist limit (5 % of the deck) takes its best song anyway, so every library gets an equal share as long as it has songs.
- **Classics.** `backend/src/jamster/classics.json` lists about 380 well-known songs from the 1950s to today, a quarter of them German-language, each with the year it first came out and its Spotify track. At startup the server copies the list into the database, with the list's years, and asks neither Spotify nor MusicBrainz about them. Edit the list freely: a changed year is taken over at the next start and a removed song is forgotten. A song added to it needs its Spotify track looked up once, from `backend/`, with the Spotify app's credentials in `.env`:

  ```sh
  uv run python -m jamster.classics
  ```

  That searches Spotify for every song without a `track` yet, one search a second, and writes the tracks into the file. A song Spotify doesn't have gets `"track": null` and is left out of decks; `--again` searches for those again. Correct a wrong match by editing or deleting its `track`.

The code follows the Strategy pattern.
`CurationStrategy` in `backend/src/jamster/curation/base.py` is the interface: `curate(pool, size, rng)` picks the songs, and `rules(size)` and `scores()` say in words how it picks and what its scores mean, which the Markdown report prints.
`Balanced`, `ShowAndTell` and `Wildcards` are the concrete strategies, each a dataclass whose fields are its parameters.
`deck.curate` is the context: it loads the pool, runs the strategy the settings name and turns its picks into cards.
The shared building blocks (merging, familiarity, year shares, the turn-taking) are in `curation/songs.py`.
To add a strategy, subclass `CurationStrategy`, add an instance to `STRATEGIES` in `curation/__init__.py`, and give it a name in `frontend/src/screens/settings/options.ts`.
Strategies stay pure: no network, no database, no clock.

Every pick carries a `Why`: the reason (core, signature, wildcard or classic), the library that brought it, the strategy's score, and each player's familiarity with the evidence for it.

#### Try a strategy

From `backend/`, this picks a deck from the database without starting the server and writes two files that explain every song in it, a Markdown report and the same deck as JSON lines, and prints their paths:

```sh
uv run python -m jamster.curation balanced
```

It opens `data/jamster.db` read-only, so it is safe while the server runs, and it looks nothing up.

| Option | Meaning |
|---|---|
| `balanced`, `show_and_tell`, `wildcards` | The strategy, Balanced by default. |
| `--players Robin,Ben` | Whose libraries, by name or Spotify id; all with songs by default. |
| `--size 100`, `--seed 1` | The deck size, and the seed that makes a run repeatable. |
| `--set year_power=0.3` | Change a parameter for this run; repeat it for several. `--set weights.saved=0.5` changes a familiarity weight. |
| `--split 3` | Make up 3 players from one library, a fifth of the songs shared by two, to try what several players would get. |
| `--report familiarity` | Add each player's familiarity percentiles, to tune the weights. |
| `--out runs/try` | Write `runs/try.md` and `runs/try.jsonl`. By default the files go to `data/curation/`, named after the time, the strategy and the seed. |

The Markdown says how the strategy picked the deck, with its numbers, and what each column and score means, then lists the parameters, the players, every song with its year, reason, owner, score and who knows it, and a summary: songs per decade, per reason and per owner, and the most frequent artists.
The JSON lines have the format of the deck files: a first line with the strategy, its parameters, the seed and the players, then one line per song.
The classics come straight from the list; songs not looked up yet stand in without a track.

Spotify's developer policy forbids feeding Spotify data into a machine learning model or an LLM.

## Deployment

One container serves the API, the WebSocket and the built frontend on port 8000.
It expects a reverse proxy in front of it for HTTPS.

### Try the image locally

From the repository root:

```sh
docker compose up --build
```

This builds the image and serves everything on http://127.0.0.1:8000, using `.env`.
The container logs to stdout, so `docker compose logs -f` shows the log.

To check an image without real credentials, build it and query its health endpoint:

```sh
docker build -t jamster .
docker run --rm -d --name jamster-smoke -p 127.0.0.1:8765:8000 \
  -e JAMSTER_SPOTIFY_CLIENT_ID=x -e JAMSTER_SPOTIFY_CLIENT_SECRET=x \
  -e JAMSTER_SESSION_SECRET=x jamster
curl -sf --retry 40 --retry-all-errors --retry-delay 1 http://127.0.0.1:8765/healthz
docker stop jamster-smoke
```

### On the server

1. Clone the repository and create `.env` with `JAMSTER_BASE_URL` set to the public address.
2. Start the container from the repository root:

   ```sh
   docker compose up -d --build
   ```

3. Point the existing Caddy at it:

   ```
   jamster.example.com {
       reverse_proxy 127.0.0.1:8000
   }
   ```

`compose.yaml` publishes the port on `127.0.0.1` only, which suits a Caddy running on the host itself.
A Caddy running in Docker needs a network shared with the `jamster` service instead, and that setup is not written yet.

To update, run `git pull` and the same `docker compose` command again.

The named volume `jamster-data` holds the SQLite database (Spotify logins, imported libraries, cached release years and the classics found on Spotify) and the deck files in `decks/`.

## How the skeletons were generated

These commands created `backend/` and `frontend/`, from the repository root.
They are recorded for reference and do not need running again.

```sh
uv init --package --name jamster --python 3.14 --vcs none --no-readme backend
(cd backend && uv add "fastapi[standard]" httpx pydantic-settings itsdangerous)
(cd backend && uv add --dev pytest pytest-timeout ruff pyright)
npm create vite@latest frontend -- --template react-ts --no-interactive
(cd frontend && npm install && npm install react-router)
```
