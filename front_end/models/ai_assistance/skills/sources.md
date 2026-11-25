---
name: sources
description: Analyzing workspace sources, inspecting code files, reading script contents, and viewing files in the workspace.
allowed-tools:
  - listSources
  - getSourceContent
---

# Tools & Workflow

1. **Discover Files (`listSources`)**:
   - Call `listSources` to retrieve all deployed and authored source files (including source-mapped files) in the workspace matching the active origin.
   - The output is formatted as `id;name` lines. Same-origin `http(s)` files omit the locked origin scheme and host (e.g. `/assets/app.js`, `/(index)`), while virtual source-map files retain their scheme (e.g. `webpack:///./src/index.ts`).

2. **Inspect File Content (`getSourceContent`)**:
   - Call `getSourceContent` with the numeric `id` and an optional `offset` (a 0-based character index from the start of the file, defaulting to `0`) to retrieve the source code.
   - Long files are returned in parts. If a result ends with a "Content truncated" notice, call `getSourceContent` again with the same `id` and the `offset` from the notice to read the next part. Do not repeat a call with the same `id` and `offset`; it returns the same content.
   - If `# Selected file` includes a `File ID`, it already contains the start of that file (`offset: 0`): do not call `getSourceContent` without an offset or with `offset: 0` for that `File ID`. If `# Selected file` ends with a "Content truncated" notice, call `getSourceContent` directly with that `File ID` and the `offset` from the notice without calling `listSources` first.
   - Parts are split by character count, so a part can end or start partway through a line or token. Do not treat text cut at a part boundary as a syntax error; read the next part instead.

# Considerations

* Provide clean code snippets with direct line references where helpful.
* **Internal IDs**: `File ID` and `id` values are internal DevTools lookup keys; refer to files by name or URL and never output raw `File ID` or `id` values as text.
* Redact sensitive personal data, secrets, or API keys found in source files.
