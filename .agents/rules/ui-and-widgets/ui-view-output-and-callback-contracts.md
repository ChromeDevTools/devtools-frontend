---
name: devtools/ui-and-widgets/ui-view-output-and-callback-contracts
rubric: design
severity: should_fix
---

**Rule.** Encapsulate imperative DOM actions in ViewOutput callbacks and pass user actions via semantic ViewInput callbacks instead of raw DOM references
- **Look for**: `ViewOutput` interfaces containing `HTMLElement` or `Element` properties, `ViewInput` callbacks typed as `(event: Event) => void` instead of semantic domain values (or index-based list item callbacks `(index: number) => void` instead of `(item: Item) => void`), plumbing focus closures or `ref()` + `setDefaultFocusedElement` through `ViewOutput` when declarative `autofocus` / `?autofocus=${...}` handles focus natively, view functions violating `isViewFunction` (`scripts/eslint_rules/lib/utils/lit.ts`: must take 3 identifier parameters ending in `input`, `output`, and `target`/`element`/`container` without parameter destructuring, and must not declare a return type other than `void` or `Promise<void>`), typing `UI.Widget.Widget<ShadowRoot>` view targets as bare `ShadowRoot` instead of `HTMLElement | ShadowRoot` (which breaks `createViewFunctionStub` parameter contravariance in `front_end/testing/ViewFunctionHelpers.ts`), imperative item/cell DOM factories (`UI.ListControl.ListDelegate.createElementForItem`, `UI.SoftDropDown.Delegate.createElementForItem`, `DataGridNode.createCell`) retained in migrated views instead of passing pure data-only item arrays in `ViewInput` and looping declaratively inside `<devtools-menu>`, `<devtools-list>`, `<devtools-data-grid>`, or `<devtools-tree>`, or view functions with no outputs that type `output` as `object` or `{}` instead of `undefined` (and view calls such as `this.#view(...)` in `performUpdate()` passing `{}` instead of `undefined`, or dangling `type ViewOutput = undefined` aliases).
- **Do not flag**: Third-party editor hosts, `<canvas>` (`HTMLCanvasElement`) and canvas sizing/resizer containers, or elements returned by unmigrated external APIs (such as `UI.SplitWidget.SplitWidget.prototype.resizerElement()` or `UI.TabbedPane.TabbedPane.prototype.rightToolbar()`); `target: HTMLElement | ShadowRoot` on `UI.Widget.Widget<ShadowRoot>` views or `target: DocumentFragment` on module-level `toDOM()` / `renderItem()` views; `(item: Item, contextMenu: UI.ContextMenu.ContextMenu) => void` callbacks where `DEFAULT_VIEW` constructs `ContextMenu`; or narrow imperative editor/selection closures on `ViewOutput` when dynamic mid-session text selection or scrolling cannot be expressed via `autofocus`.

**Why.** Exposing raw `HTMLElement` references on `ViewOutput` or passing raw `MouseEvent`/`KeyboardEvent` objects to presenter callbacks leaks DOM details into presenters. Views should populate narrow functional closures on `ViewOutput` only for genuine imperative actions that declarative attributes cannot express (e.g. `output.selectRange = (from, to) => ...`) and unpack event values before calling `input.onSelect(value)`.

## Examples

Bad:

```ts
export interface ViewOutput {
  inputElement?: HTMLInputElement;
}
export interface ViewInput {
  onInputChange: (event: Event) => void;
}
```

Good:

```ts
export interface ViewOutput {
  selectRange?: (from: number, to: number) => void;
}
export interface ViewInput {
  onFilterChanged: (newFilterText: string) => void;
}
```
