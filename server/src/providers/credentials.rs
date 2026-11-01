use crate::error::ApiError;
use axum::http::{HeaderMap, HeaderValue};

pub(super) fn credential(headers: &HeaderMap) -> Result<HeaderValue, ApiError> {
    let value = headers
        .get("x-provider-key")
        .ok_or_else(|| ApiError::bad("missing_key", "Enter your provider API key."))?;
    let key = value
        .to_str()
        .map_err(|_| ApiError::bad("invalid_key", "The API key is not valid header text."))?
        .trim();
    if key.is_empty() || key.len() > 4096 || key.bytes().any(|b| b.is_ascii_whitespace()) {
        return Err(ApiError::bad(
            "invalid_key",
            "Enter a valid API key without whitespace.",
        ));
    }
    let mut value = HeaderValue::from_str(key)
        .map_err(|_| ApiError::bad("invalid_key", "The API key is not valid header text."))?;
    value.set_sensitive(true);
    Ok(value)
}
