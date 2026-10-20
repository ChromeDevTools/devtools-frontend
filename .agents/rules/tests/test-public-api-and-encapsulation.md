---
name: devtools/tests/test-public-api-and-encapsulation
rubric: testing
severity: should_fix
---

**Rule.** Exercise classes through public APIs and constructor-injected dependencies rather than accessing private members or stubbing unused singletons
- **Look for**: `@ts-expect-error` or `(obj as any).privateMethod()` calls in `.test.ts` files, `sinon.stub(Class, 'instance')` alongside `new UnderTest(mockInstance)`, or `child.shadowRoot.querySelector(...)` inside parent component tests.
- **Do not flag**: Intentional negative type tests documented with an explanatory `@ts-expect-error` comment.

**Why.** Accessing `#private` or `private` methods via `(instance as any)` or `@ts-expect-error`, piercing child component shadow roots, or stubbing `Class.instance()` when dependencies are already passed via constructor couples tests to internal implementation details.

## Examples

Bad:

```ts
sinon.stub(Model, 'instance').returns(mockModel);
const tool = new MyTool(mockModel);
// @ts-expect-error testing private helper
assert.isTrue(tool.validateInternal());
```

Good:

```ts
const tool = new MyTool(mockModel);
const result = await tool.execute();
assert.isTrue(result.isValid);
```
