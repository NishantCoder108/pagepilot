import { afterEach, describe, expect, it, vi } from "vitest";
import { apiUrl, parseApiBaseUrl } from "./config";

afterEach(() => vi.unstubAllEnvs());

describe("deployment API configuration", () => {
  it("keeps local paths and normalizes an HTTPS backend origin", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    expect(apiUrl("/health")).toBe("/health");
    expect(parseApiBaseUrl("https://reader.hf.space/")).toBe(
      "https://reader.hf.space",
    );
    expect(parseApiBaseUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });

  it("routes every endpoint to the configured backend", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://reader.hf.space");
    for (const path of [
      "/health",
      "/api/models",
      "/api/extract",
      "/api/generate",
    ])
      expect(apiUrl(path)).toBe(`https://reader.hf.space${path}`);
  });

  it("rejects insecure origins, embedded credentials, paths, and wildcard hosts", () => {
    for (const raw of [
      "http://reader.hf.space",
      "https://user:key@reader.hf.space",
      "https://reader.hf.space/api",
      "https://reader.hf.space?key=secret",
      "https://reader.hf.space#token",
      "https://*.hf.space",
      "invalid",
    ])
      expect(() => parseApiBaseUrl(raw)).toThrow();
    expect(() => apiUrl("//untrusted.example")).toThrow();
  });
});
