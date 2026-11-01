use super::super::{parser::ProviderParser, sse::SseDecoder};
use crate::types::Provider;

#[test]
fn split_utf8_and_crlf_sse_frames() {
    let data = "data: {\"text\":\"café\"}\r\n\r\ndata: [DONE]\n\n".as_bytes();
    let mut decoder = SseDecoder::default();
    let mut frames = Vec::new();
    for byte in data {
        frames.extend(decoder.push(&[*byte]).unwrap());
    }
    assert_eq!(frames, ["{\"text\":\"café\"}", "[DONE]"]);
}
#[test]
fn mocked_provider_streams_and_terminal_signals() {
    let mut parser = ProviderParser::default();
    assert_eq!(
        parser
            .parse(
                Provider::Openai,
                r#"{"choices":[{"delta":{"content":"Hello [p1]"},"finish_reason":null}]}"#
            )
            .unwrap()
            .text,
        "Hello [p1]"
    );
    assert!(
        parser
            .parse(
                Provider::Openai,
                r#"{"choices":[{"delta":{},"finish_reason":"stop"}]}"#
            )
            .unwrap()
            .done
    );
    let mut parser = ProviderParser::default();
    assert!(parser.parse(Provider::Openai, "[DONE]").is_err());
    assert!(
        parser
            .parse(
                Provider::Openai,
                r#"{"choices":[{"finish_reason":"length"}]}"#
            )
            .is_err()
    );
    assert_eq!(
        parser
            .parse(
                Provider::Anthropic,
                r#"{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}"#
            )
            .unwrap()
            .text,
        "Hi"
    );
    parser
        .parse(
            Provider::Anthropic,
            r#"{"type":"message_delta","delta":{"stop_reason":"end_turn"}}"#,
        )
        .unwrap();
    assert!(
        parser
            .parse(Provider::Anthropic, r#"{"type":"message_stop"}"#)
            .unwrap()
            .done
    );
    let mut parser = ProviderParser::default();
    let part = parser.parse(Provider::Gemini, r#"{"candidates":[{"content":{"parts":[{"text":"secret","thought":true},{"text":"Answer"}]},"finishReason":"STOP"}]}"#).unwrap();
    assert_eq!(part.text, "Answer");
    assert!(part.done);
    assert!(
        parser
            .parse(
                Provider::Gemini,
                r#"{"error":{"message":"secret API key"}}"#
            )
            .is_err()
    );
}
