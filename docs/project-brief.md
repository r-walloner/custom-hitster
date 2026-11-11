# Jamster

A web party game for one friend group: a song plays, the player on turn places it on their timeline by release year, and the deck is curated from the players' own Spotify libraries.

## Scope

**Purpose.** A private tool for one friend group. Never published.

**Users.** 2 to 10 players per game, of which at most 5 have Spotify connected (Spotify's limit, see Pitfalls). In person: the host's device plays the music and shows the board, and others may join on their phones. Remote: everyone opens the room link in a browser while talking on a Discord call.

**Requirements.**

- Players sign in with Spotify once. The server keeps their login and a copy of their library.
- A deck is curated per group from those libraries, through a pluggable strategy.
- Each card carries the year the song first came out, not the year of a remaster.
- The game follows the Original rules of the card game Hitster ([rules](https://hitstergame.com/de-at/pages/spielregeln-original)): timelines, challenges in buzz order, tokens, first to 10 cards.
- The server starts each song on the host's Spotify (local mode) or on every connected player's Spotify (remote mode).
- The host can act for any player, so a whole game works on one device.
- Naming title and artist is said aloud and confirmed with a tap.
- No Hitster name, branding or look in the app's code or design.

**Non-goals.** Public release. Discord integration. Pro, Expert and co-op variants. Game history and statistics. Typed answers with automatic matching. ML or LLM curation.

## How it works

A player signs in with Spotify, and a background import copies their saved tracks, own playlists, top tracks and artists and recent plays into the database as tracks plus taste signals ("saved", "rank 3 of top tracks"). A host creates a room and others join by link, with or without Spotify. When the host starts the game, the curation strategy picks the deck from the players' signals at once. The year resolver looks up each card's first release year and caches it, but only for the opening cards before the game starts (one per player plus the first song, preferring cached ones). The rest of the deck is resolved in deck order while the game runs, and a draw waits only if its card has no year yet. The game itself is a pure state machine held in server memory: clients send intents over a WebSocket, the server applies them and sends every client the full new state. The card in play is never sent to clients before the reveal. Whenever the card in play changes, the server tells Spotify to play it on the right accounts, and a failure there shows up in the room as something to retry, without stopping the game.

## Decisions

| Decision | Chosen | Rejected | Why | Reversal cost |
|---|---|---|---|---|
| Game rules | Timeline game with a buzzer for challenges | Buzzer quiz; both as modes | Matches the rules the project is modelled on | High |
| Discord | A plain web link used during a call | Discord Activity; Discord bot | No integration to build; Spotify login inside Discord's iframe is awkward | Medium |
| Local play | Host screen, phones optional, host can act for anyone | One device only; phones required | Same code path as remote play | Low |
| Backend | Python 3.14, FastAPI | TypeScript on Node | Curation work benefits from Python; matches the prototype | Very high |
| Frontend | React 19 single-page app built with Vite | Svelte; server-rendered HTML with HTMX | User's choice; live shared state needs a component framework | Very high |
| Real-time | One WebSocket per client, full state after every change | Diffs; polling | About ten message types and tiny states; nothing to keep in sync | Medium |
| Storage | SQLite, plain SQL in `db.py` | JSON files; Postgres | Relational data, one writer, no extra service | High |
| Game state | Server memory only | Persisted games | A restart ending a game is acceptable | Medium |
| Playback | Server starts tracks on a device each player picks | Spotify Web Playback SDK in the game tab | Works on every device; the SDK is shaky on iPhone | Low: the SDK would appear as one more device |
| Years | MusicBrainz lookup by ISRC, earliest plausible year wins, Spotify date as fallback | Spotify date only; manual fixes by the host | Spotify dates are often a remaster's | Low |
| When years are looked up | Opening cards before the start, the rest in the background during the game | The whole deck before the start | At one lookup per second a fresh 60-card deck kept everyone waiting a minute | Low |
| Curation | Strategy interface plus a "known to 65 % of players" default | A designed strategy now | The real strategy is deliberately left open | Low |
| Answers | Said aloud, confirmed by host or active player | Typed and fuzzy-matched | No matching code; fits a party game | Low |
| Access | Spotify sign-in to host, guests join by link | Site password; no restriction | Spotify's allowlist already limits who can sign in | Low |
| Hosting | One container on the existing VM, behind its existing Caddy | Laptop plus tunnel; managed host | User's VM and proxy already exist | Low |
| Local development | Native `fastapi dev` plus Vite; same image via compose to check a build | Dev containers with hot reload | Fast reload, less config | Low |
| Spotify client | Hand-written on `httpx` | `spotipy` | spotipy is synchronous and would block the server | Low |
| Callback URL | `JAMSTER_BASE_URL` in production, the request's Host header when unset | Always configured | Zero config locally on both ports | Low |
| Type checker | pyright | ty | ty is still a 0.0.x beta | Low |

## Complexity budget

Deliberately left out:

- **ORM and migration tool.** Six tables and one developer. `SCHEMA` in `db.py` is applied at startup. After an incompatible change, delete the database; players sign in again.
- **Layered architecture.** One module per responsibility is enough at this size.
- **Generated TypeScript types.** `messages.ts` mirrors `messages.py` by hand.
- **Frontend tests.** The backend end-to-end tests cover the wiring.
- **Job queue, Redis, several workers.** Imports and year lookups are tasks inside the one server process. Rooms live in memory, so there must be exactly one process.
- **Encrypting stored refresh tokens.** The key would sit next to the database.
- **CI.** Solo project, deployed by hand.
- **State library, CSS framework, translations.**
- **Caddy in this repository.** The VM's proxy handles HTTPS.

## Pitfalls

- **Spotify limits this to five accounts and forbids the use.** The Spotify app is in Development Mode: at most 5 users, each added by email in the developer dashboard, and the owner needs Premium. The developer policy forbids games (III.2) and feeding Spotify data to ML models or LLMs (III.14). The realistic consequence for a private tool is that Spotify revokes the app's credentials.
- **Playback fails routinely.** Controlling playback needs Premium on that account, and phone apps drop off the device list when locked. Spotify no longer reports whether an account has Premium. So playback failure is a normal room state with a retry, and the lobby has a "Test playback" button.
- **The Spotify API is narrower than it was in 2024.** In Development Mode there is no batch track lookup, no artist top tracks, no `popularity`, and playlist contents only for playlists the player owns or collaborates on (`/playlists/{id}/items`). The request quota is shared across the developer account, so the importer runs one library at a time and waits out rate limits.
- **A remaster can carry the remaster's year in MusicBrainz too.** The resolver takes the earliest plausible year from MusicBrainz and Spotify, and stores which source won. A row with source `manual` in the `years` table is never overwritten.
- **Vite's proxy shorthand rewrites the Host header.** The backend builds the Spotify callback URL and checks the WebSocket origin from the Host header, so `vite.config.ts` must keep the object form (`{ target: … }`).

## Open questions

- **The real curation strategy.** The default treats any signal as "knows it" and does not merge remasters or duplicates of one song. Settled by writing a strategy in `curation.py`.
- **Titles are visible in the Spotify app.** Whoever looks at the playing device sees the answer. The Web Playback SDK would hide it; decide after playing a few games.
- **Wrong years.** There is no screen to correct one; today it takes an SQL update with source `manual`. Decide whether the host needs a button after seeing how often it happens.
- **`httpx` or `httpx2`.** FastAPI's test client now uses `httpx2`, the successor maintained by the Pydantic team. The app still uses `httpx` 0.28. Migrate when `httpx` stops getting fixes.
- **How the VM's Caddy reaches the container.** `compose.yaml` publishes `127.0.0.1:8000`, which suits a Caddy running on the host. A Caddy in Docker needs a shared network instead.

## State of the scaffold

**Level.** Beyond level 3: everything is implemented. Only the real curation strategy is left open, by design.

**Built.**

- Backend: Spotify login and token refresh, library import, MusicBrainz year resolver, curation interface with the default strategy, deck builder, rules engine, rooms with playback control, HTTP and WebSocket layer, SQLite store.
- Frontend: home page (sign in, library, create or join a room), lobby (players, settings, device picker, start), game board with controls for every phase.
- Operations: `Dockerfile`, `compose.yaml`, `.env.example`.
- Tests: 61, covering the engine, year picking, curation, the opening deal and whole games against a fake Spotify.

**Stubbed.** The curation strategy: `majority` in `backend/src/jamster/curation.py` is a placeholder marked with a TODO.

**Verified** (2026-11-11).

- `uv run ruff format .`, `uv run ruff check .`, `uv run pyright`: clean.
- `uv run pytest`: 61 passed, five runs in a row.
- `npm run lint`, `npm run build`: clean.
- `docker build -t jamster .`: builds. The container started with dummy credentials answers `/healthz`, serves the app on `/room/ABCD`, and redirects `/auth/login` to Spotify.
- Dev servers together: through Vite on port 5173 the login redirect carries the 5173 callback, the room socket connects, and a socket from a foreign origin is refused.

**Not verified.** Nothing has run against the real Spotify or MusicBrainz, and the interface has never been opened in a browser: it is type-checked and built only.
