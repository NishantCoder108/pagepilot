use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct ErrorBody {
    pub code: String,
    pub message: String,
    pub request_id: String,
}

#[derive(Debug)]
pub struct ApiError {
    pub status: StatusCode,
    pub body: ErrorBody,
}

impl ApiError {
    pub fn new(status: StatusCode, code: &str, message: &str) -> Self {
        Self {
            status,
            body: ErrorBody {
                code: code.into(),
                message: message.into(),
                request_id: Uuid::new_v4().to_string(),
            },
        }
    }
    pub fn bad(code: &str, message: &str) -> Self {
        Self::new(StatusCode::BAD_REQUEST, code, message)
    }
    pub fn busy() -> Self {
        Self::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "busy",
            "Capacity is busy. Please try again shortly.",
        )
    }
    pub fn internal() -> Self {
        Self::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal",
            "The request could not be completed.",
        )
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let id = self.body.request_id.clone();
        let mut response =
            (self.status, Json(serde_json::json!({"error": self.body}))).into_response();
        response
            .headers_mut()
            .insert("x-request-id", id.parse().unwrap());
        response
    }
}
