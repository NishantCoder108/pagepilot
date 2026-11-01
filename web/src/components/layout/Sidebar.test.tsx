import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import Sidebar from "./Sidebar";

vi.mock("../../context/PagePilotContext", () => ({
  usePagePilot: () => ({
    workspaces: [],
    activeId: null,
    busy: false,
    setSettingsOpen: vi.fn(),
    activate: vi.fn(),
  }),
}));

it("keeps navigation and the empty library visible before a page is selected", () => {
  const html = renderToStaticMarkup(<Sidebar />);
  expect(html).toContain('aria-label="PagePilot home"');
  expect(html).toContain("New page");
  expect(html).toContain("Pages you read will appear here.");
});
