mod html;
mod text;

use crate::{
    config::AppState,
    error::ApiError,
    types::{Document, ExtractRequest},
};
use html::from_html;
use text::from_text;

pub async fn extract(state: &AppState, request: ExtractRequest) -> Result<Document, ApiError> {
    match (request.url, request.text) {
        (None, Some(text)) => from_text(
            &text,
            request
                .title
                .as_deref()
                .filter(|s| !s.trim().is_empty())
                .unwrap_or("Pasted document"),
            state.config.max_document_bytes,
        ),
        (Some(url), None) => {
            let _fetch = state
                .fetch_slots
                .clone()
                .try_acquire_owned()
                .map_err(|_| ApiError::busy())?;
            let (html, source) = crate::fetch::download(&url, &state.config).await?;
            let parse = state
                .parse_slots
                .clone()
                .try_acquire_owned()
                .map_err(|_| ApiError::busy())?;
            let max = state.config.max_document_bytes;
            tokio::task::spawn_blocking(move || {
                let _permit = parse;
                from_html(&html, &source, max)
            })
            .await
            .map_err(|_| ApiError::internal())?
        }
        _ => Err(ApiError::bad(
            "invalid_input",
            "Provide exactly one URL or pasted text.",
        )),
    }
}

#[cfg(test)]
mod tests;
