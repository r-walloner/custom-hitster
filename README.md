# Jamster

A web party game for one friend group.
A song plays, the player on turn places it on their timeline by release year, and the others may challenge the placement.
The deck is built from the players' own Spotify libraries.

> [!WARNING]
> The code passes its tests against a fake Spotify, but it has never run against the real Spotify API, and the interface has never been opened in a browser.
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

1. Sign in with Spotify on the home page.
   The server imports your saved tracks, the playlists you own or collaborate on, your top tracks and artists, and your recent plays.
   A large library takes a minute or two.
2. Create a room and share its link or four-letter code.
3. Others join with a nickname.
   Signing in with Spotify is optional and adds their library to the deck.
4. The host can add players who have no phone and play for them through the "Acting as" menu, so one device is enough.
5. The host chooses where the music plays: on the host's Spotify (same room) or on every player's Spotify (remote).
6. Each player whose Spotify plays music picks a device and presses "Test playback".
7. The host starts the game.
   The deck is chosen at once, but each song needs its release year, which MusicBrainz gives out at about one song per second.
   So the game starts as soon as the opening cards have years, preferring songs looked up in earlier games, and every later card is looked up when its round starts, which adds about a second to "Next turn" for a song new to Jamster.

### A turn

1. The song plays, and the card stays hidden.
2. The player on turn taps a `+` on their timeline to place the card, then locks it in.
   Skipping to another song costs 1 token.
3. A countdown starts, 5 seconds unless the host sets another time in the lobby.
   Until it runs out, every other player may challenge or pass, and it ends early once everyone has decided.
4. If nobody challenged, the card is revealed.
   Otherwise each challenger in turn, in the order they challenged, taps a free `+` where they think the card belongs and locks it in, which costs 1 token.
   The host sees challenge and pass buttons for every player without a phone, so a hot-seat game works within the countdown.
5. The card is revealed.
   A correct placement keeps the card.
   Otherwise the first challenger with a correct slot takes it, and if there is none the card is discarded.
6. The host or the player on turn confirms whether that player named the title and artist aloud, which earns 1 token (5 at most).
7. A second countdown, 15 seconds unless the host sets another time or turns it off in the lobby, starts the next turn by itself.
   The host or the player on turn can start it at once with "Next turn", or stop the countdown with "Keep listening" and move on by hand.

Any player can trade 3 tokens for a card.
The first player to reach the target number of cards wins.
If the deck runs out first, the player with the most cards wins.

The Spotify app on the playing device shows the title, so nobody should look at it.

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
| `JAMSTER_LOG_LEVEL` | `INFO` (the default), `DEBUG`, `WARNING` or `ERROR`. |
| `JAMSTER_LOG_TO` | `file` (the default) or `stdout`. The container image defaults to `stdout`. |
| `JAMSTER_LOG_FILE` | The log file, by default `jamster.log` in the data directory, so `backend/data/jamster.log` in development. |

The log variables are optional.
At `INFO`, the log tells each game move by move: whose turn it is, which song plays, every placement, challenge and reveal, and the standings.
It also records players coming and going, settings changes, logins and imports.
Failures the game survives, such as a song Spotify refuses to play, are `WARNING` lines with Spotify's reason.
`DEBUG` adds every Spotify and MusicBrainz call and every refused request.
Only Jamster's own lines are logged below `WARNING`, so the web server's request lines stay out.
The log names the song in play, so don't watch it during a game.
The log file rotates at 10 MB and keeps five old files.

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
| `backend/src/jamster/curation.py`, `deck.py` | Deck strategies and deck building. |
| `backend/src/jamster/db.py` | The SQLite schema and every query. |
| `backend/src/jamster/web.py` | Routes, the room WebSocket, static files. |
| `backend/src/jamster/logs.py` | Where log records go, and from which level. |
| `frontend/src/` | The React app: `pages/`, `components/`, `useRoom.ts`. |

`backend/src/jamster/messages.py` and `frontend/src/messages.ts` describe the same WebSocket messages and are kept in sync by hand.

There is no migration tool.
After a change to the schema in `db.py`, delete the database file, and every player signs in again.

### Write the curation strategy

The strategy that picks songs for a deck is the one part left as a placeholder.
`majority` in `backend/src/jamster/curation.py` takes every track that at least 65 % of the players have any signal for.

A strategy is a function with the signature of the `Strategy` protocol in that file.
It receives one `TasteProfile` per player, holding their signals per track and per artist: `saved`, `playlist`, `top_short`, `top_medium`, `top_long` and `recent`.
Add the function to `STRATEGIES`, and it appears in the lobby settings.

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

The named volume `jamster-data` holds the SQLite database: Spotify logins, imported libraries and cached release years.

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
