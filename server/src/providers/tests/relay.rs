use super::super::{events::event, relay::bounded_relay};
use serde_json::json;

#[tokio::test]
async fn slow_clients_do_not_hold_capacity_past_the_deadline() {
    use std::{sync::Arc, time::Duration};
    let slots = Arc::new(tokio::sync::Semaphore::new(1));
    let permit = slots.clone().acquire_owned().await.unwrap();
    let source = async_stream::stream! {
        let _permit = permit;
        loop { yield event("delta", json!({"text":"slow fixture"})); }
    };
    let receiver = bounded_relay(source, Duration::from_millis(20), "test".into());
    // Never consume the receiver: the producer must time out while blocked.
    let recovered = tokio::time::timeout(Duration::from_secs(1), slots.acquire())
        .await
        .unwrap()
        .unwrap();
    drop(recovered);
    drop(receiver);
}

#[tokio::test]
async fn disconnect_cancels_pending_upstream_and_releases_capacity() {
    use std::{sync::Arc, time::Duration};
    let slots = Arc::new(tokio::sync::Semaphore::new(1));
    let permit = slots.clone().acquire_owned().await.unwrap();
    let source = async_stream::stream! {
        let _permit = permit;
        yield event("progress", json!({"message":"waiting"}));
        std::future::pending::<()>().await;
    };
    let mut receiver = bounded_relay(source, Duration::from_secs(60), "test".into());
    assert!(receiver.recv().await.is_some());
    drop(receiver);
    let _permit = tokio::time::timeout(Duration::from_secs(1), slots.acquire())
        .await
        .unwrap()
        .unwrap();
}
