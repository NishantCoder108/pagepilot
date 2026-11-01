# 03 · Fourteen small milestones

Follow these checkpoints to learn the build. The completed source is present; use the paths below to inspect one layer at a time. Suggested commit messages are learning checkpoints, not claims that commits were created. This workspace began without a Git repository.

For each step: understand the concept, inspect its boundary, run it, verify the result, then checkpoint before changing the next layer. See `05-verification.md` for checks actually performed and remaining external checks.

## 1. Product blueprint

- **Learn:** translate a broad idea into observable user behavior.
- **Choice/change:** a no-account, one-page reading workspace with explicit paid AI actions. Read `01-product.md`.
- **Run/check:** walk through URL success, extraction failure, invalid key, interruption, refresh, export, and deletion. Each has a defined outcome.
- **Checkpoint:** `docs: define product journey and launch boundaries`.

## 2. Schema and API contracts

- **Learn:** separate durable browser records, temporary secrets, and server requests.
- **Choice/change:** versioned IndexedDB stores and a provider-neutral POST/SSE contract. Read `02-data-api.md` alongside `types.rs` and `web/src/types.ts`.
- **Run/check:** trace a document ID through source → conversation → messages/summary → cascade deletion. Keys must have no path into these records.
- **Checkpoint:** `docs: define browser schema and API contracts`.

## 3. Project skeleton

- **Learn:** a request travels through Axum routing, state, and a response.
- **Choice/change:** one backend process serves the production frontend; Vite proxies during development.
- **Run:** follow README startup, then `curl http://127.0.0.1:3000/health`.
- **Check:** health returns `ok`; homepage shows All systems ready. Stop the backend and refresh Vite to see offline handling.
- **Checkpoint:** `feat: connect React shell to Axum health endpoint`.

## 4. Pasted-text reader

- **Learn:** normalize input before connecting expensive dependencies.
- **Choice/change:** pure text-to-passage function; Markdown headings label subsequent paragraphs.
- **Run/check:** click Try a sample article, or paste text with two `#` headings and blank lines. Verify ordered source passages and readable headings without an API key.
- **Checkpoint:** `feat: normalize pasted documents into a source reader`.

## 5. Safe URL extraction

- **Learn:** user-supplied URLs cross a server security boundary.
- **Choice/change:** DNS validation and connection pinning on every redirect, no proxy inheritance, bounded downloads, and bounded blocking HTML parsing.
- **Run:** `cargo test fetch` and `cargo test extract`.
- **Check:** read a public article; localhost/private-IP URLs must fail. A PDF or blocked page must offer paste fallback. Fixture tests exercise article/documentation extraction without network access.
- **Checkpoint:** `feat: add bounded public-page extraction`.

## 6. Local history

- **Learn:** transactions keep related records consistent; schema versions provide a migration boundary.
- **Choice/change:** documents/conversations/messages/summaries use explicit storage projections and transactionally save/delete.
- **Run:** `cd web && npm test`.
- **Check:** extract, refresh, open recent history, and delete a disposable page. Reopen and verify it stays deleted. Browser DevTools → Application → IndexedDB shows four stores and no credentials.
- **Checkpoint:** `feat: persist reading workspaces in IndexedDB`.

## 7. Provider setup and session keys

- **Learn:** choose a secret lifetime independently from document lifetime.
- **Choice/change:** keys use sessionStorage per provider, with an in-memory fallback and visible notice if storage fails.
- **Run/check:** enter a disposable placeholder key, refresh, verify the masked key remains, switch providers, and Clear all keys. Do not use generation with a placeholder except to check safe error handling. Inspect IndexedDB to confirm no key was saved.
- **Checkpoint:** `feat: add provider selection and session-scoped credentials`.

## 8. OpenAI streaming summary

- **Learn:** streamed responses require framing, incremental UTF-8 decoding, and terminal events.
- **Choice/change:** OpenAI request format stays behind an adapter; the UI consumes provider-neutral events.
- **Run/check:** connect your own billed API key, generate a sample summary, check source links, stop, and explicitly retry. Separately test a fabricated key for an actionable error. Real generation incurs provider charges.
- **Checkpoint:** `feat: stream cited OpenAI summaries`.

## 9. Grounded chat

- **Learn:** model context combines evidence, instructions, and conversational history.
- **Choice/change:** send selected/full source and complete chat turns; incomplete assistant output is excluded from later context. Citation IDs must exist; this does not prove the model's interpretation.
- **Run/check:** ask “What does the page say about focused reading?” then an unrelated question. Open a citation and verify its passage. Ask a follow-up that refers to the prior answer.
- **Checkpoint:** `feat: add source-grounded conversations`.

## 10. Interruption and context limits

- **Learn:** incomplete data is a real state; retries can have financial effects.
- **Choice/change:** preserve partial output, never reconnect automatically, reject oversized context instead of truncating. Passage focus reduces context.
- **Run/check:** stop or refresh mid-generation. Verify incomplete status after reload. Use a long pasted source to trigger the budget error; focus on fewer passages and retry. New chat clears history after confirmation.
- **Checkpoint:** `feat: handle interruption and explicit context selection`.

## 11. Anthropic

- **Learn:** an adapter isolates differences in authentication, message format, and stop reasons.
- **Choice/change:** Anthropic text deltas and message-stop signals normalize to the existing UI contract.
- **Run/check:** select Anthropic, enter your own key, repeat summary/chat/citation/stop/invalid-key checks. Confirm OpenAI's session key remains separate.
- **Checkpoint:** `feat: add Anthropic streaming adapter`.

## 12. Gemini

- **Learn:** shared abstractions still need provider-specific semantics.
- **Choice/change:** use Gemini contents/parts, header authentication, finish reasons, and bounded thinking configuration. Thought parts are not displayed.
- **Run/check:** repeat the provider checks with Gemini. Select each listed model; access and retirement errors should be actionable. Model availability depends on your API account.
- **Checkpoint:** `feat: add Gemini streaming adapter`.

## 13. Usability and portability

- **Learn:** responsive navigation, recovery, and portability are part of the feature.
- **Choice/change:** desktop source/AI panes become mobile tabs; Markdown export includes source passages and no credentials.
- **Run/check:** at 390px width, extract, switch tabs, ask a question, follow a citation, return home, and reopen history. Export and inspect Markdown. Disable site storage in a disposable browser profile to exercise the in-memory fallback notice.
- **Checkpoint:** `feat: finish responsive reading and export flows`.

## 14. Container and beta operations

- **Learn:** runtime limits, observability, TLS, and deployment verification are separate from compiling code.
- **Choice/change:** one non-root, read-only container; bounded fetch/parse/generation workloads; metadata-only logs; socket-peer rate limits.
- **Run:** `docker compose up --build`, `python3 scripts/smoke.py`, then the optional bounded load probe from README.
- **Check:** verify health, safe rejection, no sensitive logs, TLS proxy streaming, restart behavior, and memory/latency under the actual target workload. Delayed/mock streams test resource behavior without spending on providers.
- **Checkpoint:** `ops: package bounded single-container beta`.

Only label a public release deployed after its actual host and HTTPS URL have been verified. Paid provider checks and deployment measurements cannot be inferred from unit tests.
