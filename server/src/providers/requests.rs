use super::context::Prepared;
use crate::{error::ApiError, types::Provider};
use axum::http::HeaderValue;
use serde_json::json;

pub(super) fn upstream_request(
    client: &reqwest::Client,
    provider: Provider,
    key: HeaderValue,
    prepared: &Prepared,
) -> Result<reqwest::RequestBuilder, ApiError> {
    let model = &prepared.model;
    let request = match provider {
        Provider::Openai => {
            let raw_key = key.to_str().map_err(|_| ApiError::internal())?;
            let mut auth = HeaderValue::from_str(&format!("Bearer {raw_key}"))
                .map_err(|_| ApiError::internal())?;
            auth.set_sensitive(true);
            let mut messages = vec![json!({ "role": "system", "content": prepared.system })];
            messages.extend(prepared.messages.iter().cloned());
            client
                .post("https://api.openai.com/v1/chat/completions")
                .header("authorization", auth)
                .json(&json!({
                    "model": model.id,
                    "messages": messages,
                    "stream": true,
                    "store": false,
                    "reasoning_effort": "none",
                    "max_completion_tokens": model.output_tokens,
                }))
        }
        Provider::Anthropic => client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", key)
            .header("anthropic-version", "2023-06-01")
            .json(&json!({
                "model": model.id,
                "system": prepared.system,
                "messages": prepared.messages,
                "stream": true,
                "max_tokens": model.output_tokens,
            })),
        Provider::Gemini => {
            let contents: Vec<_> = prepared
                .messages
                .iter()
                .map(|message| {
                    let role = if message["role"] == "assistant" {
                        "model"
                    } else {
                        "user"
                    };
                    json!({ "role": role, "parts": [{ "text": message["content"] }] })
                })
                .collect();
            let thinking = if model.id == "gemini-3.8-flash" {
                "LOW"
            } else {
                "MINIMAL"
            };
            let endpoint = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse",
                model.id,
            );
            client
                .post(endpoint)
                .header("x-goog-api-key", key)
                .json(&json!({
                    "systemInstruction": { "parts": [{ "text": prepared.system }] },
                    "contents": contents,
                    "generationConfig": {
                        "maxOutputTokens": model.output_tokens,
                        "thinkingConfig": { "includeThoughts": false, "thinkingLevel": thinking },
                    },
                }))
        }
    };
    Ok(request)
}
