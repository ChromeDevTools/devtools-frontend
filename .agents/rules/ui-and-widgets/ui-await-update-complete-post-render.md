---
name: devtools/ui-and-widgets/ui-await-update-complete-post-render
rubric: correctness
severity: blocking
---

**Rule.** Await this.updateComplete before executing post-render DOM measurements, focus changes, or scroll adjustments
- **Look for**: `this.requestUpdate()` followed synchronously by `.focus()`, `.getBoundingClientRect()`, `.scrollIntoView()`, or DOM measurement without `await this.updateComplete`, or measuring, focusing, or anchoring popovers to child widgets created or updated during a parent render without `await childWidget.updateComplete` or `await UI.Widget.Widget.allUpdatesComplete`.
- **Do not flag**: State updates that do not interact with rendered DOM nodes after scheduling the update. Synchronous `.focus()` or layout measurement immediately following an intentional synchronous `this.performUpdate()`.

**Why.** Because `this.requestUpdate()` schedules rendering asynchronously on the next animation frame (`requestAnimationFrame`), querying DOM geometry, focusing newly rendered controls, or anchoring popovers immediately after `requestUpdate()` operates on stale pre-render DOM state. Likewise, child widgets created or updated during a parent render schedule their own asynchronous updates, so measuring or displaying a child widget requires awaiting `childWidget.updateComplete` or `UI.Widget.Widget.allUpdatesComplete`.

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
