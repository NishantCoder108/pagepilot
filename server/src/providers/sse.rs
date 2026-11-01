use super::errors::stream_error;
use crate::error::ApiError;

// Byte framing preserves split UTF-8 codepoints and handles both SSE line endings.
#[derive(Default)]
pub(super) struct SseDecoder {
    buffer: Vec<u8>,
}

impl SseDecoder {
    pub fn push(&mut self, chunk: &[u8]) -> Result<Vec<String>, ApiError> {
        self.buffer.extend_from_slice(chunk);
        let mut frames = Vec::new();
        loop {
            let boundary = self
                .buffer
                .windows(2)
                .position(|v| v == b"\n\n")
                .map(|i| (i, 2));
            let crlf = self
                .buffer
                .windows(4)
                .position(|v| v == b"\r\n\r\n")
                .map(|i| (i, 4));
            let boundary = match (boundary, crlf) {
                (Some(a), Some(b)) => Some(if a.0 < b.0 { a } else { b }),
                (a, b) => a.or(b),
            };
            let Some((end, delimiter)) = boundary else {
                break;
            };
            if end > 256_000 {
                return Err(stream_error());
            }
            let frame = String::from_utf8(self.buffer.drain(..end + delimiter).collect())
                .map_err(|_| stream_error())?;
            let data = frame
                .lines()
                .filter_map(|line| {
                    line.strip_prefix("data:")
                        .map(|v| v.strip_prefix(' ').unwrap_or(v))
                })
                .collect::<Vec<_>>()
                .join("\n");
            if !data.is_empty() {
                frames.push(data);
            }
        }
        if self.buffer.len() > 256_000 {
            return Err(stream_error());
        }
        Ok(frames)
    }
}
