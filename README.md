# PagePilot

A calm place to turn a public web page into understanding: extract readable text, generate a cited summary, and ask source-grounded questions with your own OpenAI, Anthropic, or Gemini API key.

Rust + Axum + Tokio backend. React + TypeScript + Vite frontend. No accounts or server database. Documents and chats live in IndexedDB; keys live in the current tab's sessionStorage and pass through the backend for individual provider requests. No simulated AI or bundled provider keys.

## Run locally

Prerequisites: current stable Rust (tested with 1.97.1), Node 24+ and npm. Start from the repository root:

```sh
cd web
npm ci
npm run build
cd ..
cargo run
```

Open [PagePilot](http://127.0.0.1:3000). Try the sample article without a key. Connect AI when ready to generate; API billing is separate from a consumer chat subscription.

For frontend development, keep `cargo run` in one terminal, then run `cd web && npm run dev` in another. Vite prints its local URL and proxies API requests to Rust. Restart Rust after backend changes; Vite updates the UI automatically. Rebuild the web bundle to update the version served directly by Rust.

## Learn the implementation

Read these in order:

1. [Product and user journey](docs/01-product.md)
2. [Browser schema and API contracts](docs/02-data-api.md)
3. [Fourteen small milestones and manual checks](docs/03-milestones.md)
4. [Deployment, limits, and operations](docs/04-operations.md)
5. [Code structure and file-size convention](docs/06-code-structure.md)
6. [Small milestone commits and Git workflow](docs/07-commit-workflow.md)

Backend: `server/src/main.rs` only starts the process. `http/` owns routes, handlers, rate limits, and middleware; `extract/` normalizes sources; `fetch/` owns safe downloading; `providers/` separates context preparation, provider requests, parsing, and streaming. `types.rs` defines contracts/model catalog; `config.rs` owns shared resources and runtime limits.

Frontend: `web/src/App.tsx` composes the provider and application shell. `components/` contains layout, home, workspace, and settings UI; `hooks/` owns state and behavior; `generation/` owns generation state transitions; `styles/` separates CSS by UI responsibility. `storage.ts` owns browser persistence; `api.ts` owns HTTP and stream decoding.

Handwritten source/config files have a maximum of **200 lines**, including comments and blanks. `node scripts/check-file-size.mjs` checks the frontend, backend, tests, styles, and scripts; `npm run build` runs it automatically. Generated lockfiles and build/dependency directories are excluded. Keep modules focused rather than compressing code to fit the limit.

## Checks

```sh
cargo test --locked
cargo clippy --all-targets -- -D warnings
cargo fmt --all --check
cd web
npm test
npm run build
```

With the server running, `python3 scripts/smoke.py` performs keyless HTTP checks. Add `--external-url https://tokio.rs/tokio/tutorial` to exercise a public page, or `--requests 20 --concurrency 4` for a bounded local load probe. Public websites may block automated access; pasted text remains available.

Real model generation requires your own key. Automated tests mock provider streams and never make paid requests. There is no automatic generation retry. Stop/disconnect drops the upstream request; a provider may still bill work already performed.

For manual streaming checks without a paid key, run `python3 scripts/ui_fixture.py` alongside Rust and open [the isolated test fixture](http://127.0.0.1:3001). Use only the literal `pagepilot-fixture-key`. Output is clearly labeled test content. Questions containing `slow`, `interrupt`, or `error` exercise cancellation, unexpected EOF, and error states. This separate local test server never calls a model provider and is not part of the production container.

## Container

```sh
docker compose up --build
```

Open [the local container](http://127.0.0.1:3000). Compose binds only to loopback; put a TLS reverse proxy in front for public hosting. See the operations guide before exposing the service. The included configuration is a starting point, not a verified capacity guarantee.

## Boundaries

One public UTF-8 HTML page or pasted document per conversation. No JavaScript rendering, PDFs, paywall bypass, accounts, sync, embeddings, or crawling. Unsupported extraction offers paste fallback. Full source context is used within a conservative byte budget; select fewer passages or paste shorter text when over budget. Nothing is silently truncated.

Browser data can be cleared by the user/browser. Export Markdown for a portable copy. sessionStorage is readable by JavaScript and may be restored by browser session recovery; use Clear all keys when finished. The backend never persists keys/content, but the chosen provider processes submitted content under its own policies.
