---
name: devtools/ui-and-widgets/ui-modern-component-and-encapsulation-standards
rubric: design
severity: should_fix
---

**Rule.** Use modern DevTools UI primitives (`devtools-button`, `devtools-data-grid`, `devtools-icon`, `devtools-link`, `devtools-list`, `devtools-tabbed-pane`, `devtools-stack-pane`), #private fields, and module entrypoint imports
- **Look for**: `UI.Fragment.build`, legacy `DataGridImpl`, `extends LitElement`, `Link.create(...)` or `UI.XLink.XLink.create(...)` inside Lit view functions (use `<devtools-link>` instead), `UI.ListWidget.ListWidget` / `UI.ListWidget.Delegate` in newly migrated views or passed via `ViewInput` to `WrapperWidget` with `DocumentFragment` item/editor adapters (prefer `<devtools-list>` with `<devtools-prompt>`, an inline editor row, or `UI.Dialog.Dialog`, or encapsulate `ListWidget` inside the view layer behind pure `ViewInput` data and callbacks), imperative `UI.TabbedPane.TabbedPane` or `StackLocation` passed via `ViewInput` instead of declarative `<devtools-tabbed-pane>` / `<devtools-stack-pane>` in the view, `private ` keyword instead of `#` in new UI classes, `<devtools-*>` tags in Lit templates without importing the corresponding component module entrypoint (e.g. `import * as Buttons from '../../ui/components/buttons/buttons.js'`), or formatting dates or timestamps with `toLocaleString()` inside sortable `<devtools-data-grid>` cells without a numeric/ISO sort value (sorts alphabetically instead of chronologically; use `toISOString()` or a numeric sort value).
- **Do not flag**: Overriding inherited `protected` lifecycle methods on framework base classes (e.g. extending `UI.Widget.Widget`).

**Why.** Legacy `UI.Fragment`, `DataGridImpl`, `LitElement`, `new Icon()`, `Link.create()`, `UI.XLink.XLink.create()`, `UI.ListWidget.ListWidget`, imperative `UI.TabbedPane.TabbedPane` / `StackLocation`, and TypeScript `private` fields are superseded by standard `<devtools-*>` custom elements (imported via module entrypoints such as `import * as Buttons from '../../ui/components/buttons/buttons.js'` so custom tags register at runtime) and ECMAScript `#private` fields. In particular, keeping `this.list = new UI.ListWidget.ListWidget(this)` and `implements UI.ListWidget.Delegate` on a migrated presenter (imperatively calling `this.list.clear()`, `this.list.appendItem()`, `this.list.addNewItem()`, using `DocumentFragment` adapters in `renderItem`/`beginEdit`, and passing `list` in `ViewInput` to `WrapperWidget`) leaks view widgets into presenter state; replace `ListWidget` + `ListWidget.Delegate` with `<devtools-list>` (or, if preserving legacy `ListWidget.Editor` screenshot goldens temporarily, move `ListWidget` and `ListWidget.Delegate` ownership into the view layer and pass only pure data and callbacks in `ViewInput`).

## Examples

Bad:

```ts
import type * as Buttons from '../../ui/components/buttons/buttons.js';
export class MyView extends UI.Widget.VBox {
  private grid = new DataGrid.DataGrid.DataGridImpl({...});
}
```

Good:

```ts
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
export class MyView extends UI.Widget.VBox {
  #items: Item[] = [];
}
```
