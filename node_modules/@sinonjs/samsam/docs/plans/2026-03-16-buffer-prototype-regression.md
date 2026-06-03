# Buffer Prototype Regression Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore `samsam.deepEqual` for equal `Buffer` instances without regressing the prototype-enumerable-property support added for URL-like objects.

**Architecture:** Keep prototype-chain enumerable key comparison for object-like values that rely on inherited enumerable getters, but preserve own-key semantics for array-like values such as `Buffer` and typed arrays. The fix should be limited to how `deepEqual` chooses string keys and how it verifies key presence before recursing.

**Tech Stack:** Node.js, Mocha, `@sinonjs/referee`

---

### Task 1: Capture the Regression

**Files:**

- Modify: `lib/deep-equal.test.js`
- Test: `lib/deep-equal.test.js`

**Step 1: Keep the failing regression test**

```js
it("returns true for buffers with identical content", function () {
    var checkDeep = samsam.deepEqual(
        Buffer.from("Hello"),
        Buffer.from("Hello"),
    );
    assert.isTrue(checkDeep);
});
```

**Step 2: Run test to verify it fails**

Run: `npx mocha ./lib/deep-equal.test.js --grep "returns true for buffers with identical content"`

Expected: FAIL with `Expected false to be true`

**Step 3: Commit**

```bash
git add lib/deep-equal.test.js
git commit -m "test: add buffer regression for deepEqual"
```

### Task 2: Narrow Prototype-Chain Key Comparison

**Files:**

- Modify: `lib/deep-equal.js`
- Test: `lib/deep-equal.test.js`

**Step 1: Add a key-selection helper**

```js
var objectProto = require("@sinonjs/commons").prototypes.object;
var hasOwnProperty = objectProto.hasOwnProperty;
var keys = Object.keys;

function shouldComparePrototypeEnumerableKeys(object) {
    return !isArrayType(object) && !isArguments(object);
}

function getEnumerableStringKeys(object) {
    // Buffers and typed arrays can expose inherited enumerable accessors like
    // `offset`; those reflect slab allocation state, not logical content.
    return shouldComparePrototypeEnumerableKeys(object)
        ? allEnumerableKeysInProtoChain(object)
        : keys(object);
}
```

**Step 2: Use the helper when building key lists**

```js
var actualKeys = getEnumerableStringKeys(actualObj);
var expectationKeys = getEnumerableStringKeys(expectationObj);
```

**Step 3: Restore explicit key-presence checks before comparing values**

```js
return every(expectationKeysAndSymbols, function (key) {
    if (typeof key === "string") {
        if (indexOf(actualKeys, key) === -1) {
            return false;
        }
    } else if (!hasOwnProperty(actualObj, key)) {
        return false;
    }

    var actualValue = actualObj[key];
    var expectationValue = expectationObj[key];
    // existing recursion logic stays unchanged
});
```

**Step 4: Run the regression test to verify it passes**

Run: `npx mocha ./lib/deep-equal.test.js --grep "returns true for buffers with identical content"`

Expected: PASS

**Step 5: Run the nearby coverage for prototype and array behavior**

Run: `npm test -- --grep "prototype|typed array|buffers with identical content"`

Expected: PASS with the URL/prototype tests still green

**Step 6: Commit**

```bash
git add lib/deep-equal.js lib/deep-equal.test.js
git commit -m "fix: avoid buffer regressions in deepEqual"
```

Commit body:

```text
The prototype-chain comparison added in 3fbe355d19bdaf9be1d5911dde8619eedac3a99e
made deepEqual read inherited enumerable Buffer accessors such as `offset`.

Two Buffer instances with identical bytes can still have different `offset`
values because small Buffers are often views into different positions in the
same pooled backing store. That offset is allocator metadata, not part of the
logical buffer value.

Keep prototype enumerable-key support for URL-like objects, but use own
enumerable keys for array-like values so Buffer equality stays content-based.
```
