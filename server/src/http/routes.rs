use super::{
    handlers::{extract_handler, generate_handler},
    safeguards::safeguards,
};
use crate::{config::AppState, error::ApiError, types};
use axum::{
    Json, Router,
    extract::DefaultBodyLimit,
    http::StatusCode,
    middleware,
    routing::{get, post},
};
use tower_http::services::{ServeDir, ServeFile};

pub(crate) fn app(state: AppState) -> Router {
    let static_files = ServeDir::new(&state.config.web_dir).not_found_service(ServeFile::new(
        format!("{}/index.html", state.config.web_dir),
    ));
    Router::new()
        .route(
            "/health",
            get(|| async { Json(serde_json::json!({"status":"ok","service":"pagepilot"})) }),
        )
        .route(
            "/api/models",
            get(|| async { Json(serde_json::json!({"models":types::models()})) }),
        )
        .route("/api/extract", post(extract_handler))
        .route("/api/generate", post(generate_handler))
        .route(
            "/api/{*rest}",
            axum::routing::any(|| async {
                ApiError::new(StatusCode::NOT_FOUND, "not_found", "API route not found.")
            }),
        )
        .method_not_allowed_fallback(|| async {
            ApiError::new(
                StatusCode::METHOD_NOT_ALLOWED,
                "method_not_allowed",
                "This HTTP method is not supported.",
            )
        })
        .fallback_service(static_files)
        .layer(DefaultBodyLimit::max(state.config.max_request_bytes))
        .layer(middleware::from_fn_with_state(state.clone(), safeguards))
        .with_state(state)
}
