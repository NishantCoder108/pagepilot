use super::super::{
    context::prepare,
    credentials::credential,
    errors::{classify_error, status_error},
    requests::upstream_request,
};
use crate::types::{GenerateRequest, Provider, models};
use axum::http::{HeaderMap, StatusCode};
use serde_json::{Value, json};

#[tokio::test]
async fn provider_requests_use_fixed_hosts_and_header_only_credentials() {
    let client = reqwest::Client::new();
    for model in models() {
        let input: GenerateRequest = serde_json::from_value(json!({"mode":"summary","provider":model.provider,"model":model.id,"document":{"id":"d","title":"Demo","source_url":null,"extracted_at":0,"passages":[{"id":"p1","heading":null,"text":"Evidence"}]}})).unwrap();
        let prepared = prepare(&input, 200_000).unwrap();
        let mut headers = HeaderMap::new();
        headers.insert("x-provider-key", "NEVER_LOG_THIS_KEY".parse().unwrap());
        let request = upstream_request(
            &client,
            model.provider,
            credential(&headers).unwrap(),
            &prepared,
        )
        .unwrap()
        .build()
        .unwrap();
        let expected = match model.provider {
            Provider::Openai => ("api.openai.com", "authorization"),
            Provider::Anthropic => ("api.anthropic.com", "x-api-key"),
            Provider::Gemini => ("generativelanguage.googleapis.com", "x-goog-api-key"),
        };
        assert_eq!(request.url().host_str(), Some(expected.0));
        assert!(request.headers()[expected.1].is_sensitive());
        assert!(!request.url().as_str().contains("NEVER_LOG"));
        let body = request.body().unwrap().as_bytes().unwrap();
        assert!(!String::from_utf8_lossy(body).contains("NEVER_LOG"));
        let body: Value = serde_json::from_slice(body).unwrap();
        if model.provider == Provider::Openai {
            assert_eq!(body["reasoning_effort"], "none");
            assert_eq!(body["store"], false);
        }
        if model.provider == Provider::Gemini {
            assert!(body["generationConfig"]["thinkingConfig"]["thinkingLevel"].is_string());
        }
    }
}
#[test]
fn credentials_and_errors_are_redacted() {
    let mut headers = HeaderMap::new();
    headers.insert("x-provider-key", "top-secret-key".parse().unwrap());
    assert!(credential(&headers).unwrap().is_sensitive());
    assert_eq!(
        classify_error(
            StatusCode::BAD_REQUEST,
            &json!({"error":{"details":[{"reason":"API_KEY_INVALID","message":"secret-key"}]}})
        )
        .body
        .code,
        "provider_auth"
    );
    assert!(!format!("{:?}", credential(&headers).unwrap()).contains("top-secret"));
    assert!(
        !serde_json::to_string(&status_error(StatusCode::UNAUTHORIZED).body)
            .unwrap()
            .contains("top-secret")
    );
}
