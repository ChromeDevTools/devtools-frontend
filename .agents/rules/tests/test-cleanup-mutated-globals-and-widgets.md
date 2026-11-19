---
name: devtools/tests/test-cleanup-mutated-globals-and-widgets
rubric: testing
severity: should_fix
---

**Rule.** Restore mutated global properties and clean up manually instantiated widgets, projects, or singletons in beforeEachWithTeardown, afterEach, or finally blocks
- **Look for**: Direct assignments to `window.*`, `globalThis.*`, `Object.prototype.*`, `localStorage.*`, or `panel.show(document.body)` in `.test.ts` files without a matching restoration, `removeInstance()`, or `detach()` in `beforeEachWithTeardown`, `afterEach`, or `finally` (or `registerTestTeardown` in Karma unit tests); `UI.UIUtils.installComponentRootStyles(document.body)` calls; `ContentProviderBasedProject` or `createContentProviderUISourceCode` / `createContentProviderUISourceCodes` added to a shared `WorkspaceImpl` without `project.removeProject()` or `workspace.removeProject(project)`; calling Karma-only `registerTestTeardown()` in Node `foundation_unittests` or `devtools_api_tests` (where `runTestTeardowns()` never runs; use `beforeEachWithTeardown()`, `afterEach`, or `finally` instead), or calling `updateHostConfig(...)` in Node `foundation_unittests` without `setupRuntimeHooks()` or explicit cleanup; tearing down shared UI singletons (`ZoomManager`, locale, settings) in a Karma suite `afterEach` before the root `afterEach` in `test_setup.ts` drains `cleanTestDOM()` and `sinon.clock.runToLast()`; or end-of-test `try { ... } finally { stub.restore(); }` blocks in Karma or Node unit tests where no assertions follow `finally`.
- **Do not flag**: Widgets mounted directly via `renderElementIntoDOM(widget)` in Karma unit tests (`front_end/testing/test_setup.ts`), which detaches widgets automatically during global harness teardown. Also do not flag `updateHostConfig(...)` calls in Karma unit tests (or paired with `setupRuntimeHooks()` in Node `foundation_unittests`), omitting manual `restore()` on `sinon.stub`, `sinon.spy`, or `sinon.useFakeTimers()` in Karma and Node unit tests (`test_setup.ts` and `test/unit/mocha-hooks.ts`; `test/api/mocha_hooks.ts` and `test/e2e/conductor/mocha_hooks.ts` run neither `resetHostConfig()` nor `sinon.restore()`), or mid-test `stub.restore()` calls followed by further assertions in the same `it()`.

**Why.** In Karma unit tests, `front_end/testing/test_setup.ts` automatically resets `hostConfig` before every test and empties the test DOM container, runs `registerTestTeardown()` callbacks, and restores Sinon stubs, spies, and fake timers after every test (while `test/unit/mocha-hooks.ts` in Node `foundation_unittests` only restores Sinon, and `test/api/mocha_hooks.ts` and `test/e2e/conductor/mocha_hooks.ts` do neither), whereas direct mutations to `window`, `globalThis`, prototypes, or `localStorage`, singleton instances, projects added to a shared `WorkspaceImpl`, and widgets or panels mounted on `document.body` persist across tests and leak listeners unless explicitly cleaned up in `beforeEachWithTeardown()`, `afterEach`, or `try...finally`. Note that `beforeEachWithTeardown()` works across all Mocha harnesses, whereas `registerTestTeardown()` is Karma-only and silently never runs in Node `foundation_unittests` or `devtools_api_tests`. Calling `UI.UIUtils.installComponentRootStyles(document.body)` also leaks `<style>` tags and classes onto the shared `document.body` for all later tests. Because suite `afterEach` hooks run before `test_setup.ts`'s root `afterEach` drains `cleanTestDOM()` and `sinon.clock.runToLast()`, tearing down shared UI singletons (`ZoomManager`, locale, settings) in a Karma suite `afterEach` crashes pending `requestUpdate()` widget renders; register shared UI singleton teardown via `beforeEachWithTeardown()` (or `registerTestTeardown()` in Karma unit tests) from `TestTeardown.js` instead.

## Examples

Bad:

```ts
it('handles custom global state', () => {
  (window as any).customFlag = true;
  const panel = MyPanel.instance({forceNew: true});
  panel.markAsRoot();
  panel.show(document.body);
  assert.isTrue(panel.isShowing());
});
```

Good:

```ts
afterEach(() => {
  delete (window as any).customFlag;
  MyPanel.removeInstance();
});
it('handles custom global state', () => {
  (window as any).customFlag = true;
  const panel = MyPanel.instance({forceNew: true});
  renderElementIntoDOM(panel);
  assert.isTrue(panel.isShowing());
});
```
