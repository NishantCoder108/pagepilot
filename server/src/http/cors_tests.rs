use super::app;
use crate::{
    config::{AppState, Config},
    origin::OriginPolicy,
};
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt;

const FRONTEND: &str = "https://pagepilot.example";

fn split_app() -> axum::Router {
    let mut config = Config::from_env();
    config.origins = OriginPolicy::from_list(FRONTEND).unwrap();
    config.serve_frontend = false;
    app(AppState::new(config))
}

fn extraction(origin: &str) -> Request<Body> {
    Request::post("/api/extract")
        .header("origin", origin)
        .header("sec-fetch-site", "cross-site")
        .header("content-type", "application/json")
        .body(Body::from(r#"{"text":"A readable source."}"#))
        .unwrap()
}

#[tokio::test]
async fn permits_preflight_for_json_and_provider_key_headers() {
    let response = split_app()
        .oneshot(
            Request::builder()
                .method("OPTIONS")
                .uri("/api/generate")
                .header("origin", FRONTEND)
                .header("access-control-request-method", "POST")
                .header(
                    "access-control-request-headers",
                    "content-type,x-provider-key",
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["access-control-allow-origin"], FRONTEND);
    let headers = response.headers()["access-control-allow-headers"]
        .to_str()
        .unwrap();
    assert!(headers.contains("content-type") && headers.contains("x-provider-key"));
    assert!(
        !response
            .headers()
            .contains_key("access-control-allow-credentials")
    );
}

#[tokio::test]
async fn permits_allowlisted_cross_site_post_but_not_other_origins() {
    let router = split_app();
    let response = router.clone().oneshot(extraction(FRONTEND)).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["access-control-allow-origin"], FRONTEND);
    for origin in ["https://untrusted.example", "null"] {
        let response = router.clone().oneshot(extraction(origin)).await.unwrap();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
        assert!(
            !response
                .headers()
                .contains_key("access-control-allow-origin")
        );
    }
}

#[tokio::test]
async fn cors_headers_are_present_on_application_errors() {
    let response = split_app()
        .oneshot(
            Request::post("/api/generate")
                .header("origin", FRONTEND)
                .header("sec-fetch-site", "cross-site")
                .header("content-type", "application/json")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(response.headers()["access-control-allow-origin"], FRONTEND);
    assert!(response.headers().contains_key("x-request-id"));
}

#[tokio::test]
async fn preserves_same_origin_browser_posts_without_an_allowlist() {
    let router = app(AppState::new(Config::from_env()));
    let mut request = extraction("http://127.0.0.1:3000");
    request
        .headers_mut()
        .insert("host", "127.0.0.1:3000".parse().unwrap());
    request
        .headers_mut()
        .insert("sec-fetch-site", "same-origin".parse().unwrap());
    assert_eq!(
        router.oneshot(request).await.unwrap().status(),
        StatusCode::OK
    );
}

#[tokio::test]
async fn api_only_mode_has_a_landing_response_without_static_files() {
    let response = split_app()
        .oneshot(Request::get("/").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["content-type"], "application/json");
}
