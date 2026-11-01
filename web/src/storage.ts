import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  Conversation,
  Document,
  Message,
  Provider,
  Summary,
  Workspace,
} from "./types";

interface PagePilotDB extends DBSchema {
  documents: { key: string; value: Document };
  conversations: {
    key: string;
    value: Conversation;
    indexes: { document_id: string };
  };
  messages: {
    key: string;
    value: Message;
    indexes: { conversation_id: string };
  };
  summaries: { key: string; value: Summary };
}

export async function openLibrary(): Promise<IDBPDatabase<PagePilotDB>> {
  return openDB<PagePilotDB>("pagepilot", 1, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore("documents", { keyPath: "id" });
        db.createObjectStore("conversations", { keyPath: "id" }).createIndex(
          "document_id",
          "document_id",
          { unique: true },
        );
        db.createObjectStore("messages", { keyPath: "id" }).createIndex(
          "conversation_id",
          "conversation_id",
        );
        db.createObjectStore("summaries", { keyPath: "document_id" });
      }
    },
    blocked() {
      /* An older tab must close before a future schema upgrade. */
    },
    blocking(_current, _blocked, event) {
      (event.target as IDBDatabase).close();
    },
  });
}

// Explicit projections prevent accidental future UI/credential fields from
// leaking into durable storage, even if a caller supplies extra properties.
export async function saveWorkspace(
  db: IDBPDatabase<PagePilotDB>,
  w: Workspace,
): Promise<void> {
  const tx = db.transaction(
    ["documents", "conversations", "messages", "summaries"],
    "readwrite",
  );
  const d = w.document;
  await tx.objectStore("documents").put({
    id: d.id,
    title: d.title,
    source_url: d.source_url,
    extracted_at: d.extracted_at,
    passages: d.passages.map((p) => ({
      id: p.id,
      heading: p.heading,
      text: p.text,
    })),
  });
  await tx
    .objectStore("conversations")
    .put({ id: w.conversation.id, document_id: d.id });
  for (const id of await tx
    .objectStore("messages")
    .index("conversation_id")
    .getAllKeys(w.conversation.id))
    await tx.objectStore("messages").delete(id);
  for (const m of w.messages) {
    await tx.objectStore("messages").put({
      id: m.id,
      conversation_id: m.conversation_id,
      role: m.role,
      content: m.content,
      citations: [...m.citations],
      provider: m.provider,
      model: m.model,
      created_at: m.created_at,
      status: m.status,
    });
  }
  if (w.summary) {
    const s = w.summary;
    await tx.objectStore("summaries").put({
      document_id: d.id,
      content: s.content,
      citations: [...s.citations],
      provider: s.provider,
      model: s.model,
      created_at: s.created_at,
      status: s.status,
    });
  } else await tx.objectStore("summaries").delete(d.id);
  await tx.done;
}

export async function loadLibrary(
  db: IDBPDatabase<PagePilotDB>,
): Promise<Workspace[]> {
  const tx = db.transaction(
    ["documents", "conversations", "messages", "summaries"],
    "readonly",
  );
  const workspaces: Workspace[] = [];
  for (const document of await tx.objectStore("documents").getAll()) {
    const conversation = await tx
      .objectStore("conversations")
      .index("document_id")
      .get(document.id);
    if (!conversation) continue;
    const messages = (
      await tx
        .objectStore("messages")
        .index("conversation_id")
        .getAll(conversation.id)
    )
      .sort((a, b) => a.created_at - b.created_at)
      .map((m) => ({
        ...m,
        status: m.status === "streaming" ? ("incomplete" as const) : m.status,
      }));
    const saved = await tx.objectStore("summaries").get(document.id);
    const summary = saved && {
      ...saved,
      status:
        saved.status === "streaming" ? ("incomplete" as const) : saved.status,
    };
    workspaces.push({ document, conversation, messages, summary });
  }
  await tx.done;
  return workspaces.sort(
    (a, b) => b.document.extracted_at - a.document.extracted_at,
  );
}

export async function deleteWorkspace(
  db: IDBPDatabase<PagePilotDB>,
  id: string,
): Promise<void> {
  const tx = db.transaction(
    ["documents", "conversations", "messages", "summaries"],
    "readwrite",
  );
  const conversation = await tx
    .objectStore("conversations")
    .index("document_id")
    .get(id);
  if (conversation) {
    for (const key of await tx
      .objectStore("messages")
      .index("conversation_id")
      .getAllKeys(conversation.id))
      await tx.objectStore("messages").delete(key);
    await tx.objectStore("conversations").delete(conversation.id);
  }
  await tx.objectStore("summaries").delete(id);
  await tx.objectStore("documents").delete(id);
  await tx.done;
}

export async function clearLibrary(
  db: IDBPDatabase<PagePilotDB>,
): Promise<void> {
  const tx = db.transaction(
    ["documents", "conversations", "messages", "summaries"],
    "readwrite",
  );
  await Promise.all(
    Array.from(tx.objectStoreNames).map((name) => tx.objectStore(name).clear()),
  );
  await tx.done;
}

export function readKey(provider: Provider): string {
  return sessionStorage.getItem(`pagepilot.key.${provider}`) || "";
}
export function writeKey(provider: Provider, key: string): void {
  if (key) sessionStorage.setItem(`pagepilot.key.${provider}`, key);
  else sessionStorage.removeItem(`pagepilot.key.${provider}`);
}
export function clearKeys(): void {
  for (const provider of ["openai", "anthropic", "gemini"] as Provider[])
    sessionStorage.removeItem(`pagepilot.key.${provider}`);
}
