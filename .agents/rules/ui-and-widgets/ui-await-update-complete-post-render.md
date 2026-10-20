---
name: devtools/ui-and-widgets/ui-await-update-complete-post-render
rubric: correctness
severity: blocking
---

**Rule.** Await this.updateComplete before executing post-render DOM measurements, focus changes, or scroll adjustments
- **Look for**: `this.requestUpdate()` followed synchronously by `.focus()`, `.getBoundingClientRect()`, `.scrollIntoView()`, or child widget measurement without `await this.updateComplete`.
- **Do not flag**: State updates that do not interact with rendered DOM nodes after scheduling the update.

**Why.** Because `this.requestUpdate()` schedules rendering asynchronously in a microtask, querying DOM geometry, focusing newly rendered controls, or anchoring popovers immediately after `requestUpdate()` operates on stale pre-render DOM state.

## Examples

Bad:

```ts
this.#isEditing = true;
this.requestUpdate();
this.#focusEditorInput();
```

Good:

```ts
this.#isEditing = true;
this.requestUpdate();
await this.updateComplete;
this.#focusEditorInput();
```
