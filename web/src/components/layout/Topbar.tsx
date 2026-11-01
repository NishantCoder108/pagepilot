import { Check, ChevronRight, KeyRound } from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";
import { PROVIDERS } from "../../content";

export default function Topbar() {
  const { active, backend, provider, key, setSettingsOpen } = usePagePilot();

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>{active ? "Your library" : "Your reading space"}</span>
        {active && (
          <>
            <ChevronRight size={13} />
            <strong>Page workspace</strong>
          </>
        )}
      </div>
      <div className="topbar-actions">
        <span
          className={`service-status ${backend}`}
          title={
            backend === "online"
              ? "Rust backend is healthy"
              : "Backend connection status"
          }
        >
          <i />
          {backend === "checking"
            ? "Connecting"
            : backend === "online"
              ? "All systems ready"
              : "Backend offline"}
        </span>
        <button
          className={`connect-button ${key ? "connected" : ""}`}
          onClick={() => setSettingsOpen(true)}
        >
          <KeyRound size={14} />
          {key ? PROVIDERS[provider] : "Connect AI"}
          {key && <Check size={12} />}
        </button>
      </div>
    </header>
  );
}
