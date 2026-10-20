---
name: devtools/models-and-core/core-runtime-neutrality-and-platform-utils
rubric: correctness
severity: blocking
---

**Rule.** Maintain runtime neutrality in foundation modules using Platform.HostRuntime, globalThis, and centralized core/platform utilities
- **Look for**: `navigator.userAgent`, `window.setTimeout`, `window.atob`, manual `new Promise(r => { resolve = r; })` deferreds instead of `Promise.withResolvers()`, or ad-hoc MIME/escaping regexes in `core/` and `models/`.
- **Do not flag**: Browser-only UI components in `front_end/panels/` or `front_end/ui/`.

**Why.** Foundation modules (`core/` and `models/`) run in both browser DevTools and headless Node.js/worker environments (such as trace analysis and MCP servers). Accessing `window`, `navigator.userAgent`, or `document` directly breaks non-browser runtimes, and duplicating MIME/string/deferred utilities causes subtle bugs.

## Examples

Bad:

```ts
const ua = navigator.userAgent;
let resolve!: () => void;
const promise = new Promise<void>(r => { resolve = r; });
```

Good:

```ts
const ua = Platform.HostRuntime.HOST_RUNTIME.getUserAgent();
const {promise, resolve} = Promise.withResolvers<void>();
```
