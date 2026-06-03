# Deep Equal Symmetry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore symmetric enumerable string-key comparison in `deepEqual` without regressing prototype-chain support or the documented exception for extra symbol properties on `actual`.

**Architecture:** Keep the object-comparison flow in `lib/deep-equal.js`, but add an explicit enumerable string-key membership check so equal key counts are not treated as equal key sets. Preserve the prototype-chain enumeration introduced in `3fbe355` and leave symbol handling expectation-driven.

**Tech Stack:** Node.js, Mocha, ESLint, Samsam internals

---

### Task 1: Add Regression Tests For Symmetric Enumerable String Keys

**Files:**

- Modify: `lib/deep-equal.test.js`
- Test: `lib/deep-equal.test.js`

**Step 1: Write the failing tests**

Add tests that assert:

```js
assert.isFalse(
    samsam.deepEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, foo: undefined }),
);
```

Add one prototype-chain variant with different enumerable getter names but equal enumerable key counts, and one symbol test proving this still passes:

```js
var symbol = Symbol("extra");
var actual = { a: 1 };
actual[symbol] = 2;
assert.isTrue(samsam.deepEqual(actual, { a: 1 }));
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --grep "deepEqual"`

Expected: FAIL on the new same-count/different-key regression case.

**Step 3: Commit**

```bash
git add lib/deep-equal.test.js
git commit -m "test: cover deepEqual key symmetry regression"
```

### Task 2: Restore Symmetric Enumerable String-Key Membership Checks

**Files:**

- Modify: `lib/deep-equal.js`
- Test: `lib/deep-equal.test.js`

**Step 1: Write the minimal implementation**

In `lib/deep-equal.js`, add a small helper or inline check that verifies enumerable string-key membership in both directions before descending into value comparison. Keep:

- `allEnumerableKeysInProtoChain(...)`
- existing recursion/cycle tracking
- expectation-only symbol traversal

The implementation should reject objects when an enumerable string key exists on one side but not the other, even if the total key counts match.

**Step 2: Run targeted tests**

Run: `npm test -- --grep "deepEqual"`

Expected: PASS for the new regression tests and existing `deepEqual` coverage.

**Step 3: Commit**

```bash
git add lib/deep-equal.js lib/deep-equal.test.js
git commit -m "fix: restore deepEqual key symmetry"
```

### Task 3: Verify The Fix Against Project Standards

**Files:**

- Verify: `lib/deep-equal.js`
- Verify: `lib/deep-equal.test.js`

**Step 1: Run the full test suite**

Run: `npm test`

Expected: PASS

**Step 2: Run lint**

Run: `npm run lint`

Expected: PASS

**Step 3: Optional coverage confidence**

Run: `npm run test-check-coverage`

Expected: PASS with 100% thresholds intact

**Step 4: Commit verification state**

```bash
git add lib/deep-equal.js lib/deep-equal.test.js
git commit -m "chore: verify deepEqual symmetry fix"
```

### Task 4: Prepare Release Notes Context

**Files:**

- Review: `CHANGES.md`
- Review: `docs/index.md`

**Step 1: Confirm docs stay accurate**

Verify that `docs/index.md` already matches the intended behavior and does not need edits.

**Step 2: Decide whether to add a changelog entry**

If the project wants bug-fix release notes before cutting a release, add a short note describing:

- regression introduced by prototype-chain comparison change
- restored symmetric enumerable string-key equality
- no change to the extra-symbol exception on `actual`

**Step 3: Commit if documentation changes are needed**

```bash
git add CHANGES.md docs/index.md
git commit -m "docs: note deepEqual symmetry fix"
```
