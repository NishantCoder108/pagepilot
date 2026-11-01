# Code structure

Every handwritten source/config file must stay at or below 200 lines, counting comments and blank lines. The goal is a clear responsibility per file. Do not remove useful formatting or combine statements merely to satisfy the limit. Generated dependency lockfiles, dependencies, and build output are exempt.

Run `node scripts/check-file-size.mjs` from the repository root, or `npm run check:files` from `web/`. The production frontend build runs this check automatically. Rust formatting and TypeScript unused-code checks remain enabled.

## Frontend

- `App.tsx`: composes the shared context provider and application shell.
- `context/PagePilotContext.tsx`: typed access to the application controller for domain-specific components. Secrets remain in the provider settings hook and the UI context that needs them; persistence projections still exclude credentials.
- `hooks/useAppController.ts`: connects domain hooks and user actions. It does not render UI or implement provider protocols.
- `hooks/useLibrary.ts`: library loading, active document, queued persistence, deletion, and storage notices.
- `hooks/useWorkspacePersistence.ts`: completed-work saves and periodic partial-stream snapshots.
- `hooks/useProviderSettings.ts`: provider/model selection, backend availability, and session keys.
- `hooks/useExtraction.ts`: URL/pasted-text form state and extraction requests.
- `hooks/useGeneration.ts`: request lifecycle, progress, cancellation, and failures.
- `hooks/useWorkspaceView.ts`: tabs, passage selection/highlighting, and question input.
- `generation/state.ts`: pure message/summary transitions for streaming, interruption, and retry. IDs are created before React state updates so repeated updater calls remain safe.
- `components/layout/`: sidebar and topbar.
- `components/home/`: home screen, reading input, workflow explanation, and recent pages.
- `components/workspace/`: workspace header, source reader, AI panel, summary, individual messages, message list, and composer.
- `components/settings/`: AI settings dialog.
- `components/shared/Markdown.tsx`: safe Markdown and source citation rendering.
- `styles/`: CSS by UI area and responsive breakpoint. `styles.css` imports them in the original cascade order.
- `content.ts` and `utils/`: shared text and small display helpers.
- `api.ts`, `storage.ts`, `export.ts`, `types.ts`: HTTP contracts, persistence, Markdown export, and domain data shapes.

Presentation components use the typed context for application actions. Markdown and individual chat messages have explicit props. Avoid adding fetches or storage writes to presentation components; those belong in hooks/services.

## Backend

- `main.rs`: logging, shared state construction, TCP listener, and graceful shutdown.
- `config.rs`: environment configuration and shared runtime resources.
- `types.rs`: domain and request/response types plus maintained model catalog.
- `error.rs`: safe, consistent HTTP errors.
- `http/routes.rs`: path/method routing and frontend static serving.
- `http/handlers.rs`: HTTP input decoding and calls into domain modules.
- `http/safeguards.rs`: request timeout/capacity, security headers, and metadata logging.
- `http/rate_limit.rs`: bounded per-peer request counters.
- `fetch/safety.rs`: URL and public-address validation.
- `fetch/mod.rs`: DNS-pinned downloading, redirect handling, content/size/time limits.
- `extract/mod.rs`: coordinates input choice and fetch/parse permits.
- `extract/text.rs`: normalized document/passages from text.
- `extract/html.rs`: readability extraction and HTML-to-text processing.
- `providers/context.rs`: evidence validation, conversation formatting, and input budgets.
- `providers/credentials.rs`: sensitive-header credential validation.
- `providers/requests.rs`: fixed provider endpoints and provider-specific payloads.
- `providers/sse.rs`: byte-level upstream SSE framing.
- `providers/parser.rs`: provider-specific delta/terminal-event normalization.
- `providers/citations.rs`: citation ID filtering.
- `providers/errors.rs`: safe provider error categories.
- `providers/events.rs`: downstream events and generation metadata logging.
- `providers/generation.rs`: coordinates one generation request.
- `providers/relay.rs`: bounded forwarding, deadline, and disconnect cancellation.

Tests live beside the behavior they cover in separate test modules. Implementation details stay module-private or parent-visible; only the module's entry points are exposed to its callers.

## Suggested reading order

1. `server/src/main.rs`: how the process starts.
2. `server/src/http/routes.rs`, then `handlers.rs`: how HTTP reaches domain logic.
3. `server/src/extract/mod.rs`, then `fetch/safety.rs`, `fetch/mod.rs`, `extract/html.rs`, and `extract/text.rs`: how a URL becomes passages.
4. `web/src/App.tsx`, then `context/PagePilotContext.tsx` and `hooks/useAppController.ts`: how React composes the journey.
5. `components/home/ReadingInput.tsx`, then `hooks/useExtraction.ts` and `api.ts`: how the form sends a URL.
6. `components/workspace/SourceReader.tsx` and the library/persistence hooks: how returned passages render and survive refresh.

The API payloads, local storage schema, session-key lifetime, and UI layout are preserved by this refactor.
