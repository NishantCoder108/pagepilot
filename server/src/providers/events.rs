use crate::error::ApiError;
use axum::response::sse::Event;
use serde_json::{Value, json};
use std::convert::Infallible;

pub(super) fn event(name: &str, data: Value) -> Result<Event, Infallible> {
    Ok(Event::default().event(name).data(data.to_string()))
}
pub(super) fn error_event(mut error: ApiError, id: &str) -> Result<Event, Infallible> {
    error.body.request_id = id.to_owned();
    tracing::info!(request_id = id, code = error.body.code, "generation error");
    event("error", json!({"error":error.body}))
}

pub(super) struct GenerationTrace {
    pub(super) request_id: String,
    pub(super) started: std::time::Instant,
    pub(super) complete: bool,
}

impl Drop for GenerationTrace {
    fn drop(&mut self) {
        tracing::info!(
            request_id = self.request_id,
            complete = self.complete,
            duration_ms = self.started.elapsed().as_millis() as u64,
            "generation closed"
        );
    }
}
