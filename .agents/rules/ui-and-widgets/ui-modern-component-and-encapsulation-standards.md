---
name: devtools/ui-and-widgets/ui-modern-component-and-encapsulation-standards
rubric: design
severity: should_fix
---

**Rule.** Use modern DevTools UI primitives (`devtools-button`, `devtools-data-grid`, `devtools-icon`, `devtools-link`, `devtools-list`, `devtools-prompt`, `devtools-stack-pane`, `devtools-tabbed-pane`, `devtools-tree`), #private fields, and module entrypoint imports
- **Look for**: `UI.Fragment.build`, legacy `DataGridImpl`, `extends LitElement`, `Link.create(...)` or `UI.XLink.XLink.create(...)` inside Lit view functions (use `<devtools-link>` instead), `UI.ListWidget.ListWidget` / `UI.ListWidget.Delegate` in newly migrated views or passed via `ViewInput` to `WrapperWidget` with `DocumentFragment` item/editor adapters (prefer `<devtools-list>` with `<devtools-prompt>`, an inline editor row, or `UI.Dialog.Dialog`, or encapsulate `ListWidget` inside the view layer behind pure `ViewInput` data and callbacks), legacy `UI.TreeOutline.TreeOutline` / `TreeOutlineInShadow`, `extends UI.TreeOutline.TreeElement` subclasses, `UI.ListControl.ListControl`, or `UI.InplaceEditor` in newly authored UI or in CLs claiming to complete a UI Eng Vision migration (`Fixed: <id>`) (noting that ESLint `@devtools/no-imperative-dom-api` does not flag `extends UI.TreeOutline.TreeElement` subclasses or `UI.ListControl`), migrated `UI.Widget` subclasses with `DEFAULT_VIEW` whose constructor omits `element?: HTMLElement` as its first parameter (`constructor(element?: HTMLElement, ..., view: View = DEFAULT_VIEW)` so the widget can be instantiated via `${widget(MyWidget, ...)}`), or omits `static override readonly INJECT` when requesting `Universe`-managed dependencies, imperative `UI.TabbedPane.TabbedPane` or `StackLocation` passed via `ViewInput` instead of declarative `<devtools-tabbed-pane>` / `<devtools-stack-pane>` in the view, `private ` keyword instead of `#` in new UI classes, `<devtools-*>` tags in Lit templates without importing the corresponding component module entrypoint (e.g. `import * as Buttons from '../../ui/components/buttons/buttons.js'`), or formatting dates or timestamps with `toLocaleString()` inside sortable `<devtools-data-grid>` cells without a numeric/ISO sort value (sorts alphabetically instead of chronologically; use `toISOString()` or a numeric sort value).
- **Do not flag**: Overriding inherited `protected` lifecycle methods on framework base classes (e.g. extending `UI.Widget.Widget`). Explicitly scoped intermediate CLs (`Bug: <id>`, not `Fixed: <id>`) in a multi-CL migration that refactor presenter/item state in place while deferring `<devtools-tree>` or `UI.ListControl` replacement to a follow-up CL.

**Why.** Legacy `UI.Fragment`, `DataGridImpl`, `LitElement`, `new Icon()`, `Link.create()`, `UI.XLink.XLink.create()`, `UI.TreeOutline`, `UI.ListControl`, `UI.InplaceEditor`, `UI.ListWidget.ListWidget`, imperative `UI.TabbedPane.TabbedPane` / `StackLocation`, and TypeScript `private` fields are superseded by standard `<devtools-*>` custom elements (imported via module entrypoints such as `import * as Buttons from '../../ui/components/buttons/buttons.js'` so custom tags register at runtime) and ECMAScript `#private` fields. Migrated widgets must expose the standard MVP constructor signature (`element?: HTMLElement, ..., view: View = DEFAULT_VIEW`) and declare `static override readonly INJECT` for dependency injection.

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
