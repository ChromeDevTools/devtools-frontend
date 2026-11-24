---
name: devtools/ui-and-widgets/ui-modern-component-and-encapsulation-standards
rubric: design
severity: should_fix
---

**Rule.** Use modern DevTools UI primitives (`devtools-button`, `devtools-checkbox`, `devtools-data-grid`, `devtools-icon`, `devtools-link`, `devtools-list`, `devtools-prompt`, `devtools-split-view`, `devtools-stack-pane`, `devtools-tabbed-pane`, `devtools-tree`), Light DOM by default, #private fields, and module entrypoint imports
- **Look for**: `UI.Fragment.build`, legacy `DataGridImpl`, `extends LitElement` or `extends Lit.LitElement`, `Link.create(...)` inside Lit view functions (use `<devtools-link>` instead), `CheckboxLabel.create` or `createSettingCheckbox` inside Lit view functions (use `<devtools-checkbox>` instead), raw `<input type="checkbox">` elements in Lit templates (banned by `@devtools/no-raw-checkbox-input`; use `<devtools-checkbox>` instead), `extends UI.Toolbar.ToolbarItem` subclasses outside `ui/legacy/Toolbar.ts` instead of declarative `<devtools-toolbar>` children, `UI.ListWidget.ListWidget` / `UI.ListWidget.Delegate` in newly migrated views or passed via `ViewInput` to `WrapperWidget` with `DocumentFragment` item/editor adapters (prefer `<devtools-list>` with `<devtools-prompt>`, an inline editor row, or `UI.Dialog.Dialog`, or encapsulate `ListWidget` inside the view layer behind pure `ViewInput` data and callbacks), legacy `UI.TreeOutline.TreeOutline` / `TreeOutlineInShadow`, `extends UI.TreeOutline.TreeElement` subclasses, `UI.ListControl.ListControl`, or `UI.InplaceEditor` in newly authored UI or in CLs claiming to complete a UI Eng Vision migration (`Fixed: <id>`) (noting that ESLint `@devtools/no-imperative-dom-api` does not flag `extends UI.TreeOutline.TreeElement` subclasses or `UI.InplaceEditor`), migrated `UI.Widget` subclasses with `DEFAULT_VIEW` whose constructor omits `element?: HTMLElement` as its first parameter (`constructor(element?: HTMLElement, ..., view: View = DEFAULT_VIEW)` so the widget can be instantiated via `${widget(MyWidget, ...)}`), or omits `static override readonly INJECT` when requesting `Universe`-managed dependencies, imperative `UI.SplitWidget.SplitWidget`, `UI.TabbedPane.TabbedPane`, or `StackLocation` passed via `ViewInput` instead of declarative `<devtools-split-view>` / `<devtools-tabbed-pane>` / `<devtools-stack-pane>` in the view, `useShadowDom: true` on new or migrated `UI.Widget` subclasses instead of defaulting to Light DOM (`super(element)` with `@scope to (devtools-widget > *)`) and reserving `useShadowDom: 'pure'` (`Widget<ShadowRoot>` / `VBox<ShadowRoot>`) for `<slot>` projection or `.textContent` test isolation, `super(..., {classes: [...]})` / `super(..., {jslog: ...})` violating `@devtools/no-widget-constructor-classes` instead of passing `{container: {classes: [...], attributes: {jslog: ...}}}` across **every** `render()` branch in `DEFAULT_VIEW` (note that on `useShadowDom: true` widgets `contentElement` is an inner `<div>`, so moving `classes` off `super()` without switching to Light DOM or `'pure'` breaks `:host(.cls)` and host `flex-none`), `private ` keyword instead of `#` in new or migrated UI classes (or forgetting to remove fully migrated files from `eslint.config.mjs`'s `prefer-private-class-members` allowlist), `<devtools-*>` tags in Lit templates without importing the corresponding component module entrypoint (e.g. `import * as Buttons from '../../ui/components/buttons/buttons.js'` or side-effect `import '../../ui/components/buttons/buttons.js'`), or formatting dates or timestamps with `toLocaleString()` inside sortable `<devtools-data-grid>` cells without a numeric/ISO `data-value=${...}` sort value (sorts alphabetically instead of chronologically; use `data-value=${...}` or `toISOString()`).
- **Do not flag**: Overriding inherited `protected` lifecycle methods on framework base classes (e.g. extending `UI.Widget.Widget`). Reusable Shadow DOM primitives in `front_end/ui/components/` and `front_end/ui/kit/`. Files retained on `eslint.config.mjs`'s `prefer-private-class-members` list because legacy `*TestRunner.js` or `Object.create` tests access TypeScript `private` fields at runtime. Explicitly scoped intermediate CLs (`Bug: <id>`, not `Fixed: <id>`) in a multi-CL migration that refactor presenter/item state in place while deferring `<devtools-tree>` or `UI.ListControl` replacement to a follow-up CL.

**Why.** Legacy `UI.Fragment`, `DataGridImpl`, `LitElement` / `Lit.LitElement`, `new Icon()`, `Link.create()`, `CheckboxLabel.create()`, `UI.TreeOutline`, `UI.ListControl`, `UI.InplaceEditor`, `UI.ListWidget.ListWidget`, imperative `SplitWidget` / `TabbedPane` / `StackLocation`, and TypeScript `private` fields are superseded by standard `<devtools-*>` custom elements (imported via module entrypoints such as `import * as Buttons from '../../ui/components/buttons/buttons.js'` so custom tags register at runtime), Light DOM widgets (`super(element)` with `@scope to (devtools-widget > *)`, or `useShadowDom: 'pure'` when `<slot>` projection is needed), `{container: {classes, attributes}}` across all `render()` branches, and ECMAScript `#private` fields. Migrated widgets must expose the standard MVP constructor signature (`element?: HTMLElement, ..., view: View = DEFAULT_VIEW`) and declare `static override readonly INJECT` for dependency injection.

## Examples

Bad:

```ts
import type * as Buttons from '../../ui/components/buttons/buttons.js';
export class MyView extends UI.Widget.VBox {
  private grid = new DataGrid.DataGrid.DataGridImpl({...});
  private tree = new UI.TreeOutline.TreeOutlineInShadow();
}
```

Good:

```ts
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import '../../ui/kit/kit.js';

export class MyView extends UI.Widget.VBox {
  #items: Item[] = [];
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }
}
```
