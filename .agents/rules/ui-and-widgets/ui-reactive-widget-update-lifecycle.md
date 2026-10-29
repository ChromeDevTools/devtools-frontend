---
name: devtools/ui-and-widgets/ui-reactive-widget-update-lifecycle
rubric: design
severity: should_fix
---

**Rule.** Schedule widget re-renders asynchronously via this.requestUpdate() and guard property setters with equality checks
- **Look for**: Widget property setters calling `this.performUpdate()` or `this.#view(...)` directly, setters calling `this.requestUpdate()` without checking `if (this.#prop === value) return;`, monolithic `set data(...)` object setters on `UI.Widget` subclasses instead of individual property setters, or synchronous `this.performUpdate()` calls inside a `UI.Widget` `constructor()` (creates DOM and reads `UI.Context` before the widget is attached or visible; use `this.requestUpdate()` or `wasShown()` instead).
- **Do not flag**: Internal test helpers or synchronous initialization paths explicitly documented as requiring immediate flush. Synchronous `this.performUpdate()` calls in a constructor when the constructor or methods callable before `wasShown()` depend on `ViewOutput`, `widgetRef`, or `ref` fields populated by the initial render.

**Why.** Calling `this.performUpdate()` or invoking `this.#view(...)` synchronously inside property setters causes redundant synchronous DOM renders when multiple properties change in the same tick. Setters should short-circuit if the value is unchanged and call `this.requestUpdate()`.

## Examples

Bad:

```ts
set items(items: Item[]) {
  this.#items = items;
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
```
