import { Link2, MessageSquare, Sparkles } from "lucide-react";

export default function Workflow() {
  return (
    <section className="how-it-works">
      <div className="section-label">A THOUGHTFUL LITTLE WORKFLOW</div>
      <div className="workflow-grid">
        <div>
          <span className="step-icon">
            <Link2 size={19} />
          </span>
          <h3>A link is all it takes</h3>
          <p>
            Articles, guides, deep dives.
            <br />
            Bring something worth reading.
          </p>
          <small>01</small>
        </div>
        <div>
          <span className="step-icon">
            <Sparkles size={19} />
          </span>
          <h3>Find the signal</h3>
          <p>
            Get the big picture and the
            <br />
            details that actually matter.
          </p>
          <small>02</small>
        </div>
        <div>
          <span className="step-icon">
            <MessageSquare size={19} />
          </span>
          <h3>Stay curious</h3>
          <p>
            Ask a follow-up. Every answer
            <br />
            leads back to the source.
          </p>
          <small>03</small>
        </div>
      </div>
    </section>
  );
}
