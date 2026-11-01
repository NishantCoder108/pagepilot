# Deploy PagePilot: Vercel + a Docker backend

The browser loads the frontend from Vercel and calls the backend directly. Provider streams do not pass through Vercel Functions. Browser history and session keys remain on the frontend origin; the backend processes extraction/generation requests transiently.

Create both services under accounts you control, then connect their origins using the steps below.

## 1. Check accounts and repository

Hugging Face currently requires a paid account plan to create Docker Spaces, even though CPU Basic compute has no hourly charge. Review the [current requirements](https://huggingface.co/docs/hub/spaces-overview#creating-a-new-space) before selecting a plan. No GPU is needed: PagePilot calls external model providers.

Use one GitHub repository for this project. Vercel and Render can build from its root; a Hugging Face Space receives a backend-only source bundle. Review the committed files before pushing. Never upload provider keys or local `.env` files.

Run the project's tests and production build before the first deployment. Docker image execution must also be verified on a running Docker daemon or through the Space build/runtime logs; unit tests alone do not validate a Linux container.

## 2. Prepare the backend on Render

Create a Web Service linked to your repository. Use the Docker runtime, repository root as the build context, and the root `Dockerfile`. Set the health check path to `/health`.

Set these runtime environment variables in Render:

```text
BIND_ADDR=0.0.0.0:10000
SERVE_FRONTEND=false
```

Add `ALLOWED_ORIGINS` when the Vercel frontend origin is known. Render supplies a direct HTTPS service domain. Open `/health` on that domain and confirm the service is healthy before connecting Vercel. Free instances sleep when idle and have usage limits; review [Render's current limits](https://render.com/docs/free).

The root image builds the UI too, keeping combined hosting available. `SERVE_FRONTEND=false` makes the running service API-only.

### Alternative: Hugging Face Docker Space

Create a new Docker Space with public app access. A fully private Space requires authentication that the current browser client does not implement. Protected/public access options depend on your account; review the [visibility documentation](https://huggingface.co/docs/hub/spaces-overview#spaces-visibility).

From the repository root, prepare a source bundle in a new empty directory outside this checkout:

```sh
node scripts/prepare-hf-space.mjs /tmp/pagepilot-space
```

The bundle contains Rust sources/fixtures, Cargo manifests/lockfile, a backend-only Dockerfile, and the Space README metadata. It excludes frontend files and repository credentials. Its Dockerfile runs as UID 1000 and listens on `0.0.0.0:7860`; `app_port: 7860` matches that port.

Review the bundle, then upload its contents to the Space repository. Preserve the Space's own Git metadata if using a clone: copy the prepared files into the clone and commit/push from there. Do not push the main project's full README as the Space README, because the Space needs its YAML metadata.

For a local Docker check, build from that bundle:

```sh
docker build -t pagepilot-api /tmp/pagepilot-space
docker run --rm -p 127.0.0.1:7860:7860 pagepilot-api
```

Visit `/health` on the direct HTTPS `hf.space` domain shown by Hugging Face. It must return `{"status":"ok","service":"pagepilot"}`. `/api/models` must return the catalog. The Hub's embedded app preview may refuse framing because the API deliberately sets frame protection; use the direct URL for API checks.

## 3. Configure Vercel

Import the main GitHub repository into Vercel. Keep **Root Directory at the repository root**, not `web/`, so the shared line-budget script is available. The root `vercel.json` defines:

- Framework: Vite.
- Install command: `npm ci --prefix web`.
- Build command: `npm --prefix web run build`.
- Output directory: `web/dist`.

Set `VITE_API_BASE_URL` in the Vercel project's build-time environment to the backend's actual HTTPS origin, whether hosted on Render, Hugging Face, or a custom domain. Include no `/api` path, query, fragment, or credentials. The build rejects a missing API origin on Vercel and invalid origin values.

Deploy, then note the production frontend origin. Changing `VITE_API_BASE_URL` requires a new frontend build/deployment; it is public configuration, not a secret. Never add provider keys as `VITE_` variables.

The static `vercel.json` Content Security Policy explicitly permits `https://pagepilot-p7zj.onrender.com`. Set `VITE_API_BASE_URL` to that same origin in Vercel. This public hostname is safe to include in configuration; provider keys remain user-supplied. To change hosts, update both the environment variable and the policy's `connect-src` entry, then redeploy. Keep only `vercel.json`; the dynamic `vercel.ts` configuration was removed after hosted schema validation failed.

## 4. Connect the frontend origin on the backend

In Render → Environment (or Hugging Face Space Settings → Variables), set `ALLOWED_ORIGINS` to the exact production frontend origin from Vercel. Use HTTPS without a path. Multiple trusted origins may be comma-separated; wildcard domains, `*`, embedded credentials, and public HTTP origins are rejected.

The Hugging Face image already sets these values; Render uses the configuration in step 2:

```text
BIND_ADDR=0.0.0.0:7860
SERVE_FRONTEND=false
```

Keep provider API keys out of hosting settings. The user supplies their own through the UI. Restart/redeploy the backend after changing configuration so the application reads the new values.

The backend permits JSON and `x-provider-key` preflight headers for allowed origins and exposes safe request IDs. It does not use cross-origin cookies. CORS restricts browser access; it is not authentication for a public API, and non-browser clients can still call the service.

Add preview-deployment origins explicitly if needed. Do not allow every `vercel.app` project. Retire old preview origins when no longer used.

## 5. Verify the deployed pair

1. Open the production frontend in a fresh tab. Confirm the reading service is available and models load.
2. Read the sample article without a key, then extract a public URL. Browser Network should show requests going to the backend origin.
3. Confirm browser preflight responses allow only your configured frontend origin, including `content-type` and `x-provider-key` for generation.
4. Enter your own provider key, generate a short summary, ask a question, and follow a citation. Real generation uses that provider's API billing.
5. Stop a response, refresh during another response, and verify incomplete output/history recovery. Confirm the proxy streams progressively rather than buffering until completion.
6. Verify no keys/content appear in application/platform logs. Clear the session keys after testing.
7. Add the verified live frontend URL to the root README. Record the demo without exposing keys or request headers.

Do not call the deployment complete until actual streaming, provider access, and both production origins have been checked.

## Operations and troubleshooting

- Space hardware can sleep when unused. A first request may fail while it wakes; the UI explains that the service may be starting. Do not silently retry a paid generation request. Check the Space status and refresh when ready.
- The default 30-POSTs-per-minute limiter keys on the immediate socket peer. On a hosted reverse proxy, visitors may share that quota. Measure this before public promotion; use a trusted edge limiter or a reviewed proxy-aware design rather than accepting spoofable forwarded IPs.
- Resource limits are per replica. Keep bounded fetch/parse/generation settings and measure latency/memory under the selected hardware. Multiple replicas need coordinated abuse controls.
- If the frontend says the service is offline but `/health` works directly, check `VITE_API_BASE_URL`, the backend's exact `ALLOWED_ORIGINS`, CSP, and the browser's preflight response.
- A 401/403 from a model provider concerns the user's provider key/access. Hugging Face hosting does not supply OpenAI, Anthropic, or Gemini API access.
- Local combined hosting still works with an empty frontend API origin, `SERVE_FRONTEND=true`, and the original Docker Compose setup.

## References

- [Hugging Face Docker Spaces](https://huggingface.co/docs/hub/spaces-sdks-docker)
- [Space metadata and exposed port](https://huggingface.co/docs/hub/spaces-config-reference)
- [Vercel static configuration and headers](https://vercel.com/docs/project-configuration/vercel-json#headers)
- [Render Docker web services](https://render.com/docs/web-services)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
