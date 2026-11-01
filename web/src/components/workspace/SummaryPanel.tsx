import { ArrowRight, Check, FileText, Sparkles } from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";
import { QUESTIONS } from "../../content";
import Markdown from "../shared/Markdown";

export default function SummaryPanel() {
  const {
    active,
    models,
    key,
    setTab,
    setQuestion,
    generating,
    run,
    showPassage,
  } = usePagePilot();

  if (!active) return null;
  return (
    <div className="summary-content">
      {!active.summary ? (
        <div className="ai-empty">
          <span className="empty-illustration">
            <FileText size={43} strokeWidth={1.1} />
            <span>
              <Sparkles size={20} />
            </span>
          </span>
          <h2>
            The big picture,
            <br />
            <em>without the big scroll.</em>
          </h2>
          <p>
            Make room for what matters. Get a thoughtful
            <br />
            overview, then explore the details.
          </p>
          <button
            className="primary"
            disabled={generating || !models.length}
            onClick={() => void run("summary")}
          >
            <Sparkles size={16} />
            {key ? "Summarize this page" : "Connect AI to summarize"}
          </button>
          <small>Your provider receives this source. API charges apply.</small>
        </div>
      ) : (
        <>
          <div className="generation-heading">
            <span className="section-label">THE ESSENTIALS</span>
            <span>{active.summary.model}</span>
          </div>
          <Markdown
            text={active.summary.content}
            workspace={active}
            onPassage={showPassage}
          />
          {active.summary.status === "incomplete" && (
            <div className="incomplete">
              <span>Incomplete response</span>
              <button disabled={generating} onClick={() => void run("summary")}>
                Retry summary
              </button>
            </div>
          )}
          {!generating && active.summary.status === "complete" && (
            <div className="summary-bottom">
              <span>
                <Check size={13} /> Grounded in this page
              </span>
              <button
                className="text-button"
                onClick={() => void run("summary")}
              >
                Regenerate
              </button>
            </div>
          )}
        </>
      )}
      {!generating && active.summary && (
        <div className="next-questions">
          <span className="section-label">KEEP THE CURIOSITY GOING</span>
          {QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => {
                setTab("chat");
                setQuestion(q);
              }}
            >
              {q}
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
