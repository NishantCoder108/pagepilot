import { useState } from "react";
import {
  BookOpen,
  ChevronRight,
  FileText,
  Leaf,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";
import { sourceLabel } from "../../utils/sourceLabel";

export default function Sidebar() {
  const { workspaces, activeId, setSettingsOpen, activate, busy } =
    usePagePilot();
  const [librarySearch, setLibrarySearch] = useState("");
  const filteredLibrary = workspaces.filter((w) =>
    w.document.title.toLowerCase().includes(librarySearch.toLowerCase()),
  );
  return (
    <aside className="sidebar">
      <button
        className="brand"
        onClick={() => activate(null)}
        disabled={busy}
        aria-label="PagePilot home"
      >
        <span className="brand-mark">
          <BookOpen size={21} strokeWidth={1.8} />
        </span>
        <span>
          pagepilot<span className="brand-dot">.</span>
        </span>
      </button>
      <button
        className="new-page"
        onClick={() => activate(null)}
        disabled={busy}
      >
        <Plus size={17} /> New page <span>↗</span>
      </button>
      <div className="library-heading">
        <span>YOUR LIBRARY</span>
        <span className="count">{workspaces.length}</span>
      </div>
      {workspaces.length > 4 && (
        <label className="library-search">
          <Search size={14} />
          <input
            aria-label="Search saved pages"
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            placeholder="Find a page…"
          />
        </label>
      )}
      <nav className="library-list" aria-label="Saved pages">
        {!workspaces.length && (
          <div className="library-empty">
            <FileText size={23} strokeWidth={1.3} />
            <p>
              A little space for
              <br />
              your next big idea.
            </p>
            <span>Pages you read will appear here.</span>
          </div>
        )}
        {filteredLibrary.map((w) => (
          <button
            key={w.document.id}
            className={`library-item ${activeId === w.document.id ? "active" : ""}`}
            disabled={busy}
            onClick={() => activate(w.document.id)}
          >
            <FileText size={16} />
            <span>
              {w.document.title}
              <small>{sourceLabel(w.document.source_url)}</small>
            </span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="local-note">
          <ShieldCheck size={17} />
          <div>
            Your space. Your data.
            <small>History stays in this browser.</small>
          </div>
        </div>
        <button
          className="sidebar-settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 size={16} /> AI & preferences <ChevronRight size={15} />
        </button>
        <div className="sidebar-footer">
          Made for curious minds <Leaf size={12} />
        </div>
      </div>
    </aside>
  );
}
