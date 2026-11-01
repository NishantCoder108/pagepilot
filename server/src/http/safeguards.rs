use crate::{config::AppState, error::ApiError};
use axum::{
    extract::{ConnectInfo, State},
    http::{StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::{
    net::{IpAddr, SocketAddr},
    time::Instant,
};

pub(super) async fn safeguards(
    State(state): State<AppState>,
    req: axum::extract::Request,
    next: Next,
) -> Response {
    let start = Instant::now();
    let category = match req.uri().path() {
        "/api/extract" => "extract",
        "/api/generate" => "generate",
        "/api/models" => "models",
        "/health" => "health",
        _ => "static",
    };
    if req.method() == axum::http::Method::POST {
        if !state.config.origins.permits(req.headers()) {
            return ApiError::new(
                StatusCode::FORBIDDEN,
                "cross_site",
                "This frontend origin is not allowed to use the API.",
            )
            .into_response();
        }
        let ip = req
            .extensions()
            .get::<ConnectInfo<SocketAddr>>()
            .map(|v| v.0.ip())
            .unwrap_or(IpAddr::from([127, 0, 0, 1]));
        let allowed = state
            .rates
            .lock()
            .map(|mut rates| rates.allow(ip, state.config.requests_per_minute))
            .unwrap_or(false);
        if !allowed {
            let mut response = ApiError::new(
                StatusCode::TOO_MANY_REQUESTS,
                "rate_limited",
                "Too many requests. Wait a minute before trying again.",
            )
            .into_response();
            response
                .headers_mut()
                .insert("retry-after", "60".parse().unwrap());
            return response;
        }
    }
    let _request_permit = match state.request_slots.clone().try_acquire_owned() {
        Ok(permit) => permit,
        Err(_) => return ApiError::busy().into_response(),
    };
    let mut response = match tokio::time::timeout(state.config.request_timeout, next.run(req)).await
    {
        Ok(response) => response,
        Err(_) => ApiError::new(
            StatusCode::REQUEST_TIMEOUT,
            "request_timeout",
            "The request took too long. Please try again.",
        )
        .into_response(),
    };
    if !response.headers().contains_key("x-request-id") {
        response.headers_mut().insert(
            "x-request-id",
            uuid::Uuid::new_v4().to_string().parse().unwrap(),
        );
    }
    let h = response.headers_mut();
    h.insert("x-content-type-options", "nosniff".parse().unwrap());
    h.insert("referrer-policy", "no-referrer".parse().unwrap());
    h.insert("x-frame-options", "DENY".parse().unwrap());
    h.insert(
        "permissions-policy",
        "camera=(), microphone=(), geolocation=()".parse().unwrap(),
    );
    h.insert("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'".parse().unwrap());
    if category != "static" {
        h.insert(header::CACHE_CONTROL, "no-store".parse().unwrap());
    }
    tracing::info!(
        route = category,
        status = response.status().as_u16(),
        elapsed_ms = start.elapsed().as_millis() as u64,
        request_id = response
            .headers()
            .get("x-request-id")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("unknown"),
        "request"
    );
    response
}
