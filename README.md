# PagePilot

Read a page. Understand the essentials. Ask better questions.

PagePilot turns public articles and documentation into a readable source, an AI summary, and a conversation grounded in the page. Bring your own OpenAI, Anthropic, or Gemini API key. Your reading history stays in your browser.


> **Live App:** [PagePilot Live](https://pagepilot-rust.vercel.app/)


https://github.com/user-attachments/assets/932cfbc2-e1ea-45b5-8cef-2574e3eb96ca


## What you can do

- Extract the readable content of a public web page, or paste text directly.
- Read the source before connecting an AI provider.
- Generate a summary and ask follow-up questions with streamed responses.
- Open passage citations to check the source behind an answer.
- Select specific passages when you want a narrower context.
- Revisit saved pages and conversations without creating an account.
- Export a page, summary, and conversation as Markdown.
- Stop generation, retry an interrupted response, or clear your keys and history.

## Quick start

Install a current stable Rust toolchain and Node.js 24 or newer. From the repository root:

```sh
cd web
npm ci
npm run build
cd ..
cargo run --locked
```

Open [localhost:3000](http://127.0.0.1:3000). Try the sample article without a key, then use **Connect AI** to choose a provider and model. Generation requires an API key with access and billing for that provider; a consumer chat subscription may not include API usage.

For frontend development, keep the Rust server running and start Vite in a second terminal:

```sh
cd web
npm run dev
```

Open the URL printed by Vite. It forwards API requests to the Rust server. Vite updates the frontend during development; restart Rust after backend changes.

## How it works

The React frontend sends a URL to the Axum API. The backend validates the destination, downloads bounded HTML, and extracts readable passages in a separate parsing worker. Summaries and questions are separate requests: the backend sends the selected source and conversation context to the chosen provider and streams its response to the browser.

- **Frontend:** React, TypeScript, and Vite.
- **Backend:** Rust, Axum, Tokio, and reqwest.
- **Extraction:** readability processing with `dom_smoothie`.
- **Persistence:** IndexedDB for reading history; sessionStorage for provider keys.
- **Deployment:** Vercel frontend with a Docker backend on Render or Hugging Face Spaces, or a combined Docker service for local/self-hosted use.

There is no server database or account system. [Explore the code structure](docs/06-code-structure.md) or read the [API and browser data contracts](docs/02-data-api.md).

## Configuration and concurrency

Backend defaults are documented in [.env.example](.env.example). Rust reads exported environment variables; it does not automatically load that file. For separate hosting, [web/.env.example](web/.env.example) documents the frontend API origin, and `ALLOWED_ORIGINS` controls trusted frontend origins on the backend.

```sh
FETCH_CONCURRENCY=8 GENERATION_CONCURRENCY=8 cargo run --locked
```

Each server instance has separate limits: 64 requests reading input/preparing responses, 16 URL extraction jobs, 2 HTML parsing workers, and 16 generation streams. A full stage returns a busy response instead of growing an unlimited queue. These are workload limits, not a promise of how many users a host can support.

The 30-POSTs-per-minute rate limit is separate and uses the immediate connection's IP address. Visitors behind a reverse proxy can share that quota; configure trusted client limits at the edge before public deployment. See [operations](docs/04-operations.md) for timeouts, body limits, proxy settings, and scaling considerations.

## Privacy and source accuracy

- Keys stay in the tab's sessionStorage across refreshes. Use **Clear all keys** when finished; browser session recovery may restore tab storage.
- The backend receives credentials transiently for provider requests. Application code does not persist or log keys, source text, or conversations.
- The selected provider receives the submitted source and conversation context under its own data policies.
- Browser history is local to that browser and origin. It is not encrypted or synchronized by PagePilot; clearing site data removes it. Export anything you want to keep.
- Page content is treated as untrusted input. Internal destinations are blocked, and source/model output is rendered without executing page scripts or model-supplied HTML.

Citations link to existing passages; they do not guarantee that an answer is correct. Check important claims against the source. Production hosting must use HTTPS and avoid logging request bodies or sensitive headers.

## Run with Docker

For a Vercel frontend with a separate Docker backend, follow the [split deployment guide](docs/08-split-deployment.md). Set the API address using `VITE_API_BASE_URL`. The static `vercel.json` security policy allows the current Render backend; update that allowlist too when changing hosts, then redeploy.

```sh
docker compose up --build
```

Open [localhost:3000](http://127.0.0.1:3000). Compose binds the port to loopback and runs the application as a non-root user with a read-only filesystem. Public hosting needs HTTPS, streaming-compatible proxy settings, and resource limits appropriate to the host. Read the [deployment notes](docs/04-operations.md) before exposing it.

## Development checks

```sh
cargo test --locked
cargo fmt --all --check
cargo clippy --all-targets -- -D warnings
cd web
npm test
npm run build
```

The frontend build also checks that handwritten source/config files stay within 200 lines. Generated dependency lockfiles and build output are excluded.

With the server running, `python3 scripts/smoke.py` checks extraction and HTTP behavior without a provider key. For deterministic streaming UI checks, use the [local test fixture](docs/05-verification.md#reproduce-streaming-ui-checks-without-paying). Automated provider tests use mocked streams and make no paid requests.

## Current scope

One public UTF-8 HTML page or pasted document per conversation. JavaScript-rendered pages, PDFs, authenticated pages, paywall bypass, multi-page research, accounts, and cross-device sync are outside the current scope. Failed extraction offers a pasted-text fallback. Oversized model context requires a smaller passage selection rather than silent truncation.

Paid generation and production capacity need validation with the chosen provider accounts and deployment host. The [verification record](docs/05-verification.md) distinguishes completed checks from remaining external checks.

## Further reading

- [Product and user journey](docs/01-product.md)
- [Fourteen implementation milestones](docs/03-milestones.md)
- [Code structure](docs/06-code-structure.md)
- [Commit workflow](docs/07-commit-workflow.md)
- [Vercel + Docker backend deployment](docs/08-split-deployment.md)
- [Adding screenshots, a demo video, and the live URL](docs/media/README.md)
