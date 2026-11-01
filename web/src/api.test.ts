import { afterEach, describe, expect, it, vi } from "vitest";
import { EventDecoder, generate } from "./api";
import type { GenerationRequest, StreamEvent } from "./types";

const request: GenerationRequest = {
  mode: "summary",
  provider: "openai",
  model: "gpt-5.4-mini",
  history: [],
  document: {
    id: "d",
    title: "Demo",
    extracted_at: 0,
    source_url: null,
    passages: [{ id: "p1", heading: null, text: "Source" }],
  },
};

function mockStream(text: string) {
  const bytes = new TextEncoder().encode(text);
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              for (let i = 0; i < bytes.length; i += 3)
                controller.enqueue(bytes.slice(i, i + 3));
              controller.close();
            },
          }),
          { headers: { "content-type": "text/event-stream" } },
        ),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("streaming contract", () => {
  it("sends generation directly to the configured HTTPS backend without cookies", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://reader.hf.space");
    mockStream('event: complete\ndata: {"citations":[]}\n\n');
    await generate(request, "TEST_KEY", new AbortController().signal, () => {});
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://reader.hf.space/api/generate");
    expect(init?.credentials).toBe("omit");
    expect(JSON.stringify(init?.body)).not.toContain("TEST_KEY");
  });
  it("handles CRLF, split frames, comments, and named events", () => {
    const decoder = new EventDecoder();
    expect(decoder.push(": keepalive\r\n\r\nevent: del")).toEqual([]);
    expect(decoder.push('ta\r\ndata: {"text":"Hi"}\r\n\r\n')).toEqual([
      { name: "delta", data: { text: "Hi" } },
    ]);
  });
  it("consumes UTF-8 deltas and requires a terminal completion event", async () => {
    mockStream(
      'event: delta\ndata: {"text":"café [p1]"}\n\nevent: complete\ndata: {"citations":["p1"]}\n\n',
    );
    const events: StreamEvent[] = [];
    await generate(request, "TEST_KEY", new AbortController().signal, (e) =>
      events.push(e),
    );
    expect(events).toEqual([
      { type: "delta", text: "café [p1]" },
      { type: "complete", citations: ["p1"] },
    ]);
    const [path, init] = vi.mocked(fetch).mock.calls[0];
    expect(path).toBe("/api/generate");
    expect(String(path)).not.toContain("TEST_KEY");
    expect(JSON.stringify(init?.body)).not.toContain("TEST_KEY");
  });
  it("preserves deltas but rejects unexpected EOF", async () => {
    mockStream('event: delta\ndata: {"text":"Partial"}\n\n');
    const events: StreamEvent[] = [];
    await expect(
      generate(request, "key", new AbortController().signal, (e) =>
        events.push(e),
      ),
    ).rejects.toMatchObject({ code: "stream_interrupted" });
    expect(events).toHaveLength(1);
  });
  it("surfaces normalized provider errors without treating them as completion", async () => {
    mockStream(
      'event: error\ndata: {"error":{"code":"provider_auth","message":"Check API billing","request_id":"r1"}}\n\n',
    );
    await expect(
      generate(request, "key", new AbortController().signal, () => {}),
    ).rejects.toMatchObject({ code: "provider_auth", requestId: "r1" });
  });
  it("passes cancellation to fetch without automatic retry", async () => {
    const abort = new AbortController();
    abort.abort();
    const fetchMock = vi.fn(async (_url, init: RequestInit) => {
      expect(init.signal).toBe(abort.signal);
      throw new DOMException("Aborted", "AbortError");
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      generate(request, "key", abort.signal, () => {}),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
