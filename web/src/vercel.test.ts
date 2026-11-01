import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("platform-configured backend security policy", () => {
  it.each(["https://reader.onrender.com", "https://another.example"])(
    "allows only the configured backend origin: %s",
    async (origin) => {
      vi.stubEnv("VERCEL", "1");
      vi.stubEnv("VITE_API_BASE_URL", `${origin}/`);
      const { config } = await import("../../vercel.ts");
      const headers = config.headers[0].headers;
      const policy = headers.find(
        (header) => header.key === "Content-Security-Policy",
      )!.value;
      expect(policy.split("; ")).toContain(`connect-src 'self' ${origin}`);
      expect(policy).toContain("frame-ancestors 'none'");
      expect(policy).not.toContain("*");
      expect(headers).toContainEqual({ key: "X-Frame-Options", value: "DENY" });
    },
  );

  it("rejects a missing deployment origin", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VITE_API_BASE_URL", "");
    await expect(import("../../vercel.ts")).rejects.toThrow(
      "Set VITE_API_BASE_URL",
    );
  });

  it("rejects an origin that could inject CSP directives", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://reader.example;script-src");
    await expect(import("../../vercel.ts")).rejects.toThrow("HTTPS origin");
  });
});
