export function parseApiBaseUrl(raw: string): string {
  if (!raw.trim()) return "";
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("VITE_API_BASE_URL must be a complete HTTPS origin.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    raw.includes("*") ||
    url.hostname.includes("*") ||
    /[;'"\s]/.test(url.origin) ||
    !(url.protocol === "https:" || (url.protocol === "http:" && local)) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "VITE_API_BASE_URL must be an HTTPS origin without credentials, paths, queries, or fragments (HTTP is allowed for localhost).",
    );
  }
  return url.origin;
}

export function apiUrl(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("Use an absolute API path.");
  return `${parseApiBaseUrl(import.meta.env.VITE_API_BASE_URL ?? "")}${path}`;
}
