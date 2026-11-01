import { ArrowRight, FileText } from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";
import { sourceLabel } from "../../utils/sourceLabel";

export default function RecentPages() {
  const { workspaces, activate } = usePagePilot();

  return (
    <section className="recent-section">
      <div className="section-label">PICK UP WHERE YOU LEFT OFF</div>
      <div className="recent-grid">
        {workspaces.map((w) => (
          <button key={w.document.id} onClick={() => activate(w.document.id)}>
            <FileText size={20} />
            <small>{sourceLabel(w.document.source_url)}</small>
            <h3>{w.document.title}</h3>
            <span>
              Continue reading <ArrowRight size={14} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
