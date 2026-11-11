"""The HTTP and WebSocket surface: login, the few REST endpoints, the room socket, static files."""

import random
import secrets
from contextlib import asynccontextmanager
from typing import Any
from urllib.parse import urlsplit

import httpx
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from . import db, years
from .config import Settings
from .importer import Importer
from .rooms import Rooms, Services
from .spotify import Spotify, SpotifyError

SESSION_DAYS = 90
# WebSocket close codes the frontend understands.
NO_SESSION, NO_SUCH_ROOM = 4401, 4404


def create_app(
    settings: Settings,
    *,
    transport: httpx.AsyncBaseTransport | None = None,  # tests pass a fake Spotify here
    year_interval: float = years.MIN_INTERVAL,
    rng: random.Random | None = None,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        conn = db.connect(settings.data_dir / "jamster.db")
        async with httpx.AsyncClient(transport=transport, timeout=15) as http:
            spotify = Spotify(settings, conn, http)
            importer = Importer(conn, spotify)
            resolver = years.YearResolver(
                conn, http, settings.musicbrainz_contact, min_interval=year_interval
            )
            app.state.services = Services(conn, spotify, importer, resolver, rng or random.Random())
            app.state.rooms = Rooms(app.state.services)
            importer.listeners.append(app.state.rooms.on_library_change)
            yield
        conn.close()

    app = FastAPI(title="Jamster", lifespan=lifespan, docs_url=None, redoc_url=None)
    secure = bool(settings.base_url and settings.base_url.startswith("https://"))
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        session_cookie="jamster_session",
        max_age=SESSION_DAYS * 24 * 3600,
        same_site="lax",
        https_only=secure,
    )

    def services(request: Request) -> Services:
        return request.app.state.services

    def signed_in(request: Request) -> db.Player | None:
        """The Spotify player this browser is signed in as, if they still exist."""
        player_id = request.session.get("spotify_id")
        return db.get_player(services(request).conn, player_id) if player_id else None

    def require_player(request: Request) -> db.Player:
        player = signed_in(request)
        if player is None:
            raise HTTPException(401, "Sign in with Spotify first")
        return player

    def callback_url(request: Request) -> str:
        base = settings.base_url or f"http://{request.headers['host']}"
        return f"{base.rstrip('/')}/auth/callback"

    # --- login ---------------------------------------------------------------------------

    @app.get("/auth/login")
    async def login(request: Request, next: str = "/") -> RedirectResponse:
        if not next.startswith("/") or next.startswith("//"):
            next = "/"  # only ever redirect back into this site
        state, redirect_uri = secrets.token_urlsafe(16), callback_url(request)
        request.session["oauth"] = {"state": state, "next": next, "redirect_uri": redirect_uri}
        return RedirectResponse(services(request).spotify.authorize_url(redirect_uri, state))

    @app.get("/auth/callback")
    async def callback(
        request: Request, code: str | None = None, state: str | None = None
    ) -> RedirectResponse:
        oauth = request.session.pop("oauth", None)
        if not oauth or state != oauth["state"]:
            raise HTTPException(400, "This login link is stale. Start again from the home page.")
        if code is None:  # the player pressed Cancel on Spotify's consent screen
            return RedirectResponse("/?error=cancelled")
        s = services(request)
        try:
            player_id, _ = await s.spotify.login(code, oauth["redirect_uri"])
        except SpotifyError as exc:
            # 403 on the first API call: the account is not on the Spotify app's allowlist.
            return RedirectResponse(f"/?error={'not_allowed' if exc.status == 403 else 'spotify'}")
        request.session["spotify_id"] = player_id
        request.session.setdefault("client_id", secrets.token_hex(16))
        if s.importer.status(player_id).status == "none":
            s.importer.start(player_id)
        return RedirectResponse(oauth["next"])

    @app.post("/auth/logout", status_code=204)
    async def logout(request: Request) -> None:
        request.session.pop("spotify_id", None)

    # --- API -----------------------------------------------------------------------------

    @app.get("/api/me")
    async def me(request: Request) -> dict[str, Any]:
        # Every browser gets a client id here; rooms use it to recognise a returning player.
        request.session.setdefault("client_id", secrets.token_hex(16))
        player = signed_in(request)
        if player is None:
            return {"spotify": None}
        library = services(request).importer.status(player.id)
        return {
            "spotify": {
                "id": player.id,
                "name": player.name,
                "library": {
                    "status": library.status,
                    "detail": library.detail,
                    "tracks": library.tracks,
                },
            }
        }

    @app.post("/api/me/import", status_code=202)
    async def start_import(request: Request) -> None:
        services(request).importer.start(require_player(request).id)

    @app.delete("/api/me", status_code=204)
    async def delete_me(request: Request) -> None:
        """Forget this player: token, library and login."""
        player, s = require_player(request), services(request)
        await s.importer.stop(player.id)
        s.spotify.forget(player.id)
        db.delete_player(s.conn, player.id)
        request.session.pop("spotify_id", None)

    @app.post("/api/rooms")
    async def create_room(request: Request) -> dict[str, str]:
        player = require_player(request)
        client_id = request.session.setdefault("client_id", secrets.token_hex(16))
        room = request.app.state.rooms.create(client_id, player.id, player.name)
        return {"code": room.code}

    @app.get("/healthz")
    async def healthz() -> dict[str, bool]:
        return {"ok": True}

    # --- room socket ---------------------------------------------------------------------

    @app.websocket("/ws/rooms/{code}")
    async def room_socket(ws: WebSocket, code: str) -> None:
        # The session cookie is sent on cross-site WebSocket handshakes too, so check the
        # origin ourselves. Non-browser clients send no Origin header and carry no cookie.
        origin = ws.headers.get("origin")
        if origin is not None and urlsplit(origin).netloc != ws.headers.get("host"):
            await ws.close(code=1008)
            return
        await ws.accept()
        client_id = ws.session.get("client_id")
        room = ws.app.state.rooms.get(code)
        if client_id is None or room is None:
            await ws.close(code=NO_SESSION if client_id is None else NO_SUCH_ROOM)
            return
        spotify_id = ws.session.get("spotify_id")
        if spotify_id and db.get_player(ws.app.state.services.conn, spotify_id) is None:
            spotify_id = None
        await room.connect(ws, client_id, spotify_id)
        try:
            while True:
                try:
                    raw = await ws.receive_json()
                except ValueError:
                    raw = None  # not JSON; the room answers with an error
                await room.handle(ws, raw)
        except WebSocketDisconnect:
            pass
        finally:
            await room.disconnect(ws)

    # --- built frontend ------------------------------------------------------------------

    if settings.static_dir is not None:
        static = settings.static_dir.resolve()
        app.mount("/assets", StaticFiles(directory=static / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        async def frontend(path: str) -> FileResponse:
            if path.startswith(("api/", "auth/", "ws/")):
                raise HTTPException(404)
            file = (static / path).resolve()
            if path and file.is_file() and file.is_relative_to(static):
                return FileResponse(file)
            # Client-side routes such as /room/ABCD are served the app itself.
            return FileResponse(static / "index.html")

    return app
