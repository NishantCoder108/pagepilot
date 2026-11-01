import { useState } from "react";

export function useWorkspaceView() {
  const [tab, setTab] = useState<"summary" | "chat">("summary");
  const [mobilePane, setMobilePane] = useState<"ai" | "source">("ai");
  const [question, setQuestion] = useState("");
  const [highlight, setHighlight] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  function resetView() {
    setTab("summary");
    setMobilePane("ai");
    setQuestion("");
    setSelected([]);
    setFocusMode(false);
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

  return {
    tab,
    setTab,
    mobilePane,
    setMobilePane,
    question,
    setQuestion,
    highlight,
    focusMode,
    setFocusMode,
    selected,
    setSelected,
    resetView,
    showPassage,
  };
}
