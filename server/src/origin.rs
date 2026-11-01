use axum::http::{HeaderMap, HeaderValue, header};
use url::Url;

#[derive(Clone, Default)]
pub struct OriginPolicy {
    pub allowed: Vec<HeaderValue>,
}

impl OriginPolicy {
    pub fn from_list(raw: &str) -> Result<Self, String> {
        let mut allowed = Vec::new();
        for value in raw.split(',').map(str::trim).filter(|v| !v.is_empty()) {
            let url = Url::parse(value).map_err(|_| "Invalid origin".to_owned())?;
            let local = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
            if value.contains('*')
                || url.host_str().is_some_and(|host| host.contains('*'))
                || !(url.scheme() == "https" || (url.scheme() == "http" && local))
                || url.host_str().is_none()
                || !url.username().is_empty()
                || url.password().is_some()
                || url.path() != "/"
                || url.query().is_some()
                || url.fragment().is_some()
            {
                return Err("Use exact origins without paths, credentials, or wildcards".into());
            }
            let origin = HeaderValue::from_str(&url.origin().ascii_serialization())
                .map_err(|_| "Invalid origin header".to_owned())?;
            if !allowed.contains(&origin) {
                allowed.push(origin);
            }
        }
        Ok(Self { allowed })
    }

    pub fn permits(&self, headers: &HeaderMap) -> bool {
        let site = headers.get("sec-fetch-site");
        let Some(origin) = headers.get(header::ORIGIN) else {
            // Non-browser clients are allowed. CORS is not API authentication.
            return site.is_none_or(|value| value != "cross-site");
        };
        if self.allowed.contains(origin) {
            return true;
        }
        // Preserve same-origin browser use, including Vite's local API proxy.
        // Fetch metadata is browser-controlled; never infer trust from an
        // arbitrary forwarded-proto/client-IP header supplied by a caller.
        if site.is_none_or(|value| value != "same-origin") {
            return false;
        }
        let Some(url) = origin
            .to_str()
            .ok()
            .and_then(|value| Url::parse(value).ok())
        else {
            return false;
        };
        let Some(host) = headers
            .get(header::HOST)
            .and_then(|value| value.to_str().ok())
        else {
            return false;
        };
        url.origin().ascii_serialization() == format!("{}://{host}", url.scheme())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_wildcards_credentials_paths_and_nonlocal_http() {
        for raw in [
            "*",
            "https://*.vercel.app",
            "http://app.example",
            "https://user:pass@app.example",
            "https://app.example/path",
            "https://app.example?token=secret",
            "null",
        ] {
            assert!(OriginPolicy::from_list(raw).is_err(), "{raw}");
        }
        assert!(OriginPolicy::from_list("http://localhost:5173,https://app.vercel.app").is_ok());
    }
}
