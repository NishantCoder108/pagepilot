use super::errors::{stop_error, stream_error};
use crate::{error::ApiError, types::Provider};
use serde_json::Value;

#[derive(Default, Debug)]
pub(super) struct Part {
    pub text: String,
    pub done: bool,
}

#[derive(Default)]
pub(super) struct ProviderParser {
    natural_stop: bool,
}

impl ProviderParser {
    pub fn parse(&mut self, provider: Provider, data: &str) -> Result<Part, ApiError> {
        if data == "[DONE]" {
            return if self.natural_stop {
                Ok(Part {
                    done: true,
                    ..Part::default()
                })
            } else {
                Err(stream_error())
            };
        }
        let value: Value = serde_json::from_str(data).map_err(|_| stream_error())?;
        if value.get("error").is_some() || value["type"] == "error" {
            return Err(stream_error());
        }
        match provider {
            Provider::Openai => {
                let choice = &value["choices"][0];
                let text = choice["delta"]["content"].as_str().unwrap_or("").to_owned();
                if let Some(reason) = choice["finish_reason"].as_str() {
                    if reason != "stop" {
                        return Err(stop_error());
                    }
                    self.natural_stop = true;
                }
                Ok(Part {
                    text,
                    done: self.natural_stop,
                })
            }
            Provider::Anthropic => {
                if let Some(reason) = value["delta"]["stop_reason"].as_str() {
                    if !matches!(reason, "end_turn" | "stop_sequence") {
                        return Err(stop_error());
                    }
                    self.natural_stop = true;
                }
                let text = if value["delta"]["type"] == "text_delta" {
                    value["delta"]["text"].as_str().unwrap_or("").to_owned()
                } else {
                    String::new()
                };
                let done = value["type"] == "message_stop";
                if done && !self.natural_stop {
                    return Err(stream_error());
                }
                Ok(Part { text, done })
            }
            Provider::Gemini => {
                if value["promptFeedback"]["blockReason"].is_string() {
                    return Err(stop_error());
                }
                let candidate = &value["candidates"][0];
                let text = candidate["content"]["parts"]
                    .as_array()
                    .map(|parts| {
                        parts
                            .iter()
                            .filter(|p| p["thought"] != true)
                            .filter_map(|p| p["text"].as_str())
                            .collect::<String>()
                    })
                    .unwrap_or_default();
                if let Some(reason) = candidate["finishReason"].as_str() {
                    if reason != "STOP" {
                        return Err(stop_error());
                    }
                    self.natural_stop = true;
                }
                Ok(Part {
                    text,
                    done: self.natural_stop,
                })
            }
        }
    }
}
