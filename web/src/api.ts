import type { Document, GenerationRequest, Model, StreamEvent } from "./types";
import { apiUrl } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public requestId?: string,
  ) {
    super(message);
  }
}

async function responseError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  return new ApiError(
    body?.error?.message ||
      `Request failed (${response.status}). Please try again.`,
    body?.error?.code || "request_failed",
    body?.error?.request_id ||
      response.headers.get("x-request-id") ||
      undefined,
  );
}

export async function extract(
  input: { url: string } | { text: string; title?: string },
): Promise<Document> {
  const response = await fetch(apiUrl("/api/extract"), {
    credentials: "omit",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await responseError(response);
  return response.json();
}

export async function fetchModels(): Promise<Model[]> {
  const response = await fetch(apiUrl("/api/models"), { credentials: "omit" });
  if (!response.ok) throw await responseError(response);
  return (await response.json()).models;
}

export class EventDecoder {
  private buffer = "";
  push(text: string): { name: string; data: unknown }[] {
    this.buffer += text;
    const frames: { name: string; data: unknown }[] = [];
    while (true) {
      const match = /\r?\n\r?\n/.exec(this.buffer);
      if (!match) break;
      const frame = this.buffer.slice(0, match.index);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      let name = "message";
      const lines: string[] = [];
      for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith("event:")) name = line.slice(6).trim();
        if (line.startsWith("data:"))
          lines.push(line.slice(5).replace(/^ /, ""));
      }
      if (lines.length)
        frames.push({ name, data: JSON.parse(lines.join("\n")) });
    }
    if (this.buffer.length > 512_000)
      throw new ApiError(
        "The response stream exceeded its frame limit.",
        "stream_invalid",
      );
    return frames;
  }
}

export async function generate(
  request: GenerationRequest,
  key: string,
  signal: AbortSignal,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const response = await fetch(apiUrl("/api/generate"), {
    credentials: "omit",
    method: "POST",
    headers: { "Content-Type": "application/json", "x-provider-key": key },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok) throw await responseError(response);
  if (!response.body)
    throw new ApiError(
      "Streaming is unavailable in this browser.",
      "stream_unavailable",
    );
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const events = new EventDecoder();
  let terminal = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      const text = done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      for (const frame of events.push(text)) {
        const data = frame.data as Record<string, unknown>;
        if (frame.name === "error") {
          const error = data.error as {
            message: string;
            code: string;
            request_id: string;
          };
          throw new ApiError(error.message, error.code, error.request_id);
        }
        if (frame.name === "progress" && typeof data.message === "string")
          onEvent({ type: "progress", message: data.message });
        if (frame.name === "delta" && typeof data.text === "string")
          onEvent({ type: "delta", text: data.text });
        if (frame.name === "complete" && Array.isArray(data.citations)) {
          onEvent({
            type: "complete",
            citations: data.citations.filter(
              (id): id is string => typeof id === "string",
            ),
          });
          terminal = true;
          return;
        }
      }
      if (done) break;
    }
    if (!terminal)
      throw new ApiError(
        "The connection ended early. Partial output is saved; you can retry explicitly.",
        "stream_interrupted",
      );
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
