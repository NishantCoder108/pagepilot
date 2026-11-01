import AppShell from "./components/AppShell";
import { PagePilotProvider } from "./context/PagePilotContext";

export default function App() {
  return (
    <PagePilotProvider>
      <AppShell />
    </PagePilotProvider>
  );
}
