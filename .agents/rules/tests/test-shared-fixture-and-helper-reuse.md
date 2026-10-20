---
name: devtools/tests/test-shared-fixture-and-helper-reuse
rubric: testing
severity: should_fix
---

**Rule.** Reuse canonical front_end/testing helpers and beforeEach setup without mutating cached shared fixtures
- **Look for**: Custom inline network request or AIDA client mocks in `.test.ts` files, in-place mutation of `parsedTrace` objects returned by `TraceLoader`, or manual `div` container creation around `renderElementIntoDOM(widget)`.
- **Do not flag**: Specialized test helpers inside `front_end/testing/` that define the canonical factory implementations themselves.

**Why.** Duplicating mock factories (`createTarget`, `createNetworkRequest`, `mockAidaClient`, `cleanTextContent`) or mutating cached objects returned by `TraceLoader` causes cross-test state corruption and maintenance drift across the test suite.

## Examples

Bad:

```ts
const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
(parsedTrace.Meta as any).mainFrameId = 'custom-id'; // Mutates shared cached trace!
const container = document.createElement('div');
widget.show(container);
```

Good:

```ts
const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
renderElementIntoDOM(widget, {includeCommonStyles: true});
```
