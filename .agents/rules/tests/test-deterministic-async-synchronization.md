---
name: devtools/tests/test-deterministic-async-synchronization
rubric: testing
severity: blocking
---

**Rule.** Synchronize asynchronous test assertions using lifecycle promises, expectCall, or raf instead of arbitrary setTimeout delays
- **Look for**: `new Promise(r => setTimeout(r, ...))` in `.test.ts` files, synchronous DOM assertions immediately after `requestUpdate()`, redundant `clock.tick()` calls when no fake timers are pending, or restoring `sinon.useFakeTimers()` (`clock.restore()`) immediately after `clock.tick(...)` before scheduled fake-rAF widget updates (`+16ms`) flush.
- **Do not flag**: Tests specifically verifying debounce/throttle timer expiration using `sinon.useFakeTimers()`.

**Why.** Waiting on wall-clock `setTimeout` delays or arbitrary microtask ticks makes unit tests slow and flaky under CPU contention on CI bots. Tests should await explicit widget update promises (`await widget.updateComplete`, `await UI.Widget.Widget.allUpdatesComplete`), presenter view updates (`await view.nextInput`), event promises (`emitter.once(...)` on `Common.ObjectWrapper`, or `getEventPromise(element, eventName)` from `DOMHelpers.js` for DOM events), stub invocation helpers (`expectCall(stub)`), or animation frame helpers (`await raf()`, `await doubleRaf()`). Under `sinon.useFakeTimers()`, `requestUpdate()` schedules rendering on fake `requestAnimationFrame` (`+16ms`), so calling `clock.restore()` before advancing past that frame orphans the pending widget update.

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
