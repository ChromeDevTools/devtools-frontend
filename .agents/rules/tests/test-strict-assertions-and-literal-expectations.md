---
name: devtools/tests/test-strict-assertions-and-literal-expectations
rubric: testing
severity: blocking
---

**Rule.** Use strict Chai and Sinon assertions against literal expected values rather than assert.isNotNull on undefined-unions or conditional guards
- **Look for**: `assert.isNotNull(...)` on `container?.querySelector` / `Map.get` / `Array.find` / optional properties, `if (el) { assert... }` blocks, `assert.isTrue(spy.called)` instead of `sinon.assert.calledWith`, or assertions comparing output against production formatting helpers.
- **Do not flag**: Variables whose static return type is strictly `T | null` (and never `undefined`).

**Why.** Calling `assert.isNotNull(x)` on a value typed as `T | undefined` passes when `x` is `undefined`, silently skipping assertions. Similarly, wrapping assertions inside `if (el)` or computing expected values by calling the same production helper under test allows broken code to pass.

## Examples

Bad:

```ts
const item = list.find(x => x.id === 'a');
assert.isNotNull(item);
if (item) {
  assert.strictEqual(item.label, formatLabel('a'));
}
```

Good:

```ts
const item = list.find(x => x.id === 'a');
assert.isOk(item);
assert.strictEqual(item.label, 'Expected literal label');
```
