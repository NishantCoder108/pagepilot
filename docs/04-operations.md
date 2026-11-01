# 04 · Deployment and operations

For separate Vercel frontend and Hugging Face backend hosting, use the [split deployment guide](08-split-deployment.md). This document also covers the original combined container setup.

## Local and container configuration

Rust reads exported environment variables directly. `.env.example` documents defaults; it is not automatically loaded. Never configure provider credentials as server environment variables. Compose has a loopback-only port, non-root process, read-only root filesystem, dropped capabilities, one CPU, and a 512 MB limit. These are initial guardrails, not benchmarked production sizing.

Build with `docker compose build`; start with `docker compose up -d`; stop with `docker compose down`. The service honors SIGINT for graceful shutdown. During a long deployment drain, a provider stream can last up to GENERATION_TIMEOUT_SECONDS; configure orchestrator grace periods accordingly. A forced termination results in incomplete browser output.

## TLS and proxy

The runtime has no built-in TLS. Put it behind an HTTPS reverse proxy and keep port 3000 private. Terminate TLS at the proxy, redirect public HTTP to HTTPS, disable response buffering for `/api/generate`, use a proxy read timeout greater than GENERATION_TIMEOUT_SECONDS, and disable access-log URL query/header/body capture. Do not enable request/response body telemetry. The application never logs keys, source content, questions, provider response bodies, or full URLs.

Set `ALLOWED_ORIGINS` to exact trusted HTTPS frontend origins for split hosting. Empty preserves same-origin browser use. API-only images use `SERVE_FRONTEND=false`; the standard container defaults to serving the built UI. CORS does not authenticate non-browser API callers.

The built-in per-minute limiter keys on the immediate socket peer, deliberately ignoring forwarded IP headers that clients can spoof. Behind a reverse proxy, all visitors may share this quota. Apply trusted client-IP abuse limits at the edge, then tune the conservative backend peer limit. Do not blindly trust arbitrary X-Forwarded-For. Multiple replicas require shared edge/distributed abuse controls; process semaphores are per replica.

## Limits

- REQUEST_CONCURRENCY (64): requests reading bodies/preparing responses. Model streams have their own separate limit after response headers.
- REQUEST_TIMEOUT_SECONDS (30): body-read and response-setup deadline, including slow uploads. Streaming has its own generation deadline.
- FETCH_CONCURRENCY (16): active URL download/extraction pipelines.
- PARSE_CONCURRENCY (2): HTML parsing workers in spawn_blocking. Already-running parsing cannot be canceled; the permit stays held until parsing ends.
- GENERATION_CONCURRENCY (16): active provider streams, including slow/disconnected clients until their stream is dropped.
- FETCH_TIMEOUT_SECONDS (20): complete fetch pipeline including DNS/redirects/body.
- GENERATION_TIMEOUT_SECONDS (120): total upstream generation timeout.
- MAX_DOWNLOAD_BYTES (2,000,000): decompressed HTML bytes, not Content-Length.
- MAX_DOCUMENT_BYTES (200,000): readable source input limit.
- MAX_REQUEST_BYTES (1,000,000): JSON body limit.
- REQUESTS_PER_MINUTE (30): POSTs per immediate peer over a 60-second window; at most 10,000 limiter entries.
- Provider input budgets are conservative UTF-8 byte limits including escaped context/history and overhead. Output is capped by model tokens plus an application byte cap.

SSRF controls reject credentials, non-HTTP schemes, nonstandard ports, private/reserved IPv4, IPv4-mapped IPv6, IPv6 local/transition ranges, and any DNS response containing a forbidden address. Each connection is pinned to validated addresses; redirects repeat validation. Environment proxies are disabled. Production networks should also deny internal/metadata destinations at the egress firewall as defense in depth. Fetching does not execute JavaScript or carry user cookies.

## Observability and maintenance

Health is `/health`; request logs report route category, status, request ID, and response-setup time. Generation logs additionally report request ID, duration, completion state, and safe error category. SSE errors are part of the stream and do not change its initial HTTP 200 status. Monitor generation completion/error events separately from HTTP status. Do not interpret response-setup latency as generation latency. No external telemetry service is configured.

Track process memory/CPU, p50/p95 end-to-end latency, busy/rate-limit counts, extraction failure categories, stream duration/termination, and provider quota failures using metadata only. If saturation appears, first identify whether download, parsing, model, or client speed is responsible. Do not simply increase every semaphore.

The catalog in `server/src/types.rs` is intentionally maintained and allowlisted. Review provider model retirements and access restrictions before a public release. Update IDs/labels and budget/request compatibility together; run adapter fixtures and a small, explicitly authorized real request for each model. Never substitute a provider/model automatically after an error.

Catalog checked October 30, 2026: GPT-5.4 mini/nano (reasoning disabled), Claude Sonnet 4.6/Haiku 4.5, Gemini 3.8 Flash/3.5 Flash-Lite (low/minimal thinking). The budget includes reasoning where the provider counts it toward output limits. Sources: [OpenAI mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [OpenAI nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano), [Claude lifecycle](https://platform.claude.com/docs/en/about-claude/model-deprecations), [Gemini lifecycle](https://ai.google.dev/gemini-api/docs/deprecations), and [Gemini thinking configuration](https://ai.google.dev/gemini-api/docs/thinking). API access still depends on the user's account; successful paid requests have not been assumed from documentation.

## Verification scope

`scripts/smoke.py` can measure bounded concurrent keyless text extraction. It does not represent network extraction or paid model throughput. Network fixtures and slow streaming tests should be used for repeatable resource checks. Actual production concurrency must be established on deployment hardware with representative sources, durations, and reverse-proxy settings.

No hosting account or deployment target is configured in this repository. Container readiness is not a claim that a public service has been deployed.

## Primary API references

- [Axum SSE](https://docs.rs/axum/latest/axum/response/sse/)
- [Tokio spawn_blocking](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html)
- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OpenAI streaming chat completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)
- [Anthropic streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Gemini content generation](https://ai.google.dev/api/generate-content)
