# syntax=docker/dockerfile:1

FROM python:3.14-alpine AS builder

COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /bin/
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_DEV=1 \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project

COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-editable


FROM python:3.14-alpine AS runtime

WORKDIR /app

RUN adduser -D -H -u 10001 jamster && mkdir /data && chown jamster /data
COPY --from=builder /app/.venv .venv

USER jamster
ENV PATH="/app/.venv/bin:$PATH" \
    JAMSTER_DATA_DIR=/data \
    JAMSTER_LOG_TO=stdout
VOLUME /data
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
    CMD ["wget", "-qO-", "http://127.0.0.1:8000/healthz"]

# One process only: rooms live in memory.
CMD ["fastapi", "run", "--entrypoint", "jamster.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--forwarded-allow-ips", "*"]
