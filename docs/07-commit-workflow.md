# Small milestone commits

The original scaffold commit was preserved. The previously untracked implementation and frontend refactor were organized into these focused commits, in dependency order:

1. Product journey and browser/API contracts.
2. Rust configuration, domain types, and safe errors.
3. Public-URL validation and bounded downloading.
4. Readable text/HTML extraction and fixtures.
5. Provider credentials, context, requests, and error categories.
6. Provider streaming, citations, cancellation, and tests.
7. Axum routes, handlers, middleware, startup, and HTTP tests.
8. Browser API, persistence, export, types, and tests.
9. UI styles and responsive layouts.
10. Shared reading content, Markdown, and generation state helpers.
11. Application hooks and typed React context.
12. Home and navigation components.
13. Source, summary, chat, and settings components.
14. Frontend composition and the 200-line build check.
15. Container packaging, test scripts, and project/learning documentation.

These organize work that had already been developed together. Some intermediate dependency commits need later wiring commits before the entire app runs. The completed sequence is validated with 30 tests, production build, formatting, and Rust Clippy.

## Review the history

```sh
git log --oneline --reverse
git show --stat <commit-hash>
git show <commit-hash>
```

Use the hashes printed by `git log`. `git show` only reads changes; it does not alter your current files.

## Workflow for your next milestone

Pick one observable change, such as improving an extraction error. Finish it, check it, and commit only its related files. Keep future milestone commits independently runnable when possible.

```sh
git status --short
git diff
# Run the checks relevant to this change.
git add path/to/changed-file path/to/related-test
git diff --cached --stat
git diff --cached
git commit -m "fix(extraction): explain unsupported page encoding"
```

`git add` selects the exact version of files for the next commit. `git diff --cached` previews that selection. `git commit` saves a local checkpoint; it does not upload anything. Use `git restore --staged path/to/file` to remove a file from the selection while retaining its edits.

Use `feat(area): ...` for a capability, `fix(area): ...` for a bug, `refactor(area): ...` for structure changes, `test(area): ...` for tests, and `docs: ...` for documentation. Describe the resulting behavior in the message.

Never stage API keys, `.env`, build output, or dependencies. Generated dependency lockfiles should be committed when dependencies change. Pushing to a remote is a separate action from making local commits.
