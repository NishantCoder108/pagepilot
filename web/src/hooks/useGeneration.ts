import { useEffect, useRef, useState } from "react";
import { ApiError, generate } from "../api";
import {
  applyEvent,
  beginAttempt,
  createAttempt,
  interruptAttempt,
  type GenerationMode,
} from "../generation/state";
import type { Model, Provider, Workspace } from "../types";

interface Options {
  active: Workspace | undefined;
  extracting: boolean;
  provider: Provider;
  model: string;
  key: string;
  selectedModel: Model | undefined;
  question: string;
  focusMode: boolean;
  selected: string[];
  update: (id: string, change: (workspace: Workspace) => Workspace) => void;
  setError: (message: string) => void;
  openSettings: () => void;
  onStart: (mode: GenerationMode) => void;
}

export function useGeneration(options: Options) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function run(
    mode: GenerationMode,
    suppliedQuestion?: string,
    retryId?: string,
  ) {
    const {
      active,
      extracting,
      provider,
      model,
      key,
      selectedModel,
      question,
      focusMode,
      selected,
      update,
      setError,
    } = options;
    if (!active || generating || extracting) return;
    if (!key) {
      options.openSettings();
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
    const attempt = createAttempt(active, mode, ask, provider, model, retryId);
    const documentId = active.document.id;
    const abort = new AbortController();
    controller.current = abort;
    setError("");
    setGenerating(true);
    setProgress("Connecting to your provider…");
    update(documentId, (workspace) => beginAttempt(workspace, attempt));
    options.onStart(mode);
    try {
      await generate(
        {
          mode,
          provider,
          model,
          document: active.document,
          history: mode === "summary" ? [] : attempt.history,
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
          update(documentId, (workspace) =>
            applyEvent(workspace, attempt, event),
          );
        },
      );
    } catch (error) {
      setError(
        abort.signal.aborted
          ? "Generation stopped. Partial output is saved. Retrying starts a new paid request."
          : error instanceof Error
            ? error.message +
              (error instanceof ApiError && error.requestId
                ? ` (Request ${error.requestId.slice(0, 8)})`
                : "")
            : "Generation failed.",
      );
      update(documentId, (workspace) => interruptAttempt(workspace, attempt));
    } finally {
      setGenerating(false);
      setProgress("");
      controller.current = null;
    }
  }

  return { generating, progress, run, stop: () => controller.current?.abort() };
}
