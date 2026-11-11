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

Container, run from the repo root:

- `docker compose up --build`: the production image on 127.0.0.1:8000.
- `docker build -t jamster .`: build the image without needing `.env`.
- Smoke test of that image with dummy credentials, on port 8765:

  ```sh
  docker run --rm -d --name jamster-smoke -p 127.0.0.1:8765:8000 \
    -e JAMSTER_SPOTIFY_CLIENT_ID=x -e JAMSTER_SPOTIFY_CLIENT_SECRET=x \
    -e JAMSTER_SESSION_SECRET=x jamster
  curl -sf --retry 40 --retry-all-errors --retry-delay 1 http://127.0.0.1:8765/healthz
  docker stop jamster-smoke
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
- `backend/src/jamster/curation.py`, `deck.py`: deck strategies and deck building.
- `backend/src/jamster/db.py`: the schema and every SQL statement.
- `backend/src/jamster/web.py`: routes, the room WebSocket, static files.
- `backend/tests/fake_spotify.py`: stands in for Spotify and MusicBrainz in tests.
- `frontend/src/`: `messages.ts`, `useRoom.ts`, `pages/`, `components/`.

## Rules

- The app is called Jamster. Keep the Hitster name, branding and look out of all code and design.
- `backend/src/jamster/messages.py` and `frontend/src/messages.ts` mirror each other by hand. Change both in the same edit.
- `engine.py` stays pure: no I/O, no clock, no randomness. Every rule change gets a test in `tests/test_engine.py`.
- All SQL goes in `db.py`. There are no migrations: change `SCHEMA`, and say that the database file must be deleted.
- Run exactly one server process. Rooms live in memory.
- Curation strategies are pure functions registered in `curation.STRATEGIES`. Never send Spotify data to an ML model or an LLM; Spotify's developer policy forbids it.
- Before adding a Spotify API call, check that Development Mode still offers it (see Pitfalls in the brief). There is no batch `GET /tracks`, no artist top tracks and no `popularity` field.
- Call MusicBrainz only through `YearResolver`, which keeps to one request per second.
- Tests never touch the network. Use `FakeSpotify` as the `transport` of `create_app`.
- In `frontend/vite.config.ts`, keep proxy entries in object form. The string shorthand rewrites the Host header, which breaks the Spotify callback URL.
- Check `uv.lock` and `package-lock.json` in whenever dependencies change.
