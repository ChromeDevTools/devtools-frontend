---
name: devtools/ui-and-widgets/ui-pure-view-and-presenter-separation
rubric: design
severity: should_fix
---

**Rule.** Keep UI.Widget view functions pure and stateless by computing presentation data in presenters and passing decoupled ViewInput data structures
- **Look for**: `DEFAULT_VIEW` or view helper functions calling `Common.Settings.Settings.instance()`, `SDK.*`, `Host.*`, mutating `input.*` arrays in place, or accepting raw `SDK`/`Protocol` domain objects instead of decoupled presentation interfaces on `ViewInput`.
- **Do not flag**: Legacy `UI.Widget` subclasses that have not yet migrated to a `DEFAULT_VIEW` function.

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
