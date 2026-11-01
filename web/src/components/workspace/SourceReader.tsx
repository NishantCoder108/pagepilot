import { BookOpen, ExternalLink, Settings2 } from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";

export default function SourceReader() {
  const {
    active,
    mobilePane,
    generating,
    highlight,
    focusMode,
    setFocusMode,
    selected,
    setSelected,
  } = usePagePilot();

  if (!active) return null;
  return (
    <section
      className={`source-panel panel ${mobilePane === "source" ? "mobile-visible" : ""}`}
    >
      <div className="panel-header">
        <span>
          <BookOpen size={17} /> The source
        </span>
        {active.document.source_url &&
          /^https?:\/\//i.test(active.document.source_url) && (
            <a
              href={active.document.source_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open original page"
            >
              <ExternalLink size={15} />
            </a>
          )}
      </div>
      <div className="source-tools">
        <button
          className={focusMode ? "focus-toggle on" : "focus-toggle"}
          disabled={generating}
          onClick={() => {
            setFocusMode(!focusMode);
            if (!focusMode)
              setSelected(active.document.passages.map((p) => p.id));
          }}
        >
          <Settings2 size={13} />
          {focusMode
            ? `${selected.length} passages in AI context`
            : "Focus on selected passages"}
        </button>
        {focusMode && (
          <button
            className="text-button"
            disabled={generating}
            onClick={() =>
              setSelected(
                selected.length
                  ? []
                  : active.document.passages.map((p) => p.id),
              )
            }
          >
            {selected.length ? "Clear" : "Select all"}
          </button>
        )}
      </div>
      <div className="source-content">
        {active.document.passages.map((p, index) => (
          <article
            id={`passage-${p.id}`}
            key={p.id}
            className={`passage ${highlight === p.id ? "highlighted" : ""} ${focusMode && !selected.includes(p.id) ? "unselected" : ""}`}
          >
            <div className="passage-label">
              {focusMode && (
                <input
                  type="checkbox"
                  aria-label={`Include passage ${p.id}`}
                  checked={selected.includes(p.id)}
                  disabled={generating}
                  onChange={(e) =>
                    setSelected((ids) =>
                      e.target.checked
                        ? [...ids, p.id]
                        : ids.filter((id) => id !== p.id),
                    )
                  }
                />
              )}
              <span>{p.id}</span>
            </div>
            <div>
              {p.heading &&
                (index === 0 ||
                  p.heading !==
                    active.document.passages[index - 1].heading) && (
                  <h3>{p.heading}</h3>
                )}
              <p>{p.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
