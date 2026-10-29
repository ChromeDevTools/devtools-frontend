---
name: devtools/ui-and-widgets/ui-pure-view-and-presenter-separation
rubric: design
severity: should_fix
---

**Rule.** Keep UI.Widget view functions pure and stateless by computing presentation data in presenters and passing decoupled ViewInput data structures
- **Look for**: `DEFAULT_VIEW` or view helper functions calling `Common.Settings.Settings.instance()`, `UI.Context.Context.instance()`, `SDK.TargetManager.TargetManager.instance()`, `Host.*`, or mutating model or `input.*` state in place; `ViewInput` interfaces carrying pre-created DOM `Element`/`HTMLElement` nodes or `UI.Widget` instances (`ListWidget`, `TabbedPane`, `Linkifier` elements); presenters calling `DEFAULT_VIEW(...)` or auxiliary `*_VIEW(...)` constants directly instead of injecting `view: View = DEFAULT_VIEW` via the constructor (`this.#view(...)`) and exporting `ViewInput` and `View`; or Lit migrations that delete existing standalone/class DOM helper functions and inline their logic into `performUpdate()` or `DEFAULT_VIEW` instead of converting them in place to return `LitTemplate` (or `Promise<LitTemplate|null>`).
- **Do not flag**: Legacy `UI.Widget` subclasses that have not yet migrated to a `DEFAULT_VIEW` function, or passing read-only `Protocol.*`, `SDK.*`, or `Models.*` objects in `ViewInput` when the view only reads properties/getters from them or forwards them to child widgets/linkifiers without mutating model state or calling side-effecting `SDK` methods.

**Why.** In DevTools' MVP architecture, `DEFAULT_VIEW` functions must be pure projections of `ViewInput` to Lit templates. Querying SDK models, reading global settings, mutating presenter state, or calling host/clipboard APIs inside the view couples rendering to global state and breaks isolated view testing.

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
