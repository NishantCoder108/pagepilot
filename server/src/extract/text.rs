use crate::{
    error::ApiError,
    types::{Document, Passage, now_ms},
};
use uuid::Uuid;

pub(super) fn from_text(text: &str, title: &str, max: usize) -> Result<Document, ApiError> {
    if text.len() > max {
        return Err(ApiError::bad(
            "document_too_large",
            "The readable text is too large. Paste a shorter passage.",
        ));
    }
    let normalized = text.replace("\r\n", "\n").replace('\r', "\n");
    let mut heading = None;
    let mut passages = Vec::new();
    let mut output_bytes = 0usize;
    for block in normalized.split("\n\n") {
        let block = block.trim();
        if block.is_empty() {
            continue;
        }
        let mut lines = block.lines();
        let first = lines.next().unwrap();
        let content = if first.starts_with('#') {
            let value = first.trim_start_matches('#').trim();
            if value.len() > 1000 {
                return Err(ApiError::bad(
                    "heading_too_large",
                    "A source heading is too long. Shorten it before continuing.",
                ));
            }
            heading = Some(value.to_owned());
            lines.collect::<Vec<_>>().join("\n")
        } else {
            block.to_owned()
        };
        if !content.trim().is_empty() {
            output_bytes = output_bytes
                .saturating_add(content.len())
                .saturating_add(heading.as_ref().map_or(0, String::len));
            if output_bytes > max || passages.len() >= 2000 {
                return Err(ApiError::bad(
                    "document_too_large",
                    "The source has too many passages or exceeds the readable document limit. Paste a shorter selection.",
                ));
            }
            passages.push(Passage {
                id: format!("p{}", passages.len() + 1),
                heading: heading.clone(),
                text: content.trim().to_owned(),
            });
        }
    }
    if passages.is_empty() {
        return Err(ApiError::bad(
            "empty_document",
            "Add some readable text to get started.",
        ));
    }
    Ok(Document {
        id: Uuid::new_v4().to_string(),
        title: title.trim().chars().take(240).collect::<String>(),
        source_url: None,
        extracted_at: now_ms(),
        passages,
    })
}
