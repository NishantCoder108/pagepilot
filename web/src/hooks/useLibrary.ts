import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearLibrary,
  deleteWorkspace,
  loadLibrary,
  openLibrary,
  saveWorkspace,
} from "../storage";
import type { Document, Workspace } from "../types";

export function useLibrary(setError: (message: string) => void) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const db = useRef<Awaited<ReturnType<typeof openLibrary>> | null>(null);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const active = workspaces.find((w) => w.document.id === activeId);
  const storageFailure = useCallback(
    () =>
      setStorageNotice(
        "Browser storage is unavailable or full. You can keep reading in this session; export important work before leaving.",
      ),
    [],
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
        if (disposed) return;
        setWorkspaces(saved);
        try {
          const last = sessionStorage.getItem("pagepilot.active");
          if (saved.some((w) => w.document.id === last)) setActiveId(last);
        } catch {
          storageFailure();
        }
      })
      .catch(() => {
        if (!disposed) storageFailure();
      })
      .finally(() => {
        if (!disposed) setReady(true);
      });
    return () => {
      disposed = true;
      connection?.close();
    };
  }, [storageFailure]);

  function selectDocument(id: string | null) {
    setActiveId(id);
    try {
      if (id) sessionStorage.setItem("pagepilot.active", id);
      else sessionStorage.removeItem("pagepilot.active");
    } catch {
      storageFailure();
    }
  }

  function addDocument(document: Document) {
    const workspace: Workspace = {
      document,
      conversation: { id: crypto.randomUUID(), document_id: document.id },
      messages: [],
    };
    setWorkspaces((items) => [workspace, ...items]);
    selectDocument(document.id);
  }

  function update(id: string, change: (workspace: Workspace) => Workspace) {
    setWorkspaces((items) =>
      items.map((w) => (w.document.id === id ? change(w) : w)),
    );
  }

  const persist = useCallback(
    (workspace: Workspace) => {
      saveQueue.current = saveQueue.current
        .then(() => db.current && saveWorkspace(db.current, workspace))
        .catch(storageFailure);
    },
    [storageFailure],
  );

  async function deleteDocument(id: string) {
    await saveQueue.current;
    try {
      if (db.current) await deleteWorkspace(db.current, id);
    } catch {
      storageFailure();
      setError(
        "Deletion failed. Try again or clear this site’s data in browser settings.",
      );
      return false;
    }
    setWorkspaces((items) => items.filter((w) => w.document.id !== id));
    if (activeId === id) selectDocument(null);
    return true;
  }

  async function deleteHistory() {
    await saveQueue.current;
    try {
      if (db.current) await clearLibrary(db.current);
    } catch {
      storageFailure();
      setError("History could not be cleared.");
      return false;
    }
    setWorkspaces([]);
    selectDocument(null);
    return true;
  }

  return {
    workspaces,
    active,
    activeId,
    ready,
    storageNotice,
    setStorageNotice,
    selectDocument,
    addDocument,
    update,
    persist,
    deleteDocument,
    deleteHistory,
  };
}
