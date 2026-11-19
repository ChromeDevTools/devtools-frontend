---
name: devtools/tests/test-strict-assertions-and-literal-expectations
rubric: testing
severity: blocking
---

**Rule.** Use strict Chai and Sinon assertions against literal expected values rather than assert.isNotNull on undefined-unions or conditional guards
- **Look for**: `assert.isNotNull(...)` on `container?.querySelector` / `Map.get` / `Array.find` / optional properties / array indexing (`array[i]`, `array.at(...)`), `if (el) { assert... }` blocks, `assert.isTrue(spy.called)` instead of `sinon.assert.calledWith`, assertions comparing output against production formatting helpers, or case-insensitive sorting tests whose inputs already sort identically under case-sensitive ASCII comparison (e.g. `['Alpha', 'beta']` where `'A' < 'b'` in ASCII; require inputs like `['zebra', 'alpha', 'Beta']` where ASCII and case-insensitive orders differ).
- **Do not flag**: Variables whose static return type is strictly `T | null` (and never `undefined`), excluding unchecked array indexing like `array[i]`.

**Why.** Calling `assert.isNotNull(x)` on a value typed as `T | undefined`—or on unchecked array indexing (`array[0]` has static type `T` when `noUncheckedIndexedAccess` is off yet evaluates to `undefined` at runtime on an empty array)—passes when `x` is `undefined`, silently skipping assertions; use `assert.isOk(x)` for truthy object references or `assert.exists(x)` for non-nullish primitives (`0`, `''`, `false`). Similarly, wrapping assertions inside `if (el)` or computing expected values by calling the same production helper under test allows broken code to pass.

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
