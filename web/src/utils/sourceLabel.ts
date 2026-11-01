export function sourceLabel(url: string | null): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "Pasted text";
  } catch {
    return "Saved source";
  }
}
