import { describe, expect, it } from "vitest";
import {
  applyEvent,
  beginAttempt,
  createAttempt,
  interruptAttempt,
} from "./state";
import type { Workspace } from "../types";

function workspace(): Workspace {
  return {
    document: {
      id: "doc",
      title: "Source",
      source_url: null,
      extracted_at: 0,
      passages: [{ id: "p1", heading: null, text: "Evidence." }],
    },
    conversation: { id: "chat", document_id: "doc" },
    messages: [],
  };
}

describe("generation lifecycle", () => {
  it("keeps message identity stable and completes a streamed answer", () => {
    const original = workspace();
    const attempt = createAttempt(
      original,
      "chat",
      "Why?",
      "openai",
      "gpt-5.4-mini",
    );
    const started = beginAttempt(original, attempt);
    // React may invoke state updaters more than once; they must stay pure.
    expect(beginAttempt(original, attempt)).toEqual(started);
    expect(original.messages).toEqual([]);
    const partial = applyEvent(started, attempt, {
      type: "delta",
      text: "Because [p1]",
    });
    const complete = applyEvent(partial, attempt, {
      type: "complete",
      citations: ["p1"],
    });
    expect(complete.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(complete.messages[1]).toMatchObject({
      id: attempt.assistantId,
      content: "Because [p1]",
      status: "complete",
      citations: ["p1"],
    });
  });

  it("retries an interrupted answer without duplicating its user question", () => {
    const initial = workspace();
    const attempt = createAttempt(
      initial,
      "chat",
      "Why?",
      "openai",
      "gpt-5.4-mini",
    );
    const partial = applyEvent(beginAttempt(initial, attempt), attempt, {
      type: "delta",
      text: "Partial",
    });
    const interrupted = interruptAttempt(partial, attempt);
    expect(interrupted.messages[1]).toMatchObject({
      content: "Partial",
      status: "incomplete",
    });
    const retry = createAttempt(
      interrupted,
      "chat",
      "Why?",
      "openai",
      "gpt-5.4-mini",
      attempt.assistantId,
    );
    expect(retry.history).toEqual([]);
    const restarted = beginAttempt(interrupted, retry);
    expect(restarted.messages).toHaveLength(2);
    expect(restarted.messages[0].id).toBe(attempt.userId);
    expect(restarted.messages[1].id).not.toBe(attempt.assistantId);
  });

  it("updates a summary without overwriting conversation messages", () => {
    const chat = createAttempt(
      workspace(),
      "chat",
      "Why?",
      "openai",
      "gpt-5.4-mini",
    );
    const original = beginAttempt(workspace(), chat);
    const summary = createAttempt(
      original,
      "summary",
      "",
      "openai",
      "gpt-5.4-mini",
    );
    const partial = applyEvent(beginAttempt(original, summary), summary, {
      type: "delta",
      text: "Overview",
    });
    const interrupted = interruptAttempt(partial, summary);
    expect(interrupted.summary).toMatchObject({
      content: "Overview",
      status: "incomplete",
    });
    expect(interrupted.messages).toEqual(original.messages);
  });
});
