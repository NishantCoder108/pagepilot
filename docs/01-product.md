# 01 · Product specification

PagePilot turns one public article/documentation page into a readable source, summary, and grounded conversation. People bring their own OpenAI, Anthropic, or Gemini API key. No account, server database, cross-device sync, crawling, PDF, paywall bypass, or JavaScript browser renderer in v1.

## Journey and screens

Home: URL field, paste-text alternative, recent pages. Read page works without a key. Show extraction progress; a failed fetch offers pasted text. Workspace: source reader, overview, chat, and provider setup. Desktop has a library sidebar and source/AI workspace; narrow screens stack and use tabs. Use calm off-white surfaces, forest-green actions, readable type, and clear keyboard focus.

Provider setup: select provider/model, enter masked key, explain that content goes to that provider and usage is billed to their API account. Keys survive refresh in the same tab through sessionStorage. They never go into IndexedDB. Clear keys is always available. sessionStorage is JavaScript-accessible and some browsers restore it with a restored tab; do not promise automatic secure erasure on close.

Summary: explicit paid action, streamed Markdown, overview/key takeaways. Chat: suggested questions, source-linked [pN] citations, explicit uncertainty when a source cannot answer. Citations identify existing passages, not independently verified facts. User can stop, retry, select shorter source context, export Markdown, delete a document, or clear history.

## States and acceptance

- Empty: focused URL entry and an example pasted document; no fake saved history or simulated AI.
- Loading: visible progress and disabled duplicate actions. Generation has Stop; page switching/deletion is disabled while streaming.
- Extraction error: safe actionable explanation; preserve input and allow paste fallback.
- Invalid key/access/rate limit: provider-specific category, no raw provider body, no automatic paid retries.
- Oversized context: ask for fewer selected source passages; do not truncate source/history silently.
- Interrupted stream: preserve partial output as incomplete, including after refresh. Retry is explicit and may incur charges.
- Storage unavailable/quota: visible notice; active session continues in memory. Document deletion removes its conversation/messages/summary transactionally.
- Refresh: saved work restores; session key remains. Credentials are never exported.

Launch acceptance: complete the URL → reader → explicit summary → cited question → refresh → export/delete journey; repeat provider flows with user-supplied keys. Capacity is measured on deployment hardware, never assumed from Tokio.
