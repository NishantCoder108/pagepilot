use super::{errors::stream_error, events::error_event};
use axum::response::sse::Event;
use futures_util::StreamExt;
use std::convert::Infallible;

// Enforce a wall-clock deadline even when a slow downstream client stops
// polling. The bounded channel prevents token buffering from growing forever.
// Dropping the receiver cancels upstream I/O and releases its generation slot.
pub(super) fn bounded_relay(
    stream: impl futures_util::Stream<Item = Result<Event, Infallible>> + Send + 'static,
    total_timeout: std::time::Duration,
    request_id: String,
) -> tokio::sync::mpsc::Receiver<Result<Event, Infallible>> {
    let (sender, receiver) = tokio::sync::mpsc::channel(2);
    tokio::spawn(async move {
        let relay = async {
            futures_util::pin_mut!(stream);
            while let Some(item) = stream.next().await {
                if sender.send(item).await.is_err() {
                    break;
                }
            }
        };
        tokio::select! {
            _ = sender.closed() => {},
            result = tokio::time::timeout(total_timeout, relay) => {
                if result.is_err() { let _ = sender.try_send(error_event(stream_error(), &request_id)); }
            }
        }
    });
    receiver
}
