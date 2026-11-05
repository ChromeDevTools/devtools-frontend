---
name: devtools/ui-and-widgets/ui-reactive-widget-update-lifecycle
rubric: design
severity: should_fix
---

**Rule.** Schedule widget re-renders asynchronously via this.requestUpdate(), avoid synchronous performUpdate() in presenter methods, and guard property setters with equality checks
- **Look for**: Widget property setters calling `this.performUpdate()` or `this.#view(...)` directly, setters calling `this.requestUpdate()` without checking `if (this.#prop === value) return;`, monolithic `set data(...)` object setters on `UI.Widget` subclasses instead of individual property setters, synchronous `this.performUpdate()` calls inside a `UI.Widget` `constructor()` (creates DOM and reads `UI.Context` before the widget is attached or visible; use `this.requestUpdate()` or `wasShown()` instead), synchronous `this.performUpdate()` calls in presenter methods, event handlers, selection/expansion/rename handlers, or helper nodes when scheduling an asynchronous `this.requestUpdate()` suffices (callers and tests should `await widget.updateComplete` when inspecting post-render DOM), custom `#renderView()` or `#render()` methods on `UI.Widget` subclasses that invoke `this.#view(...)` directly bypassing `override performUpdate()` and `this.requestUpdate()`, or view-layer refresh methods on presenter or presenter-node classes (such as `updateTrailingIcons()`, `updateIcon()`, `updateTreeElement()`) that push visual updates imperatively instead of mutating pure presenter state and calling `this.requestUpdate()` so `DEFAULT_VIEW` computes icons, badges, and tooltips declaratively.
- **Do not flag**: Internal test helpers, `legacy_test_runner` helpers, or synchronous initialization paths explicitly documented as requiring immediate flush. Synchronous `this.performUpdate()` calls in a constructor when the constructor or methods callable before `wasShown()` depend on `ViewOutput`, `widgetRef`, or `ref` fields populated by the initial render. `UI.Panel.Panel` or `UI.Dialog.Dialog` subclasses where `requestUpdate()` is unavailable and calling `performUpdate()` is required. Popover or tooltip widgets instantiated inside `setTimeout` or before element bounds measurement where synchronous DOM rendering is necessary before measuring dimensions.

**Why.** Calling `this.performUpdate()` or invoking `this.#view(...)` synchronously inside property setters, presenter event handlers, or helper methods causes redundant synchronous DOM renders and layout thrashing when multiple pieces of state change in the same tick. Presenter methods and setters should mutate state, short-circuit if unchanged, and schedule re-rendering asynchronously via `this.requestUpdate()`. Presenter nodes must not retain imperative view-refresh methods; all visual representations should be derived declaratively in the view function.

## Examples

Bad:

```ts
set items(items: Item[]) {
  this.#items = items;
  this.performUpdate();
}

selectNode(node: MyNode): void {
  this.#selectedNode = node;
  this.performUpdate(); // Synchronous render in presenter method
}

updateTrailingIcons(): void {
  // Imperative view-layer helper on presenter node
  this.#trailingIcons = [renderIcon()];
  this.performUpdate();
}
```

Good:

```ts
set items(items: Item[]) {
  if (this.#items === items) {
    return;
  }
  this.#items = items;
  this.requestUpdate();
}

selectNode(node: MyNode): void {
  if (this.#selectedNode === node) {
    return;
  }
  this.#selectedNode = node;
  this.requestUpdate();
}
```
