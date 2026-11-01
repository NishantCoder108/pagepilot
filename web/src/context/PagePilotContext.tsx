import { createContext, useContext, type ReactNode } from "react";
import { useAppController } from "../hooks/useAppController";

type PagePilotState = ReturnType<typeof useAppController>;
const PagePilotContext = createContext<PagePilotState | null>(null);

export function PagePilotProvider({ children }: { children: ReactNode }) {
  const value = useAppController();
  return (
    <PagePilotContext.Provider value={value}>
      {children}
    </PagePilotContext.Provider>
  );
}

export function usePagePilot() {
  const state = useContext(PagePilotContext);
  if (!state) throw new Error("PagePilot components require PagePilotProvider");
  return state;
}
