import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDB } from "idb";
import {
  clearKeys,
  clearLibrary,
  deleteWorkspace,
  loadLibrary,
  openLibrary,
  readKey,
  saveWorkspace,
  writeKey,
} from "./storage";
import type { Workspace } from "./types";
import { toMarkdown } from "./export";

function fixture(id = "doc1"): Workspace {
  return {
    document: {
      id,
      title: "A source",
      source_url: "https://example.com/article",
      extracted_at: 1000,
      passages: [{ id: "p1", heading: "Start", text: "Reliable evidence." }],
    },
    conversation: { id: `chat-${id}`, document_id: id },
    messages: [
      {
        id: `message-${id}`,
        conversation_id: `chat-${id}`,
        role: "assistant",
        content: "Answer [p1]",
        citations: ["p1"],
        status: "complete",
        created_at: 1001,
        provider: "openai",
        model: "gpt-5.4-mini",
      },
    ],
    summary: {
      document_id: id,
      content: "Summary [p1]",
      citations: ["p1"],
      status: "complete",
      created_at: 1002,
      provider: "openai",
      model: "gpt-5.4-mini",
    },
  };
}

let db: Awaited<ReturnType<typeof openLibrary>>;
beforeEach(async () => {
  db = await openLibrary();
});
afterEach(async () => {
  db.close();
  vi.unstubAllGlobals();
  await deleteDB("pagepilot");
});

describe("browser library schema and transactions", () => {
  it("rejects cleanly when browser policy disables IndexedDB", async () => {
    vi.stubGlobal("indexedDB", {
      open() {
        throw new DOMException("Storage disabled", "SecurityError");
      },
    });
    await expect(openLibrary()).rejects.toMatchObject({
      name: "SecurityError",
    });
  });
  it("creates version 1 stores and restores records after reopening", async () => {
    expect(db.version).toBe(1);
    expect(Array.from(db.objectStoreNames)).toEqual([
      "conversations",
      "documents",
      "messages",
      "summaries",
    ]);
    const w = fixture();
    await saveWorkspace(db, w);
    db.close();
    db = await openLibrary();
    expect(await loadLibrary(db)).toEqual([w]);
  });

  it("deletes dependent records while preserving another workspace", async () => {
    await saveWorkspace(db, fixture("one"));
    await saveWorkspace(db, fixture("two"));
    await deleteWorkspace(db, "one");
    expect((await loadLibrary(db)).map((w) => w.document.id)).toEqual(["two"]);
    expect(await db.get("messages", "message-one")).toBeUndefined();
    expect(await db.get("conversations", "chat-one")).toBeUndefined();
    expect(await db.get("summaries", "one")).toBeUndefined();
    await clearLibrary(db);
    expect(await loadLibrary(db)).toEqual([]);
  });

  it("removes old messages when starting a new conversation on the same page", async () => {
    const w = fixture();
    await saveWorkspace(db, w);
    w.messages = [];
    await saveWorkspace(db, w);
    expect(await db.count("messages")).toBe(0);
    expect((await loadLibrary(db))[0].summary).toEqual(w.summary);
  });

  it("recovers unfinished streams as incomplete on refresh", async () => {
    const w = fixture();
    w.messages[0].status = "streaming";
    w.summary!.status = "streaming";
    await saveWorkspace(db, w);
    const loaded = (await loadLibrary(db))[0];
    expect(loaded.summary?.status).toBe("incomplete");
    expect(loaded.messages[0].status).toBe("incomplete");
    expect(loaded.messages[0].content).toBe("Answer [p1]");
  });

  it("never persists or exports unexpected credential fields", async () => {
    const w = fixture();
    Object.assign(w.document, { api_key: "SECRET" });
    Object.assign(w.summary!, { key: "SECRET" });
    Object.assign(w.messages[0], { credential: "SECRET" });
    await saveWorkspace(db, w);
    expect(JSON.stringify(await loadLibrary(db))).not.toContain("SECRET");
    expect(toMarkdown(w)).not.toContain("SECRET");
    expect(toMarkdown(w)).toContain("### [p1] Start");
  });

  it("keeps credentials exclusively in session storage and clears all providers", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    });
    writeKey("openai", "secret-1");
    writeKey("gemini", "secret-2");
    expect(readKey("openai")).toBe("secret-1");
    expect(readKey("gemini")).toBe("secret-2");
    clearKeys();
    expect(readKey("openai")).toBe("");
    expect(readKey("gemini")).toBe("");
  });
});
