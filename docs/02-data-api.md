# 02 · Data and API contracts

## Browser database v1

IndexedDB `pagepilot`, version 1. `documents` (key `id`) embeds ordered passages `{id, heading?, text}` plus `{title, source_url: string|null, extracted_at}`. `conversations` (key `id`, unique `document_id` index) identifies one chat per document. `messages` (key `id`, `conversation_id` index) contains role, content, citations, provider/model, timestamp, and status (`streaming`, `complete`, `incomplete`). `summaries` (key `document_id`) has equivalent generation metadata. Transactionally save a workspace across these stores; delete all dependent records with its document. Migrations are explicit in storage.ts; add upgrade steps when increasing the version. Never persist credential fields.

sessionStorage keys `pagepilot.key.<provider>` contain provider keys; `pagepilot.preferences` contains model/provider preferences. Access exceptions become visible notices. No localStorage use. No server content database. The browser sends the saved document and completed chat history with each AI request.

## HTTP

JSON uses snake_case. All responses have `x-request-id`; errors: `{error:{code,message,request_id}}`. Requests are size bounded; JSON rejection is normalized too. Credentials use `x-provider-key`, never query strings. Fixed provider hosts only.

- `GET /health` → `{status:"ok",service:"pagepilot"}`.
- `GET /api/models` → `{models:[{provider,id,label,input_budget,output_tokens}]}`. `input_budget` is a conservative application byte budget, not a tokenizer or advertised provider context window.
- `POST /api/extract` accepts exactly one of `{url:"https://example.com/article"}` or `{text:"Article…",title:"Optional title"}`. Returns `{id,title,source_url,extracted_at,passages:[{id:"p1",heading:null,text:"…"}]}`. Reject empty, oversized, unsupported/non-readable content.
- `POST /api/generate` accepts `{mode:"summary"|"chat",provider:"openai"|"anthropic"|"gemini",model,document,history:[{role:"user"|"assistant",content}],question?,passage_ids?:["p1"]}`. Chat requires question; source selection must exist. Entire supplied history/context is budgeted, never silently dropped. Model allowlist is authoritative.

Generation uses POST fetch, not EventSource (which cannot send this body/header). Response `text/event-stream`; events have JSON data:

```
event: progress
data: {"message":"Connecting to provider…"}

event: delta
data: {"text":"The page explains… [p1]"}

event: complete
data: {"citations":["p1"]}

event: error
data: {"error":{"code":"stream_interrupted","message":"…","request_id":"…"}}
```

Only a valid terminal provider signal produces `complete`. Length stops, safety blocks, unexpected EOF, malformed streams, timeouts, and provider errors produce `error` and preserve incomplete content. Frontend treats missing terminal app event as interruption. No automatic reconnection/retry. Citation IDs are filtered against selected source passages at completion; UI independently links valid IDs only.

## Runtime boundaries

HTTP handlers → extraction/safe fetch OR context preparation/provider adapter → normalized SSE. Async network I/O uses Tokio; HTML parsing runs under a semaphore in spawn_blocking. Fetch and generation slots use immediate rejection, not unlimited queues. Dropping a client stream drops upstream work; already-running blocking parsing is bounded but cannot be forcibly canceled. Network checks include public-IP filtering, DNS resolution pinning, no environment proxy, manual redirect revalidation, allowed ports, and decompressed body caps. Providers never receive the key in a URL. Operational logs contain request ID, status, route category, elapsed time only.
