import {
  ArrowRight,
  FileText,
  Globe2,
  Link2,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";

export default function ReadingInput() {
  const {
    ready,
    url,
    setUrl,
    text,
    setText,
    title,
    setTitle,
    inputMode,
    setInputMode,
    extracting,
    readPage,
  } = usePagePilot();

  return (
    <section className="input-card" aria-label="Read a page">
      <div className="input-tabs">
        <button
          className={inputMode === "url" ? "selected" : ""}
          onClick={() => setInputMode("url")}
        >
          <Link2 size={15} /> From a link
        </button>
        <button
          className={inputMode === "text" ? "selected" : ""}
          onClick={() => setInputMode("text")}
        >
          <FileText size={15} /> Paste text
        </button>
        <span>No account needed</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void readPage();
        }}
      >
        {inputMode === "url" ? (
          <div className="url-entry">
            <Globe2 size={21} />
            <input
              aria-label="Page URL"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Drop a link you're curious about…"
              disabled={extracting}
            />
            <button
              className="primary"
              disabled={!ready || extracting || !url.trim()}
            >
              {extracting ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <>
                  Read page <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="paste-entry">
            <input
              aria-label="Document title"
              placeholder="Give it a title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={240}
            />
            <textarea
              aria-label="Pasted text"
              placeholder="Paste an article, notes, or documentation here. Use # headings and blank lines to separate passages."
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              rows={6}
            />
            <div>
              <small>Up to 200 KB of readable text</small>
              <button
                className="primary"
                disabled={!ready || extracting || !text.trim()}
              >
                {extracting ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <>
                    Read text <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
      <div className="input-card-footer">
        <ShieldCheck size={13} />
        <span>Read first. Bring your own AI key when you're ready.</span>
      </div>
    </section>
  );
}
