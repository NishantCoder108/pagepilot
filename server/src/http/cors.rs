use crate::origin::OriginPolicy;
use axum::http::{
    Method,
    header::{CONTENT_TYPE, HeaderName},
};
use tower_http::cors::{AllowOrigin, CorsLayer};

pub(super) fn cors(policy: &OriginPolicy) -> CorsLayer {
    CorsLayer::new()
        .allow_origin(AllowOrigin::list(policy.allowed.clone()))
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([CONTENT_TYPE, HeaderName::from_static("x-provider-key")])
        .expose_headers([
            HeaderName::from_static("x-request-id"),
            HeaderName::from_static("retry-after"),
        ])
}
