import type { Workspace } from "./types";

export function toMarkdown(w: Workspace): string {
  const d = w.document;
  const lines = [
    `# ${d.title}`,
    "",
    d.source_url ? `Source: ${d.source_url}` : "Source: pasted text",
    `Saved: ${new Date(d.extracted_at).toISOString()}`,
    "",
  ];
  if (w.summary)
    lines.push(
      "## Summary",
      `*${w.summary.model} · ${w.summary.status}*`,
      "",
      w.summary.content,
      "",
    );
  if (w.messages.length)
    lines.push(
      "## Conversation",
      "",
      ...w.messages.flatMap((m) => [
        `### ${m.role === "user" ? "You" : "PagePilot"}${m.status === "complete" ? "" : " (incomplete)"}`,
        "",
        m.content,
        "",
      ]),
    );
  lines.push("## Source passages", "");
  for (const p of d.passages)
    lines.push(
      `### [${p.id}]${p.heading ? ` ${p.heading}` : ""}`,
      "",
      p.text,
      "",
    );
  return lines.join("\n");
}

export function exportWorkspace(w: Workspace): void {
  const url = URL.createObjectURL(
    new Blob([toMarkdown(w)], { type: "text/markdown;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${w.document.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 80) || "pagepilot"}.md`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
