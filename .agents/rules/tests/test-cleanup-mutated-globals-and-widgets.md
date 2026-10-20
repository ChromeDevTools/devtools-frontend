---
name: devtools/tests/test-cleanup-mutated-globals-and-widgets
rubric: testing
severity: should_fix
---

**Rule.** Restore mutated global properties and detach manually instantiated widgets or singletons in afterEach or finally blocks
- **Look for**: Direct assignments to `window.*`, `globalThis.*`, `Object.prototype.*`, `localStorage.*`, or `panel.show(document.body)` in `.test.ts` files without a matching restoration or `detach()` in `afterEach` or `finally`.
- **Do not flag**: Widgets mounted directly via `renderElementIntoDOM(widget)`, which detaches widgets automatically during global harness teardown.

**Why.** While Sinon stubs are restored automatically, direct mutations to `window`, `globalThis`, prototypes, or `localStorage`, as well as widgets and panels instantiated with `.markAsRoot()` or `show()`, persist across tests and leak listeners unless explicitly cleaned up in `afterEach` or `try...finally`.

## Examples

Bad:

```ts
it('handles custom global state', () => {
  (window as any).customFlag = true;
  const panel = Panel.instance({forceNew: true});
  panel.markAsRoot();
  panel.show(document.body);
  assert.isTrue(panel.isShowing());
});
```

Good:

```ts
afterEach(() => {
  delete (window as any).customFlag;
  panel?.detach();
});
it('handles custom global state', () => {
  (window as any).customFlag = true;
  panel = Panel.instance({forceNew: true});
  renderElementIntoDOM(panel);
  assert.isTrue(panel.isShowing());
});
```
