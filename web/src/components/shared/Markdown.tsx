import ReactMarkdown from "react-markdown";
import type { Workspace } from "../../types";

export default function Markdown({
  text,
  workspace,
  onPassage,
}: {
  text: string;
  workspace: Workspace;
  onPassage: (id: string) => void;
}) {
  const valid = new Set(workspace.document.passages.map((p) => p.id));
  const linked = text.replace(/\[(p\d+)\](?!\()/g, (match, id: string) =>
    valid.has(id) ? `[${id}](#passage-${id})` : match,
  );
  return (
    <div className="markdown">
      <ReactMarkdown
        skipHtml
        components={{
          img: () => null,
          a: ({ href, children }) => {
            if (href?.startsWith("#passage-")) {
              const id = href.slice(9);
              return valid.has(id) ? (
                <button
                  className="citation"
                  onClick={() => onPassage(id)}
                  aria-label={`Read source passage ${id}`}
                >
                  {children}
                </button>
              ) : (
                <span>{children}</span>
              );
            }
            return href && /^https?:\/\//i.test(href) ? (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            );
          },
        }}
      >
        {linked}
      </ReactMarkdown>
    </div>
  );
}
