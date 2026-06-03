# Deep Equal Symmetry Design

**Problem**

`deepEqual` is documented to require the same property set for objects, except that `actual` may have extra symbol properties. The current behavior violates that contract:

```js
samsam.deepEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, foo: undefined }); // true
```

This regression was introduced by [`3fbe355`](../../lib/deep-equal.js), `fix #251: compare props on the prototype chain (#267)`.

**Regression Source**

The 2025 prototype-chain change made two relevant edits in [`lib/deep-equal.js`](/Users/carlerik/dev/samsam/lib/deep-equal.js):

- It replaced `Object.keys(...)` with `allEnumerableKeysInProtoChain(...)` for string-key discovery.
- It removed the explicit `hasOwnProperty` guard when walking expected keys.

That combination preserved key-count checking, but stopped verifying that the enumerable string-key sets actually match. If both objects expose the same number of enumerable string keys and the `expectation` value for a missing key is `undefined`, `deepEqual` can return `true` for different property sets.

**Decision**

Keep the prototype-chain behavior from `3fbe355`, but restore symmetric comparison for enumerable string keys:

- `actual` and `expectation` must expose the same enumerable string keys across the prototype chain.
- Values for those keys must still compare with existing recursive `deepEqual` logic.
- The documented exception remains: `actual` may have extra symbol properties that are missing from `expectation`.

**Options Considered**

1. Restore pre-2025 own-property semantics.
   Rejected because it would regress the intended fix for objects such as browser `URL` instances with meaningful enumerable getters on the prototype chain.

2. Keep asymmetry and treat object comparison as a subset check.
   Rejected because it makes `deepEqual` argument-order dependent, contradicts the documentation, and overlaps with matcher semantics better handled elsewhere in Samsam/Sinon.

3. Keep prototype-chain support and explicitly verify symmetric enumerable string-key membership.
   Chosen because it fixes the regression with the smallest semantic change and matches the published contract.

**Implementation Shape**

Update object comparison in [`lib/deep-equal.js`](/Users/carlerik/dev/samsam/lib/deep-equal.js) so that, before recursive value comparison:

- enumerable string-key counts still match
- every enumerable string key found on `actual` is also enumerable on `expectation`
- every enumerable string key found on `expectation` is also enumerable on `actual`

The existing symbol handling should remain asymmetric and expectation-driven.

**Testing**

Add regression tests in [`lib/deep-equal.test.js`](/Users/carlerik/dev/samsam/lib/deep-equal.test.js) for:

- different enumerable own string-key sets with equal counts
- different enumerable prototype-chain string-key sets with equal counts
- the documented symbol exception still allowing extra symbols on `actual`

Run targeted mocha first, then full `npm test`, then `npm run lint`.

**Risk**

The main risk is accidentally tightening symbol handling and breaking the documented exception. Tests must cover that explicitly.
