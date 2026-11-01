mod safety;

use crate::{config::Config, error::ApiError};
use futures_util::StreamExt;
use safety::{is_public, unsafe_destination, validate_url};
use std::{net::SocketAddr, time::Duration};

pub async fn download(raw: &str, config: &Config) -> Result<(String, String), ApiError> {
    tokio::time::timeout(config.fetch_timeout, download_inner(raw, config))
        .await
        .map_err(|_| {
            ApiError::bad(
                "fetch_timeout",
                "The page took too long to respond. Try pasted text instead.",
            )
        })?
}

async fn download_inner(raw: &str, config: &Config) -> Result<(String, String), ApiError> {
    let mut url = validate_url(raw)?;
    for hop in 0..=5 {
        let host = url
            .host_str()
            .unwrap()
            .trim_start_matches('[')
            .trim_end_matches(']');
        let port = url.port_or_known_default().unwrap();
        let addresses: Vec<SocketAddr> = tokio::net::lookup_host((host, port))
            .await
            .map_err(|_| ApiError::bad("dns_failed", "The website address could not be resolved."))?
            .collect();
        if addresses.is_empty() || addresses.iter().any(|a| !is_public(a.ip())) {
            return Err(unsafe_destination());
        }
        // Pin this exact validated DNS result. A second DNS lookup cannot rebind
        // the connection to an internal address. Never honor environment proxies.
        let client = reqwest::Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .resolve_to_addrs(host, &addresses)
            .connect_timeout(Duration::from_secs(8))
            .timeout(config.fetch_timeout)
            .user_agent("PagePilot/0.1 (+public-page-reader)")
            .build()
            .map_err(|_| ApiError::internal())?;
        let response = client
            .get(url.clone())
            .header("accept", "text/html,application/xhtml+xml")
            .send()
            .await
            .map_err(|_| {
                ApiError::bad(
                    "fetch_failed",
                    "The page could not be fetched. Try pasted text instead.",
                )
            })?;
        if response.status().is_redirection() {
            if hop == 5 {
                return Err(ApiError::bad(
                    "redirect_limit",
                    "The page redirected too many times.",
                ));
            }
            let location = response
                .headers()
                .get("location")
                .and_then(|v| v.to_str().ok())
                .ok_or_else(|| {
                    ApiError::bad("invalid_redirect", "The page returned an invalid redirect.")
                })?;
            let next = url.join(location).map_err(|_| {
                ApiError::bad("invalid_redirect", "The page returned an invalid redirect.")
            })?;
            url = validate_url(next.as_str())?;
            continue;
        }
        if !response.status().is_success() {
            return Err(ApiError::bad(
                "page_unavailable",
                "The website refused the request or the page is unavailable. Try pasted text.",
            ));
        }
        let content_type = response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_ascii_lowercase();
        let mime = content_type.split(';').next().unwrap_or("").trim();
        if !matches!(mime, "text/html" | "application/xhtml+xml") {
            return Err(ApiError::bad(
                "unsupported_content",
                "This link is not an HTML page. PDFs and downloads are not supported yet.",
            ));
        }
        let mut bytes = Vec::new();
        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk
                .map_err(|_| ApiError::bad("fetch_failed", "The page download was interrupted."))?;
            if bytes.len().saturating_add(chunk.len()) > config.max_download_bytes {
                return Err(ApiError::bad(
                    "page_too_large",
                    "The page exceeds the download limit. Paste a shorter passage instead.",
                ));
            }
            bytes.extend_from_slice(&chunk);
        }
        let html = String::from_utf8(bytes).map_err(|_| {
            ApiError::bad(
                "unsupported_encoding",
                "This page is not UTF-8. Copy and paste its readable text instead.",
            )
        })?;
        url.set_fragment(None);
        return Ok((html, url.to_string()));
    }
    unreachable!()
}

#[cfg(test)]
mod tests;
