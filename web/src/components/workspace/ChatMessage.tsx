import { Sparkles } from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";
import type { Message } from "../../types";
import Markdown from "../shared/Markdown";

export default function ChatMessage({
  message: m,
  index: i,
}: {
  message: Message;
  index: number;
}) {
  const { active, generating, run, showPassage } = usePagePilot();

  if (!active) return null;
  return (
    <div key={m.id} className={`message ${m.role}`}>
      <div className="message-author">
        {m.role === "user" ? (
          <>
            <span className="user-avatar">Y</span>You
          </>
        ) : (
          <>
            <span className="ai-avatar">
              <Sparkles size={12} />
            </span>
            PagePilot<small>{m.model}</small>
          </>
        )}
      </div>
      {m.role === "user" ? (
        <p>{m.content}</p>
      ) : (
        <Markdown text={m.content} workspace={active} onPassage={showPassage} />
      )}
      {m.status === "incomplete" && (
        <div className="incomplete">
          <span>Incomplete response</span>
          {i === active.messages.length - 1 && (
            <button
              disabled={generating}
              onClick={() =>
                void run("chat", active.messages[i - 1]?.content, m.id)
              }
            >
              Retry answer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
