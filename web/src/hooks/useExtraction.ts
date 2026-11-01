import { useState } from "react";
import { extract } from "../api";
import { SAMPLE } from "../content";
import type { Document } from "../types";

export function useExtraction(
  addDocument: (document: Document) => void,
  resetView: () => void,
  setError: (message: string) => void,
) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [extracting, setExtracting] = useState(false);

  async function extractPage(sample = false) {
    if (extracting) return;
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
      addDocument(document);
      resetView();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not read this page.",
      );
    } finally {
      setExtracting(false);
    }
  }

  return {
    url,
    setUrl,
    text,
    setText,
    title,
    setTitle,
    inputMode,
    setInputMode,
    extracting,
    extractPage,
  };
}
