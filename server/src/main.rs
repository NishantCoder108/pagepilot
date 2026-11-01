mod config;
mod error;
mod extract;
mod fetch;
mod http;
mod providers;
mod types;

use config::{AppState, Config};
use http::app;
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    // Keep dependency debug logs disabled: HTTP errors can contain sensitive URLs.
    tracing_subscriber::fmt()
        .with_env_filter("pagepilot=info")
        .init();
    let state = AppState::new(Config::from_env());
    let bind = state.config.bind;
    let listener = tokio::net::TcpListener::bind(bind)
        .await
        .expect("bind address available");
    tracing::info!(%bind, "PagePilot ready");
    axum::serve(
        listener,
        app(state).into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(async {
        let _ = tokio::signal::ctrl_c().await;
    })
    .await
    .expect("HTTP server");
}
