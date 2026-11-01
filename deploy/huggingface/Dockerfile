FROM rust:1.97-bookworm AS build
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY server/ ./server/
RUN cargo build --release --locked

FROM debian:bookworm-slim
RUN groupadd --gid 1000 pagepilot && useradd --uid 1000 --gid 1000 --create-home pagepilot
WORKDIR /app
COPY --from=build --chown=1000:1000 /build/target/release/pagepilot /app/pagepilot
USER 1000:1000
ENV BIND_ADDR=0.0.0.0:7860 SERVE_FRONTEND=false
EXPOSE 7860
STOPSIGNAL SIGINT
CMD ["/app/pagepilot"]
