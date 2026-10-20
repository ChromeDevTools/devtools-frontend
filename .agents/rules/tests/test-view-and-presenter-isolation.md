---
name: devtools/tests/test-view-and-presenter-isolation
rubric: testing
severity: should_fix
---

**Rule.** Test presenters via createViewFunctionStub and test pure view functions directly without piercing internal DOM structures
- **Look for**: Presenter tests instantiating full DOM trees and querying shadow/child DOM selectors to simulate clicks when the widget accepts a `view` function, or view tests instantiating full presenters just to test template markup.
- **Do not flag**: Legacy widgets that have not yet separated their template rendering into a standalone `DEFAULT_VIEW` function.

**Why.** In DevTools' MVP (`UI.Widget` + `DEFAULT_VIEW`) architecture, presenter tests should follow the view stubbing conventions documented in [`docs/ui_engineering.md`](../../../docs/ui_engineering.md) by stubbing the view function with `createViewFunctionStub(Presenter)` and asserting on `await view.nextInput`, while view rendering tests should invoke `DEFAULT_VIEW(input, output, target)` directly or use screenshot assertions.

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
