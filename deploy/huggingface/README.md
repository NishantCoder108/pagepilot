---
title: PagePilot API
emoji: 📖
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# PagePilot API

Rust/Axum backend for the separately hosted PagePilot frontend.

Set `ALLOWED_ORIGINS` in this Space's variables to the exact HTTPS frontend origin. Do not use wildcards or add provider API keys to Space variables/secrets. Users supply their keys through the frontend for each generation request.

The direct Space domain serves `/health`, `/api/models`, `/api/extract`, and `/api/generate`. `/` returns service metadata; this Space is an API, not the frontend website.

See the main project's deployment guide for source synchronization, CORS, rate limits, and verification. This container has no persistent content database.
