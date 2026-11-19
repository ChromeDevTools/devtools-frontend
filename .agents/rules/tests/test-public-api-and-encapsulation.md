---
name: devtools/tests/test-public-api-and-encapsulation
rubric: testing
severity: should_fix
---

**Rule.** Exercise classes through public APIs and constructor-injected dependencies rather than accessing private members or stubbing unused singletons
- **Look for**: `@ts-expect-error` or `(obj as any).privateMethod()` calls in `.test.ts` files, `sinon.stub(Class, 'instance')` alongside `new UnderTest(mockInstance)`, `child.shadowRoot.querySelector(...)` or `getElementWithinComponent(childComponent, ...)` / `getElementsWithinComponent(childComponent, ...)` calls on child custom elements (such as `devtools-button`) inside parent component tests, or new `*ForTest` DOM-element getters on sidebar panes or UI classes.
- **Do not flag**: Intentional negative type tests documented with an explanatory `@ts-expect-error` comment.

**Why.** Accessing `private` or `protected` members via `(instance as any)` or `@ts-expect-error`, piercing child component shadow roots, or stubbing `Class.instance()` when dependencies are already passed via constructor couples tests to internal implementation details. Instead of piercing a child custom element's shadow DOM, add a public getter next to the child component's setter (for example, `button.variant` or `button.iconName`) and assert on that property. Instead of adding `*ForTest` DOM getters on sidebar panes or UI classes, exercise the public view or toolbar API—for example, call `render(pane.toolbarItems(), container)` (or `render(await view.toolbarItems(), container)` for `UI.View.View` subclasses) in the test and query the rendered container.

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
