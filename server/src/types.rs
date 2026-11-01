use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Passage {
    pub id: String,
    pub heading: Option<String>,
    pub text: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub source_url: Option<String>,
    pub extracted_at: u64,
    pub passages: Vec<Passage>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ExtractRequest {
    pub url: Option<String>,
    pub text: Option<String>,
    pub title: Option<String>,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    Openai,
    Anthropic,
    Gemini,
}

#[derive(Clone, Copy, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Summary,
    Chat,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Assistant,
}

#[derive(Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Turn {
    pub role: Role,
    pub content: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GenerateRequest {
    pub mode: Mode,
    pub provider: Provider,
    pub model: String,
    pub document: Document,
    #[serde(default)]
    pub history: Vec<Turn>,
    pub question: Option<String>,
    pub passage_ids: Option<Vec<String>>,
}

#[derive(Clone, Serialize)]
pub struct Model {
    pub provider: Provider,
    pub id: &'static str,
    pub label: &'static str,
    pub input_budget: usize,
    pub output_tokens: u32,
}

// Deliberately conservative UTF-8 byte budgets, not provider token-window claims.
pub fn models() -> Vec<Model> {
    vec![
        Model {
            provider: Provider::Openai,
            id: "gpt-5.4-mini",
            label: "GPT-5.4 mini",
            input_budget: 96_000,
            output_tokens: 2048,
        },
        Model {
            provider: Provider::Openai,
            id: "gpt-5.4-nano",
            label: "GPT-5.4 nano",
            input_budget: 96_000,
            output_tokens: 2048,
        },
        Model {
            provider: Provider::Anthropic,
            id: "claude-sonnet-4-6",
            label: "Claude Sonnet 4.6",
            input_budget: 96_000,
            output_tokens: 2048,
        },
        Model {
            provider: Provider::Anthropic,
            id: "claude-haiku-4-5-20251001",
            label: "Claude Haiku 4.5",
            input_budget: 96_000,
            output_tokens: 2048,
        },
        Model {
            provider: Provider::Gemini,
            id: "gemini-3.8-flash",
            label: "Gemini 3.8 Flash",
            input_budget: 96_000,
            output_tokens: 4096,
        },
        Model {
            provider: Provider::Gemini,
            id: "gemini-3.5-flash-lite",
            label: "Gemini 3.5 Flash-Lite",
            input_budget: 96_000,
            output_tokens: 4096,
        },
    ]
}
