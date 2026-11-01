import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  FileText,
  Globe2,
  KeyRound,
  Leaf,
  Link2,
  LoaderCircle,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { ApiError, extract, fetchModels, generate } from "./api";
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
import { exportWorkspace } from "./export";
import type { Message, Model, Provider, Workspace } from "./types";

const PROVIDERS: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
};
const QUESTIONS = [
  "What are the main ideas?",
  "Explain this in simpler terms.",
  "What practical steps does this suggest?",
];
const SAMPLE = `# The quiet power of focused reading

We have more information within reach than ever before, yet understanding still takes attention. Focused reading means choosing one useful question before opening an article, and giving the source enough time to answer it.

## Start with a question

Instead of collecting links for later, ask what you want to learn now. A specific question helps you notice the passages that matter. For example, a developer learning Rust might ask how Tokio handles many network requests at once.

## Read, then reflect

A summary provides a map of an article, but returning to the original passages helps preserve nuance. Ask a follow-up question, check the evidence, and explain the idea in your own words. This turns passive browsing into active understanding.

## Keep the useful parts close

An automatic local reading history removes the need to organize every page into folders. Save the source and conversation together, export what you need, and delete what no longer helps. The goal is to spend less time managing information and more time learning from it.`;

function sourceLabel(url: string | null): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "Pasted text";
  } catch {
    return "Saved source";
  }
}

function Markdown({
  text,
  workspace,
  onPassage,
}: {
  text: string;
  workspace: Workspace;
  onPassage: (id: string) => void;
}) {
  const valid = new Set(workspace.document.passages.map((p) => p.id));
  const linked = text.replace(/\[(p\d+)\](?!\()/g, (match, id: string) =>
    valid.has(id) ? `[${id}](#passage-${id})` : match,
  );
  return (
    <div className="markdown">
      <ReactMarkdown
        skipHtml
        components={{
          img: () => null,
          a: ({ href, children }) => {
            if (href?.startsWith("#passage-")) {
              const id = href.slice(9);
              return valid.has(id) ? (
                <button
                  className="citation"
                  onClick={() => onPassage(id)}
                  aria-label={`Read source passage ${id}`}
                >
                  {children}
                </button>
              ) : (
                <span>{children}</span>
              );
            }
            return href && /^https?:\/\//i.test(href) ? (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            );
          },
        }}
      >
        {linked}
      </ReactMarkdown>
    </div>
  );
}

export default function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [extracting, setExtracting] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [backend, setBackend] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState("");
  const [key, setKey] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<"summary" | "chat">("summary");
  const [mobilePane, setMobilePane] = useState<"ai" | "source">("ai");
  const [question, setQuestion] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [highlight, setHighlight] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const db = useRef<Awaited<ReturnType<typeof openLibrary>> | null>(null);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const keys = useRef<Partial<Record<Provider, string>>>({});
  const controller = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const active = workspaces.find((w) => w.document.id === activeId);
  const latestActive = useRef<Workspace | undefined>(undefined);
  const selectedModel = models.find(
    (m) => m.id === model && m.provider === provider,
  );

  const storageFailure = () =>
    setStorageNotice(
      "Browser storage is unavailable or full. You can keep reading in this session; export important work before leaving.",
    );

  useEffect(() => {
    let disposed = false;
    let connection: Awaited<ReturnType<typeof openLibrary>> | null = null;
    void openLibrary()
      .then(async (value) => {
        connection = value;
        if (disposed) {
          value.close();
          return;
        }
        db.current = value;
        const saved = await loadLibrary(value);
        if (!disposed) {
          setWorkspaces(saved);
          try {
            const last = sessionStorage.getItem("pagepilot.active");
            if (saved.some((w) => w.document.id === last)) setActiveId(last);
          } catch {
            storageFailure();
          }
        }
      })
      .catch(() => {
        if (!disposed) storageFailure();
      })
      .finally(() => {
        if (!disposed) setReady(true);
      });
    for (const p of Object.keys(PROVIDERS) as Provider[]) {
      try {
        keys.current[p] = readKey(p);
      } catch {
        storageFailure();
      }
    }
    setKey(keys.current.openai || "");
    void Promise.all([
      fetch("/health").then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
      fetchModels(),
    ])
      .then(([, catalog]) => {
        if (disposed) return;
        setBackend("online");
        setModels(catalog);
        let preferred: { provider?: Provider; model?: string } = {};
        try {
          preferred = JSON.parse(
            sessionStorage.getItem("pagepilot.preferences") || "{}",
          );
        } catch {
          /* Use defaults for malformed preferences. */
        }
        const choice =
          catalog.find(
            (m) =>
              m.provider === preferred.provider && m.id === preferred.model,
          ) || catalog[0];
        if (choice) {
          setProvider(choice.provider);
          setModel(choice.id);
          setKey(keys.current[choice.provider] || "");
        }
      })
      .catch(() => {
        if (!disposed) setBackend("offline");
      });
    return () => {
      disposed = true;
      connection?.close();
    };
  }, []);

  useEffect(() => {
    latestActive.current = active;
    if (!ready || !active || !db.current || generating) return;
    const current = active;
    saveQueue.current = saveQueue.current
      .then(() => db.current && saveWorkspace(db.current, current))
      .catch(storageFailure);
  }, [active, ready, generating]);

  useEffect(() => {
    if (!ready || !generating || !db.current) return;
    // Periodic snapshots, rather than a debounce: a continuous stream must
    // still save partial output before a refresh or connection interruption.
    const persist = () => {
      const current = latestActive.current;
      if (!current) return;
      saveQueue.current = saveQueue.current
        .then(() => db.current && saveWorkspace(db.current, current))
        .catch(storageFailure);
    };
    persist();
    const handle = window.setInterval(persist, 350);
    return () => window.clearInterval(handle);
  }, [ready, generating]);

  useEffect(() => {
    if (settingsOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [settingsOpen]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active?.messages.length, tab]);
  useEffect(() => () => controller.current?.abort(), []);

  function activate(id: string | null) {
    if (generating || extracting) return;
    setActiveId(id);
    setError("");
    setSelected([]);
    setFocusMode(false);
    setQuestion("");
    setTab("summary");
    setMobilePane("ai");
    try {
      if (id) sessionStorage.setItem("pagepilot.active", id);
      else sessionStorage.removeItem("pagepilot.active");
    } catch {
      storageFailure();
    }
  }

  function update(id: string, change: (workspace: Workspace) => Workspace) {
    setWorkspaces((items) =>
      items.map((w) => (w.document.id === id ? change(w) : w)),
    );
  }

  async function readPage(sample = false) {
    if (extracting || generating) return;
    setError("");
    setExtracting(true);
    try {
      const document = await extract(
        sample
          ? { text: SAMPLE, title: "The quiet power of focused reading" }
          : inputMode === "url"
            ? { url: url.trim() }
            : { text, title },
      );
      const workspace: Workspace = {
        document,
        conversation: { id: crypto.randomUUID(), document_id: document.id },
        messages: [],
      };
      setWorkspaces((items) => [workspace, ...items]);
      setActiveId(document.id);
      setTab("summary");
      setMobilePane("ai");
      setSelected([]);
      setFocusMode(false);
      setQuestion("");
      try {
        sessionStorage.setItem("pagepilot.active", document.id);
      } catch {
        storageFailure();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this page.");
    } finally {
      setExtracting(false);
    }
  }

  function changeProvider(value: Provider) {
    setProvider(value);
    setKey(keys.current[value] || "");
    const next = models.find((m) => m.provider === value)?.id || "";
    setModel(next);
    savePreferences(value, next);
  }

  function savePreferences(p: Provider, m: string) {
    try {
      sessionStorage.setItem(
        "pagepilot.preferences",
        JSON.stringify({ provider: p, model: m }),
      );
    } catch {
      storageFailure();
    }
  }

  function changeKey(value: string) {
    const clean = value.trim();
    setKey(clean);
    keys.current[provider] = clean;
    try {
      writeKey(provider, clean);
    } catch {
      setStorageNotice(
        "Session storage is unavailable. This key will work until you refresh.",
      );
    }
  }

  function forgetKeys() {
    keys.current = {};
    setKey("");
    try {
      clearKeys();
    } catch {
      setStorageNotice(
        "The browser could not clear session storage. Clear this site’s data in browser settings.",
      );
    }
  }

  async function run(
    mode: "summary" | "chat",
    suppliedQuestion?: string,
    retryId?: string,
  ) {
    if (!active || generating || extracting) return;
    if (!key) {
      setSettingsOpen(true);
      return;
    }
    if (!selectedModel) {
      setError("Select an available model first.");
      return;
    }
    const ask = (suppliedQuestion ?? question).trim();
    if (mode === "chat" && !ask) return;
    if (focusMode && !selected.length) {
      setError(
        "Select at least one source passage, or turn off passage focus.",
      );
      return;
    }
    const documentId = active.document.id;
    const assistantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const created = Date.now();
    const baseMessages = retryId
      ? active.messages.slice(
          0,
          active.messages.findIndex((m) => m.id === retryId),
        )
      : active.messages;
    // A retry replaces the failed assistant after its original user message.
    const historyMessages = retryId ? baseMessages.slice(0, -1) : baseMessages;
    const history = historyMessages
      .filter((m) => m.status === "complete")
      .map((m) => ({ role: m.role, content: m.content }));
    setError("");
    setGenerating(true);
    setProgress("Connecting to your provider…");
    setMobilePane("ai");
    const abort = new AbortController();
    controller.current = abort;
    if (mode === "summary") {
      update(documentId, (w) => ({
        ...w,
        summary: {
          document_id: documentId,
          content: "",
          citations: [],
          provider,
          model,
          created_at: created,
          status: "streaming",
        },
      }));
    } else {
      const user: Message = {
        id: userId,
        conversation_id: active.conversation.id,
        role: "user",
        content: ask,
        citations: [],
        created_at: created,
        status: "complete",
      };
      const assistant: Message = {
        id: assistantId,
        conversation_id: active.conversation.id,
        role: "assistant",
        content: "",
        citations: [],
        provider,
        model,
        created_at: created + 1,
        status: "streaming",
      };
      update(documentId, (w) => ({
        ...w,
        messages: [...baseMessages, ...(retryId ? [] : [user]), assistant],
      }));
      setQuestion("");
    }
    try {
      await generate(
        {
          mode,
          provider,
          model,
          document: active.document,
          history: mode === "summary" ? [] : history,
          ...(mode === "chat" ? { question: ask } : {}),
          ...(focusMode ? { passage_ids: selected } : {}),
        },
        key,
        abort.signal,
        (event) => {
          if (event.type === "progress") {
            setProgress(event.message);
            return;
          }
          if (event.type === "delta") setProgress("Reading between the lines…");
          update(documentId, (w) => {
            if (mode === "summary" && w.summary)
              return {
                ...w,
                summary: {
                  ...w.summary,
                  content:
                    event.type === "delta"
                      ? w.summary.content + event.text
                      : w.summary.content,
                  status: event.type === "complete" ? "complete" : "streaming",
                  citations:
                    event.type === "complete"
                      ? event.citations
                      : w.summary.citations,
                },
              };
            return {
              ...w,
              messages: w.messages.map((m) =>
                m.id !== assistantId
                  ? m
                  : {
                      ...m,
                      content:
                        event.type === "delta"
                          ? m.content + event.text
                          : m.content,
                      status:
                        event.type === "complete" ? "complete" : "streaming",
                      citations:
                        event.type === "complete"
                          ? event.citations
                          : m.citations,
                    },
              ),
            };
          });
        },
      );
    } catch (e) {
      const stopped = abort.signal.aborted;
      setError(
        stopped
          ? "Generation stopped. Partial output is saved. Retrying starts a new paid request."
          : e instanceof Error
            ? e.message +
              (e instanceof ApiError && e.requestId
                ? ` (Request ${e.requestId.slice(0, 8)})`
                : "")
            : "Generation failed.",
      );
      update(documentId, (w) =>
        mode === "summary" && w.summary
          ? { ...w, summary: { ...w.summary, status: "incomplete" } }
          : {
              ...w,
              messages: w.messages.map((m) =>
                m.id === assistantId ? { ...m, status: "incomplete" } : m,
              ),
            },
      );
    } finally {
      setGenerating(false);
      setProgress("");
      controller.current = null;
    }
  }

  async function removeDocument(id: string) {
    if (generating) return;
    if (
      !window.confirm(
        "Delete this page, summary, and conversation from this browser?",
      )
    )
      return;
    await saveQueue.current;
    if (db.current) {
      try {
        await deleteWorkspace(db.current, id);
      } catch {
        storageFailure();
        setError(
          "Deletion failed. Try again or clear this site’s data in browser settings.",
        );
        return;
      }
    }
    setWorkspaces((items) => items.filter((w) => w.document.id !== id));
    if (activeId === id) activate(null);
  }

  async function removeHistory() {
    if (
      generating ||
      !window.confirm(
        "Delete all saved pages and conversations from this browser?",
      )
    )
      return;
    await saveQueue.current;
    if (db.current) {
      try {
        await clearLibrary(db.current);
      } catch {
        storageFailure();
        setError("History could not be cleared.");
        return;
      }
    }
    setWorkspaces([]);
    activate(null);
    setSettingsOpen(false);
  }

  function showPassage(id: string) {
    setMobilePane("source");
    setHighlight(id);
    setTimeout(
      () =>
        document
          .getElementById(`passage-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      50,
    );
  }

  function newChat() {
    if (
      !active ||
      generating ||
      !window.confirm(
        "Clear this page’s conversation and start a new chat? Your source and summary will remain.",
      )
    )
      return;
    update(active.document.id, (w) => ({ ...w, messages: [] }));
    setError("");
  }

  const wordCount =
    active?.document.passages.reduce(
      (sum, p) => sum + p.text.split(/\s+/).length,
      0,
    ) || 0;
  const busy = generating || extracting;
  const filteredLibrary = workspaces.filter((w) =>
    w.document.title.toLowerCase().includes(librarySearch.toLowerCase()),
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => activate(null)}
          disabled={busy}
          aria-label="PagePilot home"
        >
          <span className="brand-mark">
            <BookOpen size={21} strokeWidth={1.8} />
          </span>
          <span>
            pagepilot<span className="brand-dot">.</span>
          </span>
        </button>
        <button
          className="new-page"
          onClick={() => activate(null)}
          disabled={busy}
        >
          <Plus size={17} /> New page <span>↗</span>
        </button>
        <div className="library-heading">
          <span>YOUR LIBRARY</span>
          <span className="count">{workspaces.length}</span>
        </div>
        {workspaces.length > 4 && (
          <label className="library-search">
            <Search size={14} />
            <input
              aria-label="Search saved pages"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Find a page…"
            />
          </label>
        )}
        <nav className="library-list" aria-label="Saved pages">
          {!workspaces.length && (
            <div className="library-empty">
              <FileText size={23} strokeWidth={1.3} />
              <p>
                A little space for
                <br />
                your next big idea.
              </p>
              <span>Pages you read will appear here.</span>
            </div>
          )}
          {filteredLibrary.map((w) => (
            <button
              key={w.document.id}
              className={`library-item ${activeId === w.document.id ? "active" : ""}`}
              disabled={busy}
              onClick={() => activate(w.document.id)}
            >
              <FileText size={16} />
              <span>
                {w.document.title}
                <small>{sourceLabel(w.document.source_url)}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck size={17} />
            <div>
              Your space. Your data.
              <small>History stays in this browser.</small>
            </div>
          </div>
          <button
            className="sidebar-settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={16} /> AI & preferences <ChevronRight size={15} />
          </button>
          <div className="sidebar-footer">
            Made for curious minds <Leaf size={12} />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{active ? "Your library" : "Your reading space"}</span>
            {active && (
              <>
                <ChevronRight size={13} />
                <strong>Page workspace</strong>
              </>
            )}
          </div>
          <div className="topbar-actions">
            <span
              className={`service-status ${backend}`}
              title={
                backend === "online"
                  ? "Rust backend is healthy"
                  : "Backend connection status"
              }
            >
              <i />
              {backend === "checking"
                ? "Connecting"
                : backend === "online"
                  ? "All systems ready"
                  : "Backend offline"}
            </span>
            <button
              className={`connect-button ${key ? "connected" : ""}`}
              onClick={() => setSettingsOpen(true)}
            >
              <KeyRound size={14} />
              {key ? PROVIDERS[provider] : "Connect AI"}
              {key && <Check size={12} />}
            </button>
          </div>
        </header>

        {storageNotice && (
          <div className="notice warning" role="status">
            <ShieldCheck size={17} />
            <span>{storageNotice}</span>
            <button
              aria-label="Dismiss storage notice"
              onClick={() => setStorageNotice("")}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {backend === "offline" && (
          <div className="notice warning" role="alert">
            The backend is unavailable. Start the Rust server with{" "}
            <code>cargo run</code>, then refresh. Your saved pages remain
            readable.
          </div>
        )}

        {!active ? (
          <div className="home">
            <div className="home-intro">
              <div className="eyebrow">
                <span /> A CLEARER WAY TO EXPLORE THE WEB
              </div>
              <h1>
                Less scrolling.
                <br />
                More <em>understanding.</em>
              </h1>
              <p>
                Turn any article into a little more clarity.
                <br className="desktop-break" /> Read the essentials, ask
                questions, and follow your curiosity.
              </p>
            </div>
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
                <span>
                  Read first. Bring your own AI key when you're ready.
                </span>
              </div>
            </section>
            {error && (
              <div className="notice error" role="alert">
                <CircleHelp size={17} />
                <span>{error}</span>
                <button
                  className="text-button"
                  onClick={() => setInputMode("text")}
                >
                  Paste text instead
                </button>
              </div>
            )}
            <button
              className="sample-link"
              disabled={!ready || extracting}
              onClick={() => void readPage(true)}
            >
              Just looking around?{" "}
              <span>
                Try a sample article <ArrowRight size={13} />
              </span>
            </button>
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
            {workspaces.length > 0 && (
              <section className="recent-section">
                <div className="section-label">PICK UP WHERE YOU LEFT OFF</div>
                <div className="recent-grid">
                  {workspaces.map((w) => (
                    <button
                      key={w.document.id}
                      onClick={() => activate(w.document.id)}
                    >
                      <FileText size={20} />
                      <small>{sourceLabel(w.document.source_url)}</small>
                      <h3>{w.document.title}</h3>
                      <span>
                        Continue reading <ArrowRight size={14} />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <footer className="home-footer">
              <span>
                <ShieldCheck size={13} /> Browser-local history
              </span>
              <i /> <span>Your key, your choice</span>
              <i />
              <span>No folders to organize</span>
            </footer>
          </div>
        ) : (
          <div className="workspace">
            <div className="workspace-heading">
              <div>
                <div className="eyebrow">
                  <span /> YOUR NEXT LITTLE DISCOVERY
                </div>
                <h1>{active.document.title}</h1>
                <div className="document-meta">
                  <span>
                    <Globe2 size={13} />
                    {sourceLabel(active.document.source_url)}
                  </span>
                  <span>
                    {Math.max(1, Math.ceil(wordCount / 220))} min read
                  </span>
                  <span>{active.document.passages.length} passages</span>
                </div>
              </div>
              <div className="document-actions">
                <button
                  className="icon-button"
                  aria-label="Export page as Markdown"
                  title="Export Markdown"
                  onClick={() => exportWorkspace(active)}
                >
                  <ArrowDownToLine size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Delete this page"
                  title="Delete page"
                  disabled={busy}
                  onClick={() => void removeDocument(active.document.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            {error && (
              <div className="notice error" role="alert">
                <CircleHelp size={17} />
                <span>{error}</span>
                <button aria-label="Dismiss error" onClick={() => setError("")}>
                  <X size={15} />
                </button>
              </div>
            )}
            <div className="mobile-pane-tabs">
              <button
                className={mobilePane === "ai" ? "selected" : ""}
                onClick={() => setMobilePane("ai")}
              >
                <Sparkles size={15} /> Understand
              </button>
              <button
                className={mobilePane === "source" ? "selected" : ""}
                onClick={() => setMobilePane("source")}
              >
                <BookOpen size={15} /> Source
              </button>
            </div>
            <div className="workspace-grid">
              <section
                className={`source-panel panel ${mobilePane === "source" ? "mobile-visible" : ""}`}
              >
                <div className="panel-header">
                  <span>
                    <BookOpen size={17} /> The source
                  </span>
                  {active.document.source_url &&
                    /^https?:\/\//i.test(active.document.source_url) && (
                      <a
                        href={active.document.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open original page"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                </div>
                <div className="source-tools">
                  <button
                    className={focusMode ? "focus-toggle on" : "focus-toggle"}
                    disabled={generating}
                    onClick={() => {
                      setFocusMode(!focusMode);
                      if (!focusMode)
                        setSelected(active.document.passages.map((p) => p.id));
                    }}
                  >
                    <Settings2 size={13} />
                    {focusMode
                      ? `${selected.length} passages in AI context`
                      : "Focus on selected passages"}
                  </button>
                  {focusMode && (
                    <button
                      className="text-button"
                      disabled={generating}
                      onClick={() =>
                        setSelected(
                          selected.length
                            ? []
                            : active.document.passages.map((p) => p.id),
                        )
                      }
                    >
                      {selected.length ? "Clear" : "Select all"}
                    </button>
                  )}
                </div>
                <div className="source-content">
                  {active.document.passages.map((p, index) => (
                    <article
                      id={`passage-${p.id}`}
                      key={p.id}
                      className={`passage ${highlight === p.id ? "highlighted" : ""} ${focusMode && !selected.includes(p.id) ? "unselected" : ""}`}
                    >
                      <div className="passage-label">
                        {focusMode && (
                          <input
                            type="checkbox"
                            aria-label={`Include passage ${p.id}`}
                            checked={selected.includes(p.id)}
                            disabled={generating}
                            onChange={(e) =>
                              setSelected((ids) =>
                                e.target.checked
                                  ? [...ids, p.id]
                                  : ids.filter((id) => id !== p.id),
                              )
                            }
                          />
                        )}
                        <span>{p.id}</span>
                      </div>
                      <div>
                        {p.heading &&
                          (index === 0 ||
                            p.heading !==
                              active.document.passages[index - 1].heading) && (
                            <h3>{p.heading}</h3>
                          )}
                        <p>{p.text}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section
                className={`ai-panel panel ${mobilePane === "ai" ? "mobile-visible" : ""}`}
              >
                <div className="ai-tabs">
                  <button
                    className={tab === "summary" ? "selected" : ""}
                    onClick={() => setTab("summary")}
                  >
                    <Sparkles size={15} /> Overview
                  </button>
                  <button
                    className={tab === "chat" ? "selected" : ""}
                    onClick={() => setTab("chat")}
                  >
                    <MessageSquare size={15} /> Ask this page
                  </button>
                </div>
                <button
                  className="model-indicator"
                  onClick={() => setSettingsOpen(true)}
                >
                  <span className="tiny-spark">
                    <Sparkles size={12} />
                  </span>
                  {key
                    ? selectedModel?.label || "Choose a model"
                    : "Connect your AI to get started"}
                  <ChevronRight size={13} />
                </button>
                {tab === "summary" ? (
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
                          {key
                            ? "Summarize this page"
                            : "Connect AI to summarize"}
                        </button>
                        <small>
                          Your provider receives this source. API charges apply.
                        </small>
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
                            <button
                              disabled={generating}
                              onClick={() => void run("summary")}
                            >
                              Retry summary
                            </button>
                          </div>
                        )}
                        {!generating &&
                          active.summary.status === "complete" && (
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
                        <span className="section-label">
                          KEEP THE CURIOSITY GOING
                        </span>
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
                ) : (
                  <>
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
                            <Markdown
                              text={m.content}
                              workspace={active}
                              onPassage={showPassage}
                            />
                          )}
                          {m.status === "incomplete" && (
                            <div className="incomplete">
                              <span>Incomplete response</span>
                              {i === active.messages.length - 1 && (
                                <button
                                  disabled={generating}
                                  onClick={() =>
                                    void run(
                                      "chat",
                                      active.messages[i - 1]?.content,
                                      m.id,
                                    )
                                  }
                                >
                                  Retry answer
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      <div ref={chatEnd} />
                    </div>
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
                          disabled={
                            generating || !question.trim() || !models.length
                          }
                        >
                          <ArrowUp size={18} />
                        </button>
                      </div>
                    </form>
                  </>
                )}
                {generating && (
                  <div className="stream-status" role="status">
                    <LoaderCircle size={14} className="spin" />
                    <span>{progress}</span>
                    <button onClick={() => controller.current?.abort()}>
                      <Square size={11} /> Stop
                    </button>
                  </div>
                )}
                <div className="ai-disclaimer">
                  <ShieldCheck size={12} /> AI can make mistakes. Check the
                  source passages.
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      <dialog
        ref={dialog}
        className="settings-dialog"
        onCancel={() => setSettingsOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setSettingsOpen(false);
        }}
        aria-labelledby="settings-title"
      >
        <div className="settings-body">
          <button
            className="dialog-close icon-button"
            aria-label="Close AI settings"
            onClick={() => setSettingsOpen(false)}
          >
            <X size={19} />
          </button>
          <span className="step-icon">
            <KeyRound size={22} />
          </span>
          <div className="eyebrow">YOUR AI, YOUR CHOICE</div>
          <h2 id="settings-title">
            A little intelligence.
            <br />
            <em>On your terms.</em>
          </h2>
          <p>
            Connect your own provider to summarize and chat. The source and your
            questions are sent to that provider. Usage is billed to your API
            account.
          </p>
          <label>
            AI provider
            <select
              value={provider}
              onChange={(e) => changeProvider(e.target.value as Provider)}
              disabled={generating}
            >
              {Object.entries(PROVIDERS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model
            <select
              value={model}
              disabled={generating || !models.length}
              onChange={(e) => {
                setModel(e.target.value);
                savePreferences(provider, e.target.value);
              }}
            >
              {!models.length && (
                <option value="">Start backend to load models</option>
              )}
              {models
                .filter((m) => m.provider === provider)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            API key
            <input
              type="password"
              value={key}
              disabled={generating}
              onChange={(e) => changeKey(e.target.value)}
              placeholder="Paste your provider API key"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="key-note">
            <ShieldCheck size={15} />
            <span>
              Saved in this tab’s session storage, including on refresh. Passed
              securely through our backend for each request; never saved on the
              server.
            </span>
          </div>
          <div className="settings-buttons">
            <button
              className="text-button"
              disabled={generating}
              onClick={forgetKeys}
            >
              Clear all keys
            </button>
            <button className="primary" onClick={() => setSettingsOpen(false)}>
              {key ? "Ready to explore" : "Done"}
              <Check size={15} />
            </button>
          </div>
          <div className="settings-library">
            <div>
              <strong>Your browser library</strong>
              <small>
                {workspaces.length} saved{" "}
                {workspaces.length === 1 ? "page" : "pages"} · no account or
                cloud sync
              </small>
            </div>
            <button
              className="text-button danger"
              disabled={generating || !workspaces.length}
              onClick={() => void removeHistory()}
            >
              Clear history
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
