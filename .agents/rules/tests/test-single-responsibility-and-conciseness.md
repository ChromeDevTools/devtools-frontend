---
name: devtools/tests/test-single-responsibility-and-conciseness
rubric: testing
severity: should_fix
---

**Rule.** Keep each it() block focused on a single behavior and prune duplicate or obsolete tests when features change
- **Look for**: `it('... and ...')` blocks testing multiple orthogonal interactions sequentially, nested `{ ... }` scope blocks inside a single `it()`, or identical test cases duplicated across `describe` blocks.
- **Do not flag**: Multi-step stateful workflow tests where earlier steps are required preconditions to reach the state under test.

**Why.** Combining multiple independent user interactions or feature scenarios into a single monolithic `it()` block obscures failure root causes, while leaving duplicate or orphaned tests behind increases suite runtime and maintenance burden.

## Examples

Bad:

```ts
it('toggles setting on/off and expands details card', async () => {
  toggleSetting();
  assert.isTrue(setting.get());
  expandCard();
  assert.isTrue(card.expanded);
});
```

Good:

```ts
it('toggles setting on and off', () => {
  toggleSetting();
  assert.isTrue(setting.get());
});
it('expands details card when clicked', () => {
  expandCard();
  assert.isTrue(card.expanded);
});
```
