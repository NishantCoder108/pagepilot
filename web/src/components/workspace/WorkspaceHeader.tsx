import { ArrowDownToLine, Globe2, Trash2 } from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";
import { sourceLabel } from "../../utils/sourceLabel";
import { exportWorkspace } from "../../export";

export default function WorkspaceHeader() {
  const { active, removeDocument, wordCount, busy } = usePagePilot();

  if (!active) return null;
  return (
    <div className="workspace-heading">
      <div>
        <div className="eyebrow">
          <span /> YOUR NEXT LITTLE DISCOVERY
        </div>
        <h1>{active.document.title}</h1>
        <div className="document-meta">
          <span>
            <Globe2 size={13} />
            {sourceLabel(active.document.source_url)}
          </span>
          <span>{Math.max(1, Math.ceil(wordCount / 220))} min read</span>
          <span>{active.document.passages.length} passages</span>
        </div>
      </div>
      <div className="document-actions">
        <button
          className="icon-button"
          aria-label="Export page as Markdown"
          title="Export Markdown"
          onClick={() => exportWorkspace(active)}
        >
          <ArrowDownToLine size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="Delete this page"
          title="Delete page"
          disabled={busy}
          onClick={() => void removeDocument(active.document.id)}
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
}
