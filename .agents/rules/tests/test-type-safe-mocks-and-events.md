---
name: devtools/tests/test-type-safe-mocks-and-events
rubric: testing
severity: should_fix
---

**Rule.** Construct typed stubs and real DOM or event instances instead of casting fake objects with as unknown as
- **Look for**: `as unknown as` or `as any` casts on mock objects, fake DOM nodes, or synthetic events in `.test.ts` files, or untyped `querySelector(...) as HTMLElement` calls.
- **Do not flag**: Tests explicitly verifying runtime handling of malformed untrusted payloads or narrow generic type parameters inside shared `front_end/testing/` helpers.

**Why.** Casting partial object literals via `as unknown as T` or `as any` bypasses TypeScript compile-time checks, masks missing methods when interfaces evolve, and causes brittle runtime failures. Using `sinon.createStubInstance(Class)`, real DOM/Event constructors (`DataTransfer`, `ClipboardEvent`), or typed fixture helpers preserves type safety.

## Examples

Bad:

```ts
const fakeNode = {securityOrigin: () => 'https://example.com'} as unknown as SDK.DOMModel.DOMNode;
const fakeEvent = {clipboardData: {getData: () => 'text'}} as unknown as ClipboardEvent;
```

Good:

```ts
const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
node.securityOrigin.returns('https://example.com');
const dataTransfer = new DataTransfer();
dataTransfer.setData('text/plain', 'text');
const event = new ClipboardEvent('paste', {clipboardData: dataTransfer});
```
