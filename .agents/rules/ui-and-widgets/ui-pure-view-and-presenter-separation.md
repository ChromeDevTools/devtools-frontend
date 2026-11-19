---
name: devtools/ui-and-widgets/ui-pure-view-and-presenter-separation
rubric: design
severity: should_fix
---

**Rule.** Keep UI.Widget view functions pure and stateless by computing presentation data in presenters and passing decoupled ViewInput data structures
- **Look for**: `DEFAULT_VIEW` or view helper functions calling `Common.Settings.Settings.instance()`, `UI.Context.Context.instance()`, `SDK.TargetManager.TargetManager.instance()`, `Host.*`, or mutating model or `input.*` state in place; `ViewInput` interfaces carrying pre-created DOM `Element`/`HTMLElement` nodes or `UI.Widget` instances (`ListWidget`, `TabbedPane`, `Linkifier` elements); presenters calling `DEFAULT_VIEW(...)` or auxiliary `*_VIEW(...)` constants directly instead of injecting `view: View = DEFAULT_VIEW` via the constructor (`this.#view(...)`) and exporting `ViewInput` and `View`; migrated MVP `UI.Widget` presenters omitting `element?: HTMLElement` (`super(element)`) as the first constructor parameter, which forces parent templates to use `WrapperWidget` instead of `${widget(MyWidget, {...})}`; presenters unpacking raw DOM events (`event.preventDefault()`, `(e.target as HTMLInputElement).checked`, `e.detail`) or constructing/showing `new UI.ContextMenu.ContextMenu(event)` instead of keeping DOM event unpacking and `ContextMenu` creation/`show()` inside `DEFAULT_VIEW`; one-time lazy model/workspace initialization guards (`if (!this.#initialized) { ... }`) inside `performUpdate()` (side-effecting initialization belongs in `wasShown()`, keeping `performUpdate()` a pure projection of presenter state into `this.#view(...)`); or Lit migrations that delete existing standalone/class DOM helper functions and inline their logic into `performUpdate()` or `DEFAULT_VIEW` instead of converting them in place to return `LitTemplate` (or `Promise<LitTemplate|null>`).
- **Do not flag**: Legacy `UI.Widget` subclasses that have not yet migrated to a `DEFAULT_VIEW` function; passing read-only `Protocol.*`, `SDK.*`, or `Models.*` objects in `ViewInput` when the view only reads properties/getters from them or forwards them to child widgets/linkifiers without mutating model state or calling side-effecting `SDK` methods; `static override readonly INJECT` widgets taking `UI.Widget.WidgetDependencies<typeof MyWidget>` between `element?: HTMLElement` and `view: View = DEFAULT_VIEW`; constructing `new UI.ContextMenu.ContextMenu(event)`, calling `input.onContextMenu(..., contextMenu)`, and invoking `void contextMenu.show()` inside `DEFAULT_VIEW`; or non-`UI.Widget` external or legacy DOM adapter methods (`CodeMirror.WidgetType.toDOM()`, `CodeMirror.GutterMarker.toDOM()`, `UI.ListWidget.Delegate.renderItem()`) calling a module-level 3-parameter `*_VIEW(input, undefined, fragment)` on `document.createDocumentFragment()` and returning `fragment.firstElementChild`.

**Why.** In DevTools' MVP architecture, `DEFAULT_VIEW` functions must be pure projections of `ViewInput` to Lit templates. Querying SDK models, reading global settings, mutating presenter state, performing one-time initialization inside `performUpdate()`, or calling host/clipboard APIs inside the view couples rendering to global state and breaks isolated view testing.

## Examples

Bad:

```ts
export const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  const showAdvanced = Common.Settings.Settings.instance().moduleSetting('show-advanced').get();
  const sorted = input.items.sort((a, b) => a.name.localeCompare(b.name));
  Lit.render(html`...`, target);
};
```

Good:

```ts
export const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  Lit.render(html`${input.sortedItems.map(item => html`<div>${item.name}</div>`)}`, target);
};
```

Bad:

```ts
override performUpdate(): void {
  if (!this.#initialized) {
    this.#initialized = true;
    this.#initializeFromWorkspace(); // Side-effecting initialization in performUpdate
  }
  this.#view(this.#viewInput, undefined, this.contentElement);
}
```

Good:

```ts
override wasShown(): void {
  super.wasShown();
  if (!this.#initialized) {
    this.#initialized = true;
    this.#initializeFromWorkspace();
  }
  this.requestUpdate();
}

override performUpdate(): void {
  this.#view(this.#viewInput, undefined, this.contentElement);
}
```
