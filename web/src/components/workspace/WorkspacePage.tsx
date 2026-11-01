import { BookOpen, CircleHelp, Sparkles, X } from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";
import WorkspaceHeader from "./WorkspaceHeader";
import SourceReader from "./SourceReader";
import AiPanel from "./AiPanel";

export default function WorkspacePage() {
  const { error, setError, mobilePane, setMobilePane } = usePagePilot();

  return (
    <div className="workspace">
      <WorkspaceHeader />
      {error && (
        <div className="notice error" role="alert">
          <CircleHelp size={17} />
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}
      <div className="mobile-pane-tabs">
        <button
          className={mobilePane === "ai" ? "selected" : ""}
          onClick={() => setMobilePane("ai")}
        >
          <Sparkles size={15} /> Understand
        </button>
        <button
          className={mobilePane === "source" ? "selected" : ""}
          onClick={() => setMobilePane("source")}
        >
          <BookOpen size={15} /> Source
        </button>
      </div>
      <div className="workspace-grid">
        <SourceReader />

        <AiPanel />
      </div>
    </div>
  );
}
