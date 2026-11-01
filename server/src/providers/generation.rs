use super::{
    citations::citations,
    context::prepare,
    credentials::credential,
    errors::{stop_error, stream_error, upstream_error},
    events::{GenerationTrace, error_event, event},
    parser::ProviderParser,
    relay::bounded_relay,
    requests::upstream_request,
    sse::SseDecoder,
};
use crate::{config::AppState, error::ApiError, types::GenerateRequest};
use axum::{
    http::HeaderMap,
    response::{
        IntoResponse, Response,
        sse::{KeepAlive, Sse},
    },
};
use futures_util::StreamExt;
use serde_json::json;

pub(crate) async fn generate(
    state: AppState,
    headers: HeaderMap,
    request: GenerateRequest,
) -> Result<Response, ApiError> {
    let key = credential(&headers)?;
    let prepared = prepare(&request, state.config.max_document_bytes)?;
    let permit = state
        .generation_slots
        .clone()
        .try_acquire_owned()
        .map_err(|_| ApiError::busy())?;
    let upstream = upstream_request(&state.provider_client, request.provider, key, &prepared)?;
    let provider = request.provider;
    let id = uuid::Uuid::new_v4().to_string();
    let stream_id = id.clone();
    let total_timeout = state.config.generation_timeout;
    let stream = async_stream::stream! {
        let _permit = permit;
        let mut trace = GenerationTrace { request_id: stream_id.clone(), started: std::time::Instant::now(), complete: false };
        let deadline = tokio::time::Instant::now() + state.config.generation_timeout;
        yield event("progress", json!({"message":"Connecting to your provider…"}));
        let response = match tokio::time::timeout_at(deadline, upstream.send()).await {
            Ok(Ok(response)) => response,
            _ => { yield error_event(stream_error(), &stream_id); return; }
        };
        if !response.status().is_success() {
            yield error_event(upstream_error(response).await, &stream_id);
            return;
        }
        let mut bytes = response.bytes_stream();
        let mut decoder = SseDecoder::default();
        let mut parser = ProviderParser::default();
        let mut output = String::new();
        loop {
            let chunk = match tokio::time::timeout_at(deadline, bytes.next()).await {
                Ok(Some(Ok(chunk))) => chunk,
                _ => { yield error_event(stream_error(), &stream_id); return; }
            };
            let frames = match decoder.push(&chunk) {
                Ok(frames) => frames,
                Err(error) => { yield error_event(error, &stream_id); return; }
            };
            for frame in frames {
                let part = match parser.parse(provider, &frame) {
                    Ok(part) => part,
                    Err(error) => { yield error_event(error, &stream_id); return; }
                };
                if output.len() + part.text.len() > 128_000 { yield error_event(stop_error(), &stream_id); return; }
                if !part.text.is_empty() {
                    output.push_str(&part.text);
                    yield event("delta", json!({"text":part.text}));
                }
                if part.done {
                    if output.trim().is_empty() { yield error_event(stop_error(), &stream_id); return; }
                    trace.complete = true;
                    yield event("complete", json!({"citations":citations(&output, &prepared.passage_ids)}));
                    return;
                }
            }
        }
    };
    let mut receiver = bounded_relay(stream, total_timeout, id.clone());
    let output = async_stream::stream! {
        while let Some(item) = receiver.recv().await { yield item; }
    };
    let mut response = Sse::new(output)
        .keep_alive(KeepAlive::default())
        .into_response();
    response
        .headers_mut()
        .insert("x-request-id", id.parse().unwrap());
    response
        .headers_mut()
        .insert("x-accel-buffering", "no".parse().unwrap());
    Ok(response)
}
