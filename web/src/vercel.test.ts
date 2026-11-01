import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiUrl } from "./config";

type Header = { key: string; value: string };
const config = JSON.parse(
  readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
) as { headers: { headers: Header[] }[] };
const headers = config.headers[0].headers;
const policy = headers.find(
  (header) => header.key === "Content-Security-Policy",
)!.value;

afterEach(() => vi.unstubAllEnvs());

describe("static Vercel security configuration", () => {
  it("supplies a nonempty string value for every header", () => {
    for (const header of headers) {
      expect(typeof header.key).toBe("string");
      expect(typeof header.value).toBe("string");
      expect(header.value.trim().length).toBeGreaterThan(0);
    }
  });

  it("allows the Render backend used by the frontend", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://pagepilot-p7zj.onrender.com");
    const origin = new URL(apiUrl("/health")).origin;
    expect(policy.split("; ")).toContain(`connect-src 'self' ${origin}`);
    expect(policy).not.toContain("*");
  });

  it("retains script and framing protections", () => {
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(headers).toContainEqual({ key: "X-Frame-Options", value: "DENY" });
  });

  it("has no conflicting TypeScript configuration", () => {
    expect(existsSync(new URL("../../vercel.ts", import.meta.url))).toBe(false);
  });
});
