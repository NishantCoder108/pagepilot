import { parseApiBaseUrl } from "./web/src/config.ts";

const origin = parseApiBaseUrl(process.env.VITE_API_BASE_URL ?? "");
if (process.env.VERCEL && !origin) {
  throw new Error(
    "Set VITE_API_BASE_URL to your backend HTTPS origin in Vercel.",
  );
}

// Vercel evaluates this file at deployment time using the project's variables.
// The browser bundle and CSP share one backend setting; no hostname is pinned.
export const config = {
  framework: "vite",
  installCommand: "npm ci --prefix web",
  buildCommand: "npm --prefix web run build",
  outputDirectory: "web/dist",
  headers: [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            `connect-src 'self'${origin ? ` ${origin}` : ""}`,
            "frame-ancestors 'none'",
            "base-uri 'none'",
            "form-action 'self'",
          ].join("; "),
        },
      ],
    },
  ],
};
