use crate::{
    config::AppState,
    error::ApiError,
    extract, providers,
    types::{self, ExtractRequest, GenerateRequest},
};
use axum::{
    Json,
    extract::{State, rejection::JsonRejection},
    http::HeaderMap,
    response::Response,
};

fn decode<T>(request: Result<Json<T>, JsonRejection>) -> Result<T, ApiError> {
    request.map(|Json(v)| v).map_err(|e| {
        ApiError::new(
            e.status(),
            "invalid_request",
            "Provide valid JSON within the request size limit and documented schema.",
        )
    })
}

pub(super) async fn extract_handler(
    State(state): State<AppState>,
    payload: Result<Json<ExtractRequest>, JsonRejection>,
) -> Result<Json<types::Document>, ApiError> {
    Ok(Json(extract::extract(&state, decode(payload)?).await?))
}

pub(super) async fn generate_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<GenerateRequest>, JsonRejection>,
) -> Result<Response, ApiError> {
    providers::generate(state, headers, decode(payload)?).await
}
