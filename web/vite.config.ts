import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { parseApiBaseUrl } from "./src/config.ts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  const origin = parseApiBaseUrl(env.VITE_API_BASE_URL ?? "");
  if (process.env.VERCEL && !origin) {
    throw new Error(
      "Set VITE_API_BASE_URL to your backend HTTPS origin before deploying to Vercel.",
    );
  }
  if (process.env.VERCEL && new URL(origin).protocol !== "https:") {
    throw new Error("VITE_API_BASE_URL must use HTTPS on Vercel.");
  }
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": "http://127.0.0.1:3000",
        "/health": "http://127.0.0.1:3000",
      },
    },
  };
});
