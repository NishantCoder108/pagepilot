import { useEffect, useRef } from "react";
import type { Workspace } from "../types";

export function useWorkspacePersistence(
  active: Workspace | undefined,
  ready: boolean,
  generating: boolean,
  persist: (workspace: Workspace) => void,
) {
  const latest = useRef(active);
  useEffect(() => {
    latest.current = active;
    if (ready && active && !generating) persist(active);
  }, [active, ready, generating, persist]);

  useEffect(() => {
    if (!ready || !generating) return;
    // Periodic snapshots preserve partial output during a continuous stream.
    const snapshot = () => {
      if (latest.current) persist(latest.current);
    };
    snapshot();
    const timer = window.setInterval(snapshot, 350);
    return () => window.clearInterval(timer);
  }, [ready, generating, persist]);
}
