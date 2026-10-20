---
name: devtools/models-and-core/core-sourcemap-and-workspace-mapping
rubric: correctness
severity: blocking
---

**Rule.** Handle source map parsing, inline script offset translation, and scope tree resolution fault-tolerantly
- **Look for**: `window.btoa` on source map strings containing UTF-8, raw script locations passed to source map lookups without `rawLocationToRelativeLocation`, or unguarded `encodeURIComponent` / `JSON.parse` on external source map payloads.
- **Do not flag**: ASCII-only binary buffer encoding via `Common.Base64.encode`.

**Why.** Real-world source maps and inline `<script>` tags frequently contain malformed fields, UTF-8 characters, or non-zero line/column offsets. Source map consumers must translate raw inline script locations to relative locations, use UTF-8-safe URI encoding (`encodeURIComponent` with `try/catch` instead of `btoa`), and guard scope stack traversals.

## Examples

Bad:

```ts
const dataUrl = `data:application/json;base64,${btoa(sourceMapJson)}`;
const entry = sourceMap.findEntry(rawLocation.lineNumber, rawLocation.columnNumber);
```

Good:

```ts
const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(sourceMapJson)}`;
const rel = script.rawLocationToRelativeLocation(rawLocation);
const entry = sourceMap.findEntry(rel.lineNumber, rel.columnNumber);
```
