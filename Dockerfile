# syntax=docker/dockerfile:1

# --- build the frontend ---------------------------------------------------------------------
FROM node:24-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- the app: FastAPI serving the API, the WebSocket and the built frontend -----------------
FROM python:3.14-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /bin/
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_NO_DEV=1
WORKDIR /app

# Dependencies first, so this layer is reused until the lockfile changes.
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=backend/uv.lock,target=uv.lock \
    --mount=type=bind,source=backend/pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project
COPY backend/ ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked
COPY --from=frontend /frontend/dist ./static

RUN useradd --uid 10001 --no-create-home jamster && mkdir /data && chown jamster /data
USER jamster
ENV PATH="/app/.venv/bin:$PATH" \
    JAMSTER_STATIC_DIR=/app/static \
    JAMSTER_DATA_DIR=/data \
    JAMSTER_LOG_TO=stdout
VOLUME /data
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz')"]

# One process only: rooms live in memory, so several workers would each see different rooms.
CMD ["fastapi", "run", "--port", "8000"]
