use super::super::{citations::citations, context::prepare};
use crate::types::{GenerateRequest, Role};
use serde_json::json;

#[test]
fn context_selection_and_citation_validation() {
    let mut request: GenerateRequest = serde_json::from_value(json!({"mode":"chat","provider":"openai","model":"gpt-5.4-mini","document":{"id":"d","title":"Demo","source_url":null,"extracted_at":0,"passages":[{"id":"p1","heading":null,"text":"a".repeat(97_000)},{"id":"p2","heading":null,"text":"Small passage"}]},"history":[],"question":"Why?"})).unwrap();
    assert_eq!(
        prepare(&request, 200_000).err().unwrap().body.code,
        "context_too_large"
    );
    request.passage_ids = Some(vec!["p2".into()]);
    let context = prepare(&request, 200_000).unwrap();
    assert_eq!(
        citations(
            "Valid [p2], invented [p9], excluded [p1], repeated [p2]",
            &context.passage_ids
        ),
        ["p2"]
    );
    request.passage_ids = Some(vec!["p9".into()]);
    assert!(prepare(&request, 200_000).is_err());
    request.passage_ids = Some(vec!["p2".into()]);
    request.history.push(crate::types::Turn {
        role: Role::User,
        content: "x".repeat(97_000),
    });
    assert_eq!(
        prepare(&request, 200_000).err().unwrap().body.code,
        "context_too_large"
    );
}
