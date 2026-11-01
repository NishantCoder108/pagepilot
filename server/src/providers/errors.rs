use crate::error::ApiError;
use axum::http::StatusCode;
use futures_util::StreamExt;
use serde_json::Value;

pub(super) fn status_error(status: StatusCode) -> ApiError {
    match status.as_u16() {
        401 | 403 => ApiError::new(
            StatusCode::UNAUTHORIZED,
            "provider_auth",
            "The provider rejected this key or model access. Check your key, API billing, and permissions.",
        ),
        404 => ApiError::bad(
            "provider_model",
            "This model is unavailable to your account or has been retired. Choose another supported model.",
        ),
        429 => ApiError::new(
            StatusCode::TOO_MANY_REQUESTS,
            "provider_rate_limit",
            "The provider's rate limit or API quota was reached. Check billing or wait before retrying.",
        ),
        400 | 413 | 422 => ApiError::bad(
            "provider_request",
            "The provider rejected this request. Try a shorter source or another supported model.",
        ),
        _ => ApiError::new(
            StatusCode::BAD_GATEWAY,
            "provider_unavailable",
            "The provider is unavailable. Please retry later.",
        ),
    }
}

pub(super) fn classify_error(status: StatusCode, body: &Value) -> ApiError {
    let invalid_key = body["error"]["details"].as_array().is_some_and(|details| {
        details.iter().any(|detail| {
            detail["reason"] == "API_KEY_INVALID" || detail["reason"] == "API_KEY_EXPIRED"
        })
    });
    if invalid_key || body["error"]["status"] == "UNAUTHENTICATED" {
        status_error(StatusCode::UNAUTHORIZED)
    } else {
        status_error(status)
    }
}

pub(super) async fn upstream_error(response: reqwest::Response) -> ApiError {
    let status = response.status();
    let mut body = Vec::new();
    let mut chunks = response.bytes_stream();
    while let Some(Ok(chunk)) = chunks.next().await {
        if body.len() + chunk.len() > 32_000 {
            break;
        }
        body.extend_from_slice(&chunk);
    }
    // Inspect machine-readable categories only; never return/log upstream text.
    classify_error(
        status,
        &serde_json::from_slice::<Value>(&body).unwrap_or(Value::Null),
    )
}

pub(super) fn stream_error() -> ApiError {
    ApiError::new(
        StatusCode::BAD_GATEWAY,
        "stream_interrupted",
        "The provider stream was interrupted. Partial output is saved; retry explicitly when ready.",
    )
}
pub(super) fn stop_error() -> ApiError {
    ApiError::new(
        StatusCode::BAD_GATEWAY,
        "generation_incomplete",
        "The provider stopped before finishing (output limit or safety restriction). Partial output is saved. Try a shorter request.",
    )
}
