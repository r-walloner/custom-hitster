# syntax=docker/dockerfile:1

FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build


FROM caddy:2.11-alpine as runtime

RUN adduser -D -H -u 10002 caddy && chown caddy /data /config
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /srv

USER caddy

EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
    CMD ["wget", "-qO-", "http://127.0.0.1:8081/"]
