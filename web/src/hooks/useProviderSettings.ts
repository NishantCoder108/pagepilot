import { useEffect, useRef, useState } from "react";
import { fetchModels } from "../api";
import { apiUrl } from "../config";
import { PROVIDERS } from "../content";
import { clearKeys, readKey, writeKey } from "../storage";
import type { Model, Provider } from "../types";

export function useProviderSettings(notify: (message: string) => void) {
  const [models, setModels] = useState<Model[]>([]);
  const [backend, setBackend] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState("");
  const [key, setKey] = useState("");
  const keys = useRef<Partial<Record<Provider, string>>>({});
  const selectedModel = models.find(
    (m) => m.id === model && m.provider === provider,
  );

  useEffect(() => {
    let disposed = false;
    for (const p of Object.keys(PROVIDERS) as Provider[]) {
      try {
        keys.current[p] = readKey(p);
      } catch {
        notify(
          "Session storage is unavailable. Keys will work until you refresh.",
        );
      }
    }
    setKey(keys.current.openai || "");
    void Promise.all([
      fetch(apiUrl("/health"), { credentials: "omit" }).then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
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
          /* Invalid preferences use the first supported model. */
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
    };
  }, [notify]);

  function savePreferences(p: Provider, m: string) {
    try {
      sessionStorage.setItem(
        "pagepilot.preferences",
        JSON.stringify({ provider: p, model: m }),
      );
    } catch {
      notify(
        "Browser storage is unavailable. Preferences will reset on refresh.",
      );
    }
  }

  function changeProvider(value: Provider) {
    setProvider(value);
    setKey(keys.current[value] || "");
    const next = models.find((m) => m.provider === value)?.id || "";
    setModel(next);
    savePreferences(value, next);
  }

  function changeKey(value: string) {
    const clean = value.trim();
    setKey(clean);
    keys.current[provider] = clean;
    try {
      writeKey(provider, clean);
    } catch {
      notify(
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
      notify(
        "The browser could not clear session storage. Clear this site’s data in browser settings.",
      );
    }
  }

  return {
    models,
    backend,
    provider,
    model,
    setModel,
    key,
    selectedModel,
    savePreferences,
    changeProvider,
    changeKey,
    forgetKeys,
  };
}
