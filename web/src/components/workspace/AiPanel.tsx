import {
  ChevronRight,
  LoaderCircle,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Square,
} from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";
import SummaryPanel from "./SummaryPanel";
import ChatMessages from "./ChatMessages";
import ChatComposer from "./ChatComposer";

export default function AiPanel() {
  const {
    key,
    selectedModel,
    setSettingsOpen,
    tab,
    setTab,
    mobilePane,
    generating,
    progress,
    stop,
  } = usePagePilot();

  return (
    <section
      className={`ai-panel panel ${mobilePane === "ai" ? "mobile-visible" : ""}`}
    >
      <div className="ai-tabs">
        <button
          className={tab === "summary" ? "selected" : ""}
          onClick={() => setTab("summary")}
        >
          <Sparkles size={15} /> Overview
        </button>
        <button
          className={tab === "chat" ? "selected" : ""}
          onClick={() => setTab("chat")}
        >
          <MessageSquare size={15} /> Ask this page
        </button>
      </div>
      <button className="model-indicator" onClick={() => setSettingsOpen(true)}>
        <span className="tiny-spark">
          <Sparkles size={12} />
        </span>
        {key
          ? selectedModel?.label || "Choose a model"
          : "Connect your AI to get started"}
        <ChevronRight size={13} />
      </button>
      {tab === "summary" ? (
        <SummaryPanel />
      ) : (
        <>
          <ChatMessages />
          <ChatComposer />
        </>
      )}
      {generating && (
        <div className="stream-status" role="status">
          <LoaderCircle size={14} className="spin" />
          <span>{progress}</span>
          <button onClick={stop}>
            <Square size={11} /> Stop
          </button>
        </div>
      )}
      <div className="ai-disclaimer">
        <ShieldCheck size={12} /> AI can make mistakes. Check the source
        passages.
      </div>
    </section>
  );
}
