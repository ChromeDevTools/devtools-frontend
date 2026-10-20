---
name: devtools/tests/test-deterministic-async-synchronization
rubric: testing
severity: blocking
---

**Rule.** Synchronize asynchronous test assertions using lifecycle promises, expectCall, or raf instead of arbitrary setTimeout delays
- **Look for**: `new Promise(r => setTimeout(r, ...))` in `.test.ts` files, synchronous DOM assertions immediately after `requestUpdate()`, or redundant `clock.tick()` calls when no fake timers are pending.
- **Do not flag**: Tests specifically verifying debounce/throttle timer expiration using `sinon.useFakeTimers()`.

**Why.** Waiting on wall-clock `setTimeout` delays or arbitrary microtask ticks makes unit tests slow and flaky under CPU contention on CI bots. Tests should await explicit widget update promises (`await widget.updateComplete`), event promises (`target.once(...)`), stub invocation helpers (`expectCall(stub)`), or `raf()`.

## Examples

Bad:

```ts
widget.data = newData;
await new Promise(resolve => setTimeout(resolve, 50));
assert.isTrue(callbackStub.calledOnce);
```

Good:

```ts
const called = expectCall(callbackStub);
widget.data = newData;
await widget.updateComplete;
await called;
```
