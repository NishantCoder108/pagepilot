import { ArrowRight, CircleHelp, ShieldCheck } from "lucide-react";
import { usePagePilot } from "../../context/PagePilotContext";
import ReadingInput from "./ReadingInput";
import Workflow from "./Workflow";
import RecentPages from "./RecentPages";

export default function HomePage() {
  const { workspaces, ready, error, setInputMode, extracting, readPage } =
    usePagePilot();

  return (
    <div className="home">
      <div className="home-intro">
        <div className="eyebrow">
          <span /> A CLEARER WAY TO EXPLORE THE WEB
        </div>
        <h1>
          Less scrolling.
          <br />
          More <em>understanding.</em>
        </h1>
        <p>
          Turn any article into a little more clarity.
          <br className="desktop-break" /> Read the essentials, ask questions,
          and follow your curiosity.
        </p>
      </div>
      <ReadingInput />
      {error && (
        <div className="notice error" role="alert">
          <CircleHelp size={17} />
          <span>{error}</span>
          <button className="text-button" onClick={() => setInputMode("text")}>
            Paste text instead
          </button>
        </div>
      )}
      <button
        className="sample-link"
        disabled={!ready || extracting}
        onClick={() => void readPage(true)}
      >
        Just looking around?{" "}
        <span>
          Try a sample article <ArrowRight size={13} />
        </span>
      </button>
      <Workflow />
      {workspaces.length > 0 && <RecentPages />}
      <footer className="home-footer">
        <span>
          <ShieldCheck size={13} /> Browser-local history
        </span>
        <i /> <span>Your key, your choice</span>
        <i />
        <span>No folders to organize</span>
      </footer>
    </div>
  );
}
