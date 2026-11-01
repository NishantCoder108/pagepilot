FROM node:24-bookworm-slim AS web
WORKDIR /build/web
COPY scripts/check-file-size.mjs /build/scripts/check-file-size.mjs
COPY server/src/ /build/server/src/
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM rust:1.97-bookworm AS server
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY server/ ./server/
RUN cargo build --release --locked

FROM debian:bookworm-slim
RUN groupadd --system pagepilot && useradd --system --gid pagepilot --home-dir /app pagepilot
WORKDIR /app
COPY --from=server /build/target/release/pagepilot /app/pagepilot
COPY --from=web /build/web/dist /app/web/dist
USER pagepilot
ENV BIND_ADDR=0.0.0.0:3000 WEB_DIR=/app/web/dist
EXPOSE 3000
STOPSIGNAL SIGINT
CMD ["/app/pagepilot"]
