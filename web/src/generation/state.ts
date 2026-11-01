import type { Message, Provider, StreamEvent, Workspace } from "../types";

export type GenerationMode = "summary" | "chat";
export interface Attempt {
  mode: GenerationMode;
  assistantId: string;
  userId: string;
  provider: Provider;
  model: string;
  created: number;
  baseMessages: Message[];
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
  retry: boolean;
}

export function createAttempt(
  workspace: Workspace,
  mode: GenerationMode,
  question: string,
  provider: Provider,
  model: string,
  retryId?: string,
): Attempt {
  const baseMessages = retryId
    ? workspace.messages.slice(
        0,
        workspace.messages.findIndex((m) => m.id === retryId),
      )
    : workspace.messages;
  // Retry replaces the failed assistant after its original user message.
  const history = (retryId ? baseMessages.slice(0, -1) : baseMessages)
    .filter((m) => m.status === "complete")
    .map((m) => ({ role: m.role, content: m.content }));
  return {
    mode,
    assistantId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    provider,
    model,
    created: Date.now(),
    baseMessages,
    history,
    question,
    retry: Boolean(retryId),
  };
}

export function beginAttempt(
  workspace: Workspace,
  attempt: Attempt,
): Workspace {
  const { provider, model, created, mode } = attempt;
  const metadata = {
    provider,
    model,
    citations: [],
    status: "streaming" as const,
  };
  if (mode === "summary")
    return {
      ...workspace,
      summary: {
        ...metadata,
        document_id: workspace.document.id,
        content: "",
        created_at: created,
      },
    };
  const user: Message = {
    id: attempt.userId,
    conversation_id: workspace.conversation.id,
    role: "user",
    content: attempt.question,
    citations: [],
    created_at: created,
    status: "complete",
  };
  const assistant: Message = {
    ...metadata,
    id: attempt.assistantId,
    conversation_id: workspace.conversation.id,
    role: "assistant",
    content: "",
    created_at: created + 1,
  };
  return {
    ...workspace,
    messages: [
      ...attempt.baseMessages,
      ...(attempt.retry ? [] : [user]),
      assistant,
    ],
  };
}

export function applyEvent(
  workspace: Workspace,
  attempt: Attempt,
  event: Exclude<StreamEvent, { type: "progress" }>,
): Workspace {
  const apply = <
    T extends { content: string; citations: string[]; status: string },
  >(
    value: T,
  ): T => ({
    ...value,
    content:
      event.type === "delta" ? value.content + event.text : value.content,
    status: event.type === "complete" ? "complete" : "streaming",
    citations: event.type === "complete" ? event.citations : value.citations,
  });
  if (attempt.mode === "summary" && workspace.summary)
    return { ...workspace, summary: apply(workspace.summary) };
  return {
    ...workspace,
    messages: workspace.messages.map((message) =>
      message.id === attempt.assistantId ? apply(message) : message,
    ),
  };
}

export function interruptAttempt(
  workspace: Workspace,
  attempt: Attempt,
): Workspace {
  if (attempt.mode === "summary" && workspace.summary)
    return {
      ...workspace,
      summary: { ...workspace.summary, status: "incomplete" },
    };
  return {
    ...workspace,
    messages: workspace.messages.map((message) =>
      message.id === attempt.assistantId
        ? { ...message, status: "incomplete" }
        : message,
    ),
  };
}
