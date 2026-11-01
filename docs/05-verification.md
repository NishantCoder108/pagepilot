# 05 · Verification record

## November 1, 2026: module refactor

- Split React rendering into layout/home/workspace/settings components, behavior into hooks, and generation state changes into pure helpers.
- Split Rust startup, HTTP handling, safe fetching, extraction, and provider orchestration into focused modules; moved tests into separate files.
- All 113 checked handwritten source/config files are at most 200 lines, including comments and blank lines. Generated lockfiles and dependency/build directories are excluded. The production frontend build enforces the limit.
- `cargo test --locked`: 14 passed; frontend `npm test`: 16 passed. Added lifecycle checks for completion, interruption/retry, summary isolation, and a home-navigation regression check.
- TypeScript now rejects unused locals/parameters. Production build, Rust Clippy with warnings denied, Rust formatting, keyless HTTP smoke checks, and Compose configuration validation passed.
- Browser fixture checks passed for extraction, provider settings, streamed summaries/chat, citation highlighting, retry/stop, and partial-stream recovery after refresh. The final CSS bundle is unchanged from before the refactor.
- Paid-provider and public-deployment verification limits below still apply.

## Original implementation checks

Verified locally on October 30, 2026, using Rust 1.97.1 and Node 26.10.0. This is an implementation/checkpoint record, not a claim of public deployment.

## Automated checks completed

- `cargo test --locked`: 14 tests passed. Covers article/documentation fixtures, empty/oversized/fragmented input, unsafe URLs and redirect destinations, internal/special IPv4/IPv6 ranges, normalized errors, rate limiting, slow request-body timeout, request capacity, context selection/budgets, citation ID filtering, provider stream parsing, credential redaction, fixed provider endpoints/header-only keys, slow-consumer deadlines, and cancellation releasing capacity.
- `cargo clippy --all-targets -- -D warnings`: passed.
- `cargo fmt --all --check`: passed.
- `cd web && npm test`: 12 tests passed. Covers browser schema initialization/reopening, transactional cascade deletion/isolation, chat reset, stream recovery, disabled storage rejection, credential exclusion from durable records/export, session key clearing, SSE framing/UTF-8, terminal-event requirements, normalized stream errors, and cancellation without retries.
- `cd web && npm run build`: TypeScript and production bundle passed.
- Dependency installation audit: zero reported advisories after updating build/test tooling. This is not an exhaustive dependency security audit.
- Python fixture/smoke scripts parse successfully.
- `docker compose config --quiet`: passed.

## HTTP checks completed

- Health, model catalog, pasted-text extraction, passage ordering, request IDs, unsafe URL rejection, and missing-key errors.
- Public extraction from `https://tokio.rs/tokio/tutorial`: 20 readable passages.
- A bounded probe of 20 keyless text-extraction requests at concurrency 4: all returned HTTP 200. Observed local p50 approximately 1.18 ms, p95 approximately 2.02 ms. These figures are a small local check, not network/model throughput or a production capacity target.
- The live OpenAI endpoint returned the expected safe authentication error for a fabricated key. No valid provider key or paid generation was used.

## Browser checks completed

- Sample extraction without credentials and real public URL → source reader flow.
- IndexedDB history and active-page restoration after refresh.
- Session-storage placeholder key survives refresh; Clear all keys removes the active key. Provider/model switching works with the final catalog.
- The separate local-only `scripts/ui_fixture.py` exercised completed streamed summaries/chat, source citation highlighting, unknown citation staying plain text, and suppression of raw script HTML and remote images.
- Stop preserves incomplete output. Refresh during a continuous slow fixture stream restores partial output as incomplete. Periodic snapshots occur every 350 ms; a small tail may be lost on abrupt tab/process termination.
- Responsive workspace at 390 × 844, including source/AI tabs and citation navigation. Temporary viewport override reset afterward.

## Not yet verified externally

- Successful paid summary/chat requests with real OpenAI, Anthropic, and Gemini keys, including model access, billing/quota, and provider-specific behavior. Adapter contracts and mock streams are tested; they do not substitute for these account-dependent checks.
- Docker image build/run: Docker CLI is installed, but its daemon is stopped. Compose syntax validation does not verify image compilation or Linux runtime behavior.
- Public deployment: no hosting target, domain, or TLS reverse proxy is configured. Proxy buffering, trusted edge rate limits, production egress restrictions, and deployment resource sizing must be checked on the chosen host.
- Storage quota exhaustion through a real browser policy and full browser UI export/delete flows. Storage failure handling, export content, and cascade deletion have automated coverage.

## Reproduce streaming UI checks without paying

Build the frontend and start Rust using README instructions. Run `python3 scripts/ui_fixture.py` and open `http://127.0.0.1:3001`. This separate origin has its own disposable browser library. Use only `pagepilot-fixture-key`, never a real credential. Every generated answer is explicitly marked as a local test fixture. Questions containing `slow`, `interrupt`, or `error` exercise the corresponding states. The fixture never forwards generation requests or keys to a provider and is excluded from the production container.
