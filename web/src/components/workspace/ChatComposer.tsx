import { ArrowUp } from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";

export default function ChatComposer() {
  const { active, models, question, setQuestion, generating, run, newChat } =
    usePagePilot();

  if (!active) return null;
  return (
    <form
      className="chat-composer"
      onSubmit={(e) => {
        e.preventDefault();
        void run("chat");
      }}
    >
      <textarea
        aria-label="Question about this page"
        placeholder="Follow your curiosity…"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        disabled={generating}
        rows={2}
        maxLength={20_000}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void run("chat");
          }
        }}
      />
      <div>
        <button
          type="button"
          className="text-button"
          disabled={generating || !active.messages.length}
          onClick={newChat}
        >
          New chat
        </button>
        <button
          className="send-button"
          aria-label="Send question"
          disabled={generating || !question.trim() || !models.length}
        >
          <ArrowUp size={18} />
        </button>
      </div>
    </form>
  );
}
