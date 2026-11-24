# Jamster

A private web party game for one friend group: songs from the players' Spotify libraries are placed on timelines by release year. Decisions, rejected alternatives and Spotify's constraints are in `docs/project-brief.md`; read it before changing the design.

## Commands

Backend, run from `backend/`:

- `uv run fastapi dev`: API on 127.0.0.1:8000 with reload. Needs `.env` in the repo root.
- `uv run pytest`: all tests. One test: `uv run pytest tests/test_engine.py -k steals`.
- `uv run ruff format . && uv run ruff check . && uv run pyright`: run before calling a change done.

Frontend, run from `frontend/`:

- `npm run dev`: Vite on http://127.0.0.1:5173, proxying `/api`, `/auth` and `/ws` to port 8000.
- `npm run lint && npm run build`: lint, type-check and build.

Containers, run from the repo root:

- `docker compose up --build`: both production images, the app on 127.0.0.1:8000.
- `docker compose build`: build both images (`jamster-game-backend`, `jamster-game-frontend`) without needing `.env`.
- Smoke test of those images with dummy credentials, on port 8765:

  ```sh
  docker network create jamster-smoke
  docker run --rm -d --name jamster-smoke-backend --network jamster-smoke --network-alias backend \
    -e JAMSTER_SPOTIFY_CLIENT_ID=x -e JAMSTER_SPOTIFY_CLIENT_SECRET=x \
    -e JAMSTER_SESSION_SECRET=x jamster-game-backend
  docker run --rm -d --name jamster-smoke-frontend --network jamster-smoke \
    -p 127.0.0.1:8765:8080 jamster-game-frontend
  curl -sf --retry 40 --retry-all-errors --retry-delay 1 http://127.0.0.1:8765/healthz
  docker stop jamster-smoke-frontend jamster-smoke-backend && docker network rm jamster-smoke
  ```

The skeletons were generated once, from the repo root, and need no re-running:

```sh
uv init --package --name jamster --python 3.14 --vcs none --no-readme backend
(cd backend && uv add "fastapi[standard]" httpx pydantic-settings itsdangerous)
(cd backend && uv add --dev pytest pytest-timeout ruff pyright)
npm create vite@latest frontend -- --template react-ts --no-interactive
(cd frontend && npm install && npm install react-router)
```

## Layout

- `backend/src/jamster/engine.py`: the game rules, a pure state machine.
- `backend/src/jamster/rooms.py`: in-memory rooms, socket message handling, playback.
- `backend/src/jamster/spotify.py`, `importer.py`, `years.py`: Spotify client, library import, MusicBrainz years.
- `backend/src/jamster/curation/`: deck strategies (Strategy pattern). `base.py` the interface and its inputs, `songs.py` the shared building blocks, one module per strategy, `report.py` the Markdown and JSON-lines output, `__main__.py` the command `uv run python -m jamster.curation` that tries a strategy against `data/jamster.db` and writes a Markdown report and JSON lines to `data/curation/` (or `--out`).
- `backend/src/jamster/deck.py`: the context that loads the pool, runs a strategy and writes the deck to the room's folder in `data/rooms/`, as a Markdown report and as JSON lines.
- `backend/src/jamster/classics.py`, `classics.json`: the hand-written list of well-known songs with their years and Spotify tracks, copied into the database at startup. After adding songs to the list, run `uv run python -m jamster.classics` to look up their tracks.
- `backend/src/jamster/db.py`: the schema and every SQL statement.
- `backend/src/jamster/web.py`: routes and the room WebSocket. The backend serves no frontend files.
- `backend/src/jamster/logs.py`: logging setup. Modules log via `logging.getLogger(__name__)`; rooms via `room.log`, which prefixes the room code and also writes to `room.log` in the room's folder, `data/rooms/<time>-<code>/`.
- `backend/tests/fake_spotify.py`: stands in for Spotify and MusicBrainz in tests.
- `frontend/src/`:
  - `api/`: talking to the backend. `messages.ts` (the socket messages), `http.ts` (REST calls), `useRoom.ts` (the room socket), `useMe.ts`.
  - `components/`: the reusable components, props in and markup out: generic building blocks (buttons, inputs, rows, year chips, dialog, toast, stepper) and anything several screen folders use. Most wrap the design system's `jm-` classes. `types.ts` holds the shapes they draw (`Player`, `Song`).
  - `screens/`: one folder per area of the design's screen boards. `room/` is the `/room/:code` page: `Room.tsx` connects, picks the stage from the room state, and shows toasts, Reconnecting and RoomNotFound; `context.ts` gives every room screen `useRoomTools()`. `lobby/`, `dealing/`, `game/` and `winner/` are the stages it shows; `settings/`, `playback/` and `library/` are its sub-screens; `settings/` and `playback/` also hold the pop-ups the game menu opens for them (`GameSettings`, `PlaybackDialog`). `library/` (Your songs, the deck picker) is also the `/library` page, reached from `home/`, which is also the logged-in player's menu (host, your songs, the Account pop-up). `game/` switches on the phase; `game/phases/` holds the four phase screens.
  - `words.ts`: numbers and lists in words.
- Where frontend code goes:
  - A screen folder holds its screens at the top: each design board, dialogs included, with its `.css`.
  - A specialised composite only one screen folder uses goes in that folder's `components/` subfolder, even when the design system defines it (`game/components/` holds MomentPanel, Board and MiniScoreboard). Once a second screen folder needs it, it moves to `src/components/`. A generic building block goes in `src/components/` even with one user.
  - Design-system components keep the name of their `docs/design/system/components/<Name>` folder wherever they live.
  - `.tsx` files render; `.ts` files hold the logic, as pure functions over the state or hooks, with no JSX. Game rules the screens need ahead of the server are in `screens/game/rules.ts`.
  - Logic stays in the folder of the screen it serves; other folders import it from there. Only app-wide code sits at the top of `src/`.
  - `src/components/` never imports from `screens/` or `api/` and never reads the room context.
- `frontend/src/styles/`: `tokens.css` and `jamster.css` are copies of `docs/design/system/tokens.css` and `components/bundle.css`; re-copy them when the system changes. `app.css` holds the app's own additions. `desktop.css` is the app's conversion of the system's `components/desktop.css`: the shared desktop rules, keyed off the `.jm-desktop` root class over the `jm-` markup.
- Desktop layouts: `components/AppFrame.tsx` switches to them in a window at least 1200 × 640 (no zoom, `.jm-desktop` on the app; `useDesktop()` for the rare script that needs to know). Each screen's desktop rules go at the end of its own `.css`, under `.jm-desktop`; markup only desktop shows is rendered always and hidden on the phone. See `docs/design/system/components/Desktop/README.md`.
- `backend/Dockerfile`, `frontend/Dockerfile`, `compose.yaml`: two Alpine images, each built in two stages. `frontend/Caddyfile` makes Caddy serve the built app and proxy `/api`, `/auth`, `/ws` and `/healthz` to the backend, passing the browser's Host through. It renders `index.html` as a template, so the link preview's `og:image` names the host it was requested from.
- `frontend/public/`: copies of `docs/design/app-assets/export/` (icons, manifest, screenshots, launch images, link preview), minus the two files for pasting. Re-copy them when the assets are regenerated; their `<head>` tags are in `frontend/index.html`.
- `docs/design/`: the design system and the screen mock-ups the frontend is built from.

## Rules

- The app is called Jamster. Keep the Hitster name, branding and look out of all code and design.
- `backend/src/jamster/messages.py` and `frontend/src/api/messages.ts` mirror each other by hand. Change both in the same edit.
- `engine.py` stays pure: no I/O, no clock, no randomness. Every rule change gets a test in `tests/test_engine.py`.
- All SQL goes in `db.py`. There are no migrations: change `SCHEMA`, and say that the database file must be deleted.
- Run exactly one server process. Rooms live in memory.
- Curation strategies are `CurationStrategy` subclasses in `curation/`, dataclasses whose fields are their parameters, registered in `curation.STRATEGIES` and named in `frontend/src/screens/settings/options.ts`. `rules()` and `scores()` explain them in the Markdown report; keep them in step with `curate`. They stay pure and make no year lookups: they use cached years, else Spotify's. Every pick carries a `Why`. Never send Spotify data to an ML model or an LLM; Spotify's developer policy forbids it.
- Before adding a Spotify API call, check that Development Mode still offers it (see Pitfalls in the brief). There is no batch `GET /tracks`, no artist top tracks and no `popularity` field.
- Call MusicBrainz only through `YearResolver`, which keeps to one request per second.
- Logging: game and room events at INFO, as one short readable sentence each (names, not ids); outside calls and refused requests at DEBUG; failures the app survives at WARNING. Don't log the same fact twice. Never log tokens or secrets.
- Tests never touch the network, and never read `.env`: build settings with `OfflineSettings` from `tests/offline_settings.py`. Use `FakeSpotify` as the `transport` of `create_app`.
- Inside `/room/:code` the room state picks the screen; sub-screens (settings, playback, library) and pop-ups (add player, menu, scoreboard) are component state in `screens/room/Room.tsx`, not routes.
- Backend work the designed screens still need is listed under "Backend TODOs for the designed screens" in `README.md`. Check it before changing the backend or a screen's fallback, and update it when an item is done.
- In `frontend/vite.config.ts`, keep proxy entries in object form. The string shorthand rewrites the Host header, which breaks the Spotify callback URL.
- Check `uv.lock` and `package-lock.json` in whenever dependencies change.
