import { useState } from "react";
import { useExtraction } from "./useExtraction";
import { useGeneration } from "./useGeneration";
import { useLibrary } from "./useLibrary";
import { useProviderSettings } from "./useProviderSettings";
import { useWorkspacePersistence } from "./useWorkspacePersistence";
import { useWorkspaceView } from "./useWorkspaceView";

export function useAppController() {
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const library = useLibrary(setError);
  const ai = useProviderSettings(library.setStorageNotice);
  const view = useWorkspaceView();
  const input = useExtraction(library.addDocument, view.resetView, setError);
  const generation = useGeneration({
    active: library.active,
    extracting: input.extracting,
    provider: ai.provider,
    model: ai.model,
    key: ai.key,
    selectedModel: ai.selectedModel,
    question: view.question,
    focusMode: view.focusMode,
    selected: view.selected,
    update: library.update,
    setError,
    openSettings: () => setSettingsOpen(true),
    onStart: (mode) => {
      view.setMobilePane("ai");
      if (mode === "chat") view.setQuestion("");
    },
  });
  useWorkspacePersistence(
    library.active,
    library.ready,
    generation.generating,
    library.persist,
  );
  const busy = generation.generating || input.extracting;

  function activate(id: string | null) {
    if (busy) return;
    library.selectDocument(id);
    view.resetView();
    setError("");
  }

  function readPage(sample = false) {
    if (!busy) return input.extractPage(sample);
  }

  async function removeDocument(id: string) {
    if (
      busy ||
      !window.confirm(
        "Delete this page, summary, and conversation from this browser?",
      )
    )
      return;
    if (await library.deleteDocument(id)) {
      if (library.activeId === id) {
        view.resetView();
        setError("");
      }
    }
  }

  async function removeHistory() {
    if (
      busy ||
      !window.confirm(
        "Delete all saved pages and conversations from this browser?",
      )
    )
      return;
    if (await library.deleteHistory()) {
      view.resetView();
      setError("");
      setSettingsOpen(false);
    }
  }

  function newChat() {
    if (
      !library.active ||
      generation.generating ||
      !window.confirm(
        "Clear this page’s conversation and start a new chat? Your source and summary will remain.",
      )
    )
      return;
    library.update(library.active.document.id, (workspace) => ({
      ...workspace,
      messages: [],
    }));
    setError("");
  }

  const wordCount =
    library.active?.document.passages.reduce(
      (sum, passage) => sum + passage.text.split(/\s+/).length,
      0,
    ) || 0;

  return {
    ...library,
    ...ai,
    ...input,
    ...view,
    ...generation,
    error,
    setError,
    settingsOpen,
    setSettingsOpen,
    busy,
    wordCount,
    activate,
    readPage,
    removeDocument,
    removeHistory,
    newChat,
  };
}
