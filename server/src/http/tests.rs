use super::{RateLimiter, app};
use crate::config::{AppState, Config};
use axum::http::StatusCode;
use axum::{body::Body, http::Request};
use http_body_util::BodyExt;
use tower::ServiceExt;

#[tokio::test]
async fn extraction_contract_and_safe_errors() {
    let router = app(AppState::new(Config::from_env()));
    let response = router
        .clone()
        .oneshot(
            Request::post("/api/extract")
                .header("content-type", "application/json")
                .body(Body::from(
                    r##"{"text":"# Demo\n\nTokio runs asynchronous tasks.","title":"Demo"}"##,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().contains_key("x-request-id"));
    let body: serde_json::Value =
        serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!(body["passages"][0]["id"], "p1");
    let response = router
        .oneshot(
            Request::post("/api/extract")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"text":"secret","unexpected":"do not echo me"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    let header_id = response.headers()["x-request-id"]
        .to_str()
        .unwrap()
        .to_owned();
    let body = String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec(),
    )
    .unwrap();
    assert!(!body.contains("secret"));
    assert!(!body.contains("do not echo"));
    assert!(body.contains(&header_id));
}

#[test]
fn rate_limits_are_bounded() {
    let mut limiter = RateLimiter::default();
    let ip = "1.1.1.1".parse().unwrap();
    assert!(limiter.allow(ip, 1));
    assert!(!limiter.allow(ip, 1));
}

#[tokio::test]
async fn bounds_slow_request_bodies_and_rejects_over_capacity() {
    let mut config = Config::from_env();
    config.request_timeout = std::time::Duration::from_millis(10);
    config.request_slots = 1;
    let state = AppState::new(config);
    let router = app(state.clone());
    let permit = state.request_slots.clone().acquire_owned().await.unwrap();
    let response = router
        .clone()
        .oneshot(Request::get("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    drop(permit);
    let pending = futures_util::stream::pending::<Result<axum::body::Bytes, std::io::Error>>();
    let response = router
        .oneshot(
            Request::post("/api/extract")
                .header("content-type", "application/json")
                .body(Body::from_stream(pending))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::REQUEST_TIMEOUT);
    assert_eq!(state.request_slots.available_permits(), 1);
}
