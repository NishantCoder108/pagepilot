import { useEffect, useRef } from "react";
import { Check, KeyRound, ShieldCheck, X } from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";
import type { Provider } from "../../types";
import { PROVIDERS } from "../../content";

export default function SettingsDialog() {
  const {
    workspaces,
    models,
    provider,
    model,
    setModel,
    key,
    settingsOpen,
    setSettingsOpen,
    generating,
    changeProvider,
    savePreferences,
    changeKey,
    forgetKeys,
    removeHistory,
  } = usePagePilot();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (settingsOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [settingsOpen]);

  return (
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
              {workspaces.length === 1 ? "page" : "pages"} · no account or cloud
              sync
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
  );
}
