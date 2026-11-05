---
name: devtools/tests/test-view-and-presenter-isolation
rubric: testing
severity: should_fix
---

**Rule.** Test presenters via createViewFunctionStub, encapsulate legacy DOM/tree inspection in test helpers, and test pure view functions directly without piercing internal DOM structures
- **Look for**: Presenter tests instantiating full DOM trees and querying shadow/child DOM selectors to simulate clicks when the widget accepts a `view` function, view tests instantiating full presenters just to test template markup, or pre-migration unit test suites added for a legacy widget (`UI.TreeOutline`, `DataGrid`, `UI.ListControl`, `UI.ListWidget`) that scatter direct internal structure queries (`.scriptsTree`, `.rootElement()`, internal shadow-DOM selectors) across individual `it()` blocks instead of isolating them in small local test helpers (`dumpTree()`, `findTreeItem()`, `activateRow()`), or that omit `assertScreenshot(...)` visual baselines when the underlying legacy widget implementation is scheduled to be replaced.
- **Do not flag**: Legacy widgets that have not yet separated their template rendering into a standalone `DEFAULT_VIEW` function. Pre-existing mounted widget tests in `*.test.ts` when migrating a widget to `DEFAULT_VIEW` (keep existing end-to-end presenter + `DEFAULT_VIEW` + child-widget wiring tests intact; `createViewFunctionStub` tests may be added for new presenter logic, not used to delete existing DOM wiring coverage). Isolated presenter unit tests using `createViewFunctionStub` do not require screenshot assertions.

**Why.** In DevTools' MVP (`UI.Widget` + `DEFAULT_VIEW`) architecture, presenter tests should follow the view stubbing conventions documented in [`docs/ui_engineering.md`](../../../docs/ui_engineering.md) by stubbing the view function with `createViewFunctionStub(Presenter)` and asserting on `await view.nextInput`, while view rendering tests should invoke `DEFAULT_VIEW(input, output, target)` directly or use screenshot assertions. When scaffolding tests ahead of replacing legacy widgets like `TreeOutline` or `ListControl`, routing DOM inspection through small local test helpers ensures the subsequent component swap only updates the helper definitions rather than dozens of tests, and `assertScreenshot` tests ensure visual parity independent of internal widget DOM changes.

## Examples

Bad:

```ts
const widget = new MyWidget();
renderElementIntoDOM(widget);
widget.contentElement.querySelector('devtools-button')!.click();
assert.include(widget.contentElement.textContent, 'Updated');
```

Good:

```ts
const view = createViewFunctionStub(MyWidget);
const widget = new MyWidget(undefined, view);
widget.wasShown();
view.input.onActionClick();
assert.strictEqual((await view.nextInput).statusText, 'Updated');
```
