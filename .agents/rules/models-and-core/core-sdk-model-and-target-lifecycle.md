---
name: devtools/models-and-core/core-sdk-model-and-target-lifecycle
rubric: correctness
severity: blocking
---

**Rule.** Manage SDK model and sub-target state on scoped manager instances using O(1) indexed maps rather than module globals or linear scans
- **Look for**: Module-level `const tracked = new Map/Set()` in `core/sdk/` or `models/bindings/`, linear DOM tree traversals for frame/node lookups instead of indexed `Map`s, or target listeners that ignore sub-target attachment/detachment.
- **Do not flag**: Immutable module-level `Set` or `Map` lookup tables of constant string literals. Properties marked required (non-optional) in generated `front_end/generated/protocol.ts` CDP types (do not ask for redundant runtime null/undefined checks on them), or `node.shadowRoots()[0]` accesses (elements have at most one shadow root; the array return type is a legacy Shadow DOM v0 artifact).

**Why.** Storing model tracking collections (`Set`/`Map`) at module scope leaks state across multiple `TestUniverse` instances and targets, while failing to track OOPIF/worker sub-targets or scanning DOM trees linearly for frame nodes causes bugs and $O(N)$ bottlenecks.

## Examples

Bad:

```ts
const trackedSourceCodes = new Set<Workspace.UISourceCode.UISourceCode>();
export class NetworkProjectManager {
  add(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    trackedSourceCodes.add(uiSourceCode);
  }
}
```

Good:

```ts
export class NetworkProjectManager {
  readonly #trackedSourceCodes = new Set<Workspace.UISourceCode.UISourceCode>();
  add(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.#trackedSourceCodes.add(uiSourceCode);
  }
}
```
