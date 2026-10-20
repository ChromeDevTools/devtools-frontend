---
name: devtools/models-and-core/core-cdp-and-extension-error-handling
rubric: correctness
severity: blocking
---

**Rule.** Handle CDP ProtocolResponseWithError and ContentDataOrError explicitly, release RemoteObject handles in finally blocks, and return Promises
- **Look for**: `try { await ...invoke_*() }` or `try { await request.requestContentData() }` blocks, `Runtime.evaluate` calls creating `RemoteObject`s without `release()` in `finally`, callback-taking SDK methods instead of `Promise`, or `reject(rawObject)` in `ExtensionAPI.ts`.
- **Do not flag**: `try/catch` blocks that wrap subsequent throwing operations like `JSON.parse()`. Properties marked required (non-optional) in generated `front_end/generated/protocol.ts` CDP types (do not ask for redundant runtime null/undefined checks on them), or `node.shadowRoots()[0]` accesses (elements have at most one shadow root; the array return type is a legacy Shadow DOM v0 artifact).

**Why.** CDP agent calls and `requestContentData()` resolve to error-bearing response objects (`getError()`, `ContentData.isError()`) rather than throwing, so wrapping them in `try/catch` is misleading. Furthermore, temporary `RemoteObject` handles must be released in `finally` blocks, and extension APIs must reject with sanitized `Error` instances.

## Examples

Bad:

```ts
try {
  const content = await request.requestContentData();
  process(content.text);
} catch (err) {
  console.error(err);
}
```

Good:

```ts
const contentData = await request.requestContentData();
if (TextUtils.ContentData.ContentData.isError(contentData)) {
  return {error: contentData.error};
}
process(contentData.text);
```
