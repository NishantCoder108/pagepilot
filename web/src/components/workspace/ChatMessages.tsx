import { useEffect, useRef } from "react";
import { ArrowRight, MessageSquare } from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";
import { QUESTIONS } from "../../content";
import ChatMessage from "./ChatMessage";

export default function ChatMessages() {
  const { active, setQuestion } = usePagePilot();
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active?.messages.length]);
  if (!active) return null;
  return (
    <div className="chat-content">
      {!active.messages.length && (
        <div className="chat-empty">
          <span className="step-icon">
            <MessageSquare size={22} />
          </span>
          <h2>
            Good questions
            <br />
            lead to good discoveries.
          </h2>
          <p>
            Ask about an idea, a detail, or something
            <br />
            you'd like explained a little differently.
          </p>
          {QUESTIONS.map((q) => (
            <button
              className="question-chip"
              key={q}
              onClick={() => setQuestion(q)}
            >
              {q}
              <ArrowRight size={13} />
            </button>
          ))}
        </div>
      )}
      {active.messages.map((m, i) => (
        <ChatMessage key={m.id} message={m} index={i} />
      ))}
      <div ref={chatEnd} />
    </div>
  );
}
