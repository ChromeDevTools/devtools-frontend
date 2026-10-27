---
name: devtools/ui-and-widgets/ui-modern-component-and-encapsulation-standards
rubric: design
severity: should_fix
---

**Rule.** Use modern DevTools UI primitives (`devtools-button`, `devtools-data-grid`, `devtools-icon`), #private fields, and module entrypoint imports
- **Look for**: `UI.Fragment.build`, legacy `DataGridImpl`, `extends LitElement`, `private ` keyword instead of `#` in new UI classes, `<devtools-*>` tags in Lit templates without importing the corresponding component module entrypoint (e.g. `import * as Buttons from '../../ui/components/buttons/buttons.js'`), or formatting dates or timestamps with `toLocaleString()` inside sortable `<devtools-data-grid>` cells without a numeric/ISO sort value (sorts alphabetically instead of chronologically; use `toISOString()` or a numeric sort value).
- **Do not flag**: Overriding inherited `protected` lifecycle methods on framework base classes (e.g. extending `UI.Widget.Widget`).

**Why.** Legacy `UI.Fragment`, `DataGridImpl`, `LitElement`, `new Icon()`, and TypeScript `private` fields are superseded by standard `<devtools-*>` custom elements (imported via module entrypoints such as `import * as Buttons from '../../ui/components/buttons/buttons.js'` so custom tags register at runtime) and ECMAScript `#private` fields.

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
