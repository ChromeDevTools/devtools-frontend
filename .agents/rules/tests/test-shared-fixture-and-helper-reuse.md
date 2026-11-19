---
name: devtools/tests/test-shared-fixture-and-helper-reuse
rubric: testing
severity: should_fix
---

**Rule.** Reuse canonical front_end/testing helpers and beforeEach setup without mutating cached shared fixtures
- **Look for**: Custom inline network request or AIDA client mocks in `.test.ts` files, in-place mutation of `parsedTrace` objects returned by `TraceLoader`, manual `div` container creation around `renderElementIntoDOM` or `widget.show(div)` instead of `renderElementIntoDOM(widget)`, inline `component.shadowRoot!.querySelector(...)` plus `assert.instanceOf` on the component under test instead of `getElementWithinComponent`, `getElementsWithinComponent`, and `assertElements`, or `assertScreenshot` fixed container heights exceeding `600` px (or `>= 500` px on compact leaf views where `<= 400` px such as `{width: 600, height: 400}` fits).
- **Do not flag**: Specialized test helpers inside `front_end/testing/` that define the canonical factory implementations themselves. Also do not flag `{width: 800, height: 600}` container dimensions on full-panel, split-view, or `RootView` screenshot tests; direct `DEFAULT_VIEW(input, output, target)` calls rendering into `renderElementIntoDOM(document.createElement('div'), ...)` (or `renderElementIntoDOM(new UI.Widget.VBox()).contentElement` when the view hosts child widgets); `new MyWidget(document.createElement('devtools-widget'))` when testing Light DOM widgets styled with `@scope (devtools-widget)`; or commented `renderElementIntoDOM(document.createElement('div'), {includeCommonStyles: true})` calls that inject common styles for `document.body` UI.

**Why.** Duplicating mock or DOM helpers (`createTarget`, `createNetworkRequest`, `mockAidaClient`, `cleanTextContent`, `renderElementIntoDOM`, `getElementWithinComponent`, `getElementsWithinComponent`, `assertElements`) or mutating cached objects returned by `TraceLoader` causes cross-test state corruption and maintenance drift across the test suite. Karma runs unit tests inside an `<iframe id="context">` below Karma's header banner in a `1280x768` window (`test/unit/karma.conf.ts`), so keeping compact view screenshot heights `<= 400` px (such as `{width: 600, height: 400}`) and full-panel screenshot heights `<= 600` px avoids overflowing the visible iframe viewport or capturing unintended vertical scrollbars.

## Examples

Bad:

```ts
const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
(parsedTrace.data.Meta as any).mainFrameId = 'custom-id'; // Mutates shared cached trace!
const container = document.createElement('div');
widget.markAsRoot();
widget.show(container);
```

Good:

```ts
const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
renderElementIntoDOM(widget, {includeCommonStyles: true});
```
