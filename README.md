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
   Separate speakers need every player on their own device logged in with Spotify; a guest without it who joins switches the room back to one speaker.
   In the lobby settings the host also picks how the deck is built: Balanced, Show & Tell or Wildcards (see [Deck strategies](#deck-strategies)).
6. Each player whose Spotify plays music picks a speaker and can tap Test on it to hear 10 seconds of a song from their library.
7. The host starts the game.
   The deck is chosen at once, but each song needs its release year, which MusicBrainz gives out at about one song per second.
   So the game starts as soon as the opening cards have years, and every later card is looked up when its round starts, which adds about a second to "Next turn" for a song new to Jamster.

### A turn

1. The song plays, and the card stays hidden.
   The host can make it harder in the lobby by letting only the first 5, 10 or 20 seconds play; the rest plays after the reveal, and restarting the song plays the clip again.
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

The host can also change the listening time and both countdowns during the game, under Rules in the menu; changes apply starting from the next song or countdown.
The other settings stay as they were when the game started.

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

## To-dos

What is planned but not built yet, by topic.
Remove an item once it is done.


### Game screen

- **Where the song came from, in a pop-up.**
  The Reveal panel already shows which players have the song in their library (`known_by`).
  Tapping that line, or a Details button next to it, should open a dialog that tells the whole story in plain words, per player: liked, in which playlists (by name), how high in their top songs and over which time span, and how often played lately, or only that they know other songs by the artist.
  It should also say why the deck mix picked it: as one of the songs the group knows, as a signature song of one player, as a wildcard, or as a classic to fill a thin decade.
  The server has all of this already: the card's `Why` from curation (`models.py`), with every player's familiarity and evidence.
  Only the playlist names are missing; the signals keep just the number of playlists, so the names need a lookup in `db.py`, from `track_signals` and `sources`.
  `RevealedCard` in `messages.py` and `messages.ts` would carry the details, and only after the reveal, since a playlist's name can give the year away.
  Never show the strategy's raw score; it means nothing to the players.
- **The reveal's pop-up.**
  The confetti at the reveal is built (`useRevealConfetti` in `frontend/src/screens/game/phases/revealConfetti.ts`); the pop-up that should come with it is not.
  When the Reveal phase starts (`frontend/src/screens/game/phases/Reveal.tsx`), a small pop-up should say the outcome of the round, such as who was right, the player on turn or the challenger, and go away after about 1.5 seconds; when nobody was right, it is the only thing that shows.
  No sound, because the song is still playing.
  `revealOutcome` in `phases/reveal.ts` already works out who was right, so this is frontend only.
  The preview page, `/confetti`, already shows the pop-ups with their texts.

### Winner screen

Something fun to do on the winner screen before the host takes everyone back to the lobby: stay and party.

- **Party with confetti.**
  The confetti and every control below are built and can be tried on the preview page, `/confetti` (`frontend/src/screens/confetti/ConfettiLab.tsx`); they still need to move to the winner screen (`frontend/src/screens/winner/Winner.tsx`).
  The engine is `frontend/src/components/confetti.ts` with its presets, drawn by `ConfettiProvider` in `Confetti.tsx` and used through `useConfetti()`.
  The screen opens with a burst, and then the whole screen reacts to a finger or the mouse, in the player's own color:
  - Tap or click: a burst at that spot (`tap`).
  - Press and drag (once the press has moved more than 10 pixels): a sparkler trail behind the finger (`trail`).
  - Press and hold without moving: after 250 ms a sticker circle in the player's color grows under the finger for 1.25 seconds and follows it; letting go fires a burst that is bigger the longer the hold, full at 1.5 seconds (`charged`).
  - Tap a floating cover card (`CoverArt`): it pops into card paper, gold and the player's color (`pop`) and floats back in after 2 seconds; that tap fires no other burst.

  Dragging must not scroll, select text or open the long-press menu.
  The pointer logic goes in a `.ts` hook in `screens/winner/`, lifted from the preview page.
  Every burst is sent to the room, so every screen shows everyone's confetti, each player's in their own color: a new `confetti` client message and its broadcast in `messages.py` and `messages.ts`, with the spot as a share of the screen, the kind, the power of a hold and the player.
  `rooms.py` sends it on to the room and limits how often one player may send; that needs tests in the backend.
  When the device asks for reduced motion, there is no confetti and no growing circle.
  Once this is done, decide whether `/confetti` stays as a preview page or goes.

### Cheating

- **Keep the song in play out of the browser until the reveal.**
  A song's title, artists and year show up in the browser's developer tools before the reveal, so a player can cheat.
  The room socket should send none of it while the song is a mystery.
  `_game_view` in `rooms.py` already leaves `card` empty until then, and `tests/test_e2e.py` checks that, so the leak is somewhere else still to be found.

### Planned deck modes

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
   | `http://127.0.0.1:8000/auth/callback` | the containers on your own machine |
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
| `JAMSTER_LOG_TO` | `file` (the default) or `stdout`. The backend image defaults to `stdout`. |
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

Each room also gets a folder of its own under `rooms/` in the data directory, named by the time it opened and its code, such as `rooms/2026-11-22-1930-ABCD/`, because codes repeat.
Its `room.log` holds that room's lines only, the same ones the main log has, so a game can be read back without the rest of the server's chatter.
Room folders are written whatever `JAMSTER_LOG_TO` says, so the container keeps them too.
The newest 100 room folders are kept; the oldest goes when a room opens.

Each turn's log line also says why its song is in the deck, such as `balanced core, score 1.42: Robin 0.82 (saved, top_medium #12), Ben 0.30 (artist: 7 other songs)`.
The whole deck, with that explanation for every song, is written to the room's folder when a game is dealt, in two files that the dealing line in the log names: `deck-1.md`, a Markdown report, the one `python -m jamster.curation` writes, whose Order column is the order the cards are drawn in, and `deck-1.jsonl`, the same deck as JSON lines in that order.
The room's next game deals `deck-2`, and so on.

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

Two containers, each built in two stages on Alpine, so the images hold only what runs:

- `backend` (image `jamster-game-backend`, built from `backend/Dockerfile`): FastAPI with the API and the room WebSocket on port 8000. It runs as one process, since rooms live in memory. Its port is not published; only the frontend container reaches it.
- `frontend` (image `jamster-game-frontend`, built from `frontend/Dockerfile`): Caddy serving the built app on port 8080, published as `127.0.0.1:8000`. It proxies `/api`, `/auth`, `/ws` and `/healthz` to the backend. Its configuration is `frontend/Caddyfile`.

The browser sees one origin, so the session cookie, the Spotify callback URL and the WebSocket origin check work as in development.
Both expect a reverse proxy in front for HTTPS.

### Try the images locally

From the repository root:

```sh
docker compose up --build
```

This builds both images and serves everything on http://127.0.0.1:8000, using `.env`.
Both containers log to stdout, so `docker compose logs -f` shows the log.

To check the images without real credentials, build them, start them on a network of their own and query the health endpoint through the frontend:

```sh
docker compose build
docker network create jamster-smoke
docker run --rm -d --name jamster-smoke-backend --network jamster-smoke --network-alias backend \
  -e JAMSTER_SPOTIFY_CLIENT_ID=x -e JAMSTER_SPOTIFY_CLIENT_SECRET=x -e JAMSTER_SESSION_SECRET=x \
  jamster-game-backend
docker run --rm -d --name jamster-smoke-frontend --network jamster-smoke \
  -p 127.0.0.1:8765:8080 jamster-game-frontend
curl -sf --retry 40 --retry-all-errors --retry-delay 1 http://127.0.0.1:8765/healthz
docker stop jamster-smoke-frontend jamster-smoke-backend && docker network rm jamster-smoke
```

### Push to the registry

`compose.registry.production.yaml` renames both images to their names in the registry, `registry.erdkern.walloner.net/jamster-game-backend:production` and `…/jamster-game-frontend:production`.
After a one-time `docker login registry.erdkern.walloner.net`, this builds both images locally and pushes them, from the repository root:

```sh
docker compose -f compose.yaml -f compose.registry.production.yaml build --push
```

`compose.yaml` alone keeps the local names, so the commands above are unaffected.
The tag `production` is overwritten on every push, so a server running these images picks them up with `docker compose pull && docker compose up -d`.

### On the server

1. Clone the repository and create `.env` with `JAMSTER_BASE_URL` set to the public address.
2. If the old single-container deployment (service `jamster`, image `jamster`) still runs, remove it with its data from the old checkout, once: `docker compose down -v`, then `docker image rm jamster`.
3. Start the containers from the repository root:

   ```sh
   docker compose up -d --build
   ```

4. Point the existing Caddy at the frontend container:

   ```
   jamster.example.com {
       reverse_proxy 127.0.0.1:8000
   }
   ```

`compose.yaml` publishes the port on `127.0.0.1` only, which suits a Caddy running on the host itself.
A Caddy running in Docker needs a network shared with the `frontend` service instead, and that setup is not written yet.

To update, run `git pull` and the same `docker compose` command again.

The named volume `jamster-game-data` holds the SQLite database (Spotify logins, imported libraries, cached release years and the classics found on Spotify) and the room folders in `rooms/`, each with the room's log and its decks.

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
