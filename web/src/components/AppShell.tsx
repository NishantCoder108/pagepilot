import { ShieldCheck, X } from "lucide-react";
import { usePagePilot } from "../context/PagePilotContext";
import Sidebar from "./layout/Sidebar";
import Topbar from "./layout/Topbar";
import HomePage from "./home/HomePage";
import WorkspacePage from "./workspace/WorkspacePage";
import SettingsDialog from "./settings/SettingsDialog";

export default function AppShell() {
  const { active, storageNotice, setStorageNotice, backend } = usePagePilot();

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main">
        <Topbar />

        {storageNotice && (
          <div className="notice warning" role="status">
            <ShieldCheck size={17} />
            <span>{storageNotice}</span>
            <button
              aria-label="Dismiss storage notice"
              onClick={() => setStorageNotice("")}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {backend === "offline" && (
          <div className="notice warning" role="alert">
            The backend is unavailable. Start the Rust server with{" "}
            <code>cargo run</code>, then refresh. Your saved pages remain
            readable.
          </div>
        )}

        {!active ? <HomePage /> : <WorkspacePage />}
      </main>

      <SettingsDialog />
    </div>
  );
}
