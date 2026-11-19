---
name: devtools/tests/test-type-safe-mocks-and-events
rubric: testing
severity: should_fix
---

**Rule.** Construct typed stubs and real DOM or event instances instead of casting fake objects with as unknown as
- **Look for**: `as unknown as` or `as any` casts on mock objects, fake DOM nodes, or synthetic events in `.test.ts` files, untyped `querySelector(...) as HTMLElement` calls, or `sinon.createStubInstance(...)` on `UI.Widget` subclasses passed into `WrapperWidget` or parent widget containers.
- **Do not flag**: Tests explicitly verifying runtime handling of malformed untrusted payloads or narrow generic type parameters inside shared `front_end/testing/` helpers.

**Why.** Casting partial object literals via `as unknown as T` or `as any` bypasses TypeScript compile-time checks, masks missing methods when interfaces evolve, and causes brittle runtime failures. Using `sinon.createStubInstance(Class)` for model or SDK classes, real DOM/Event constructors (`DataTransfer`, `ClipboardEvent`), or typed fixture helpers preserves type safety. Do not use `sinon.createStubInstance(...)` on `UI.Widget` subclasses mounted in `WrapperWidget` or parent widget containers because Sinon stubs `Widget.prototype.constraints()` to return `undefined`, which throws `TypeError: Cannot read properties of undefined (reading 'minimum')` when shown; pass a real `UI.Widget` instance instead.

## Examples

Bad:

```ts
const fakeNode = {nodeName: () => 'DIV'} as unknown as SDK.DOMModel.DOMNode;
const fakeEvent = {clipboardData: {getData: () => 'text'}} as unknown as ClipboardEvent;
```

Good:

```ts
const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
node.nodeName.returns('DIV');
const dataTransfer = new DataTransfer();
dataTransfer.setData('text/plain', 'text');
const event = new ClipboardEvent('paste', {clipboardData: dataTransfer});
```
