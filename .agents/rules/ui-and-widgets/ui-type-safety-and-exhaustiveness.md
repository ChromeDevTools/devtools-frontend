---
name: devtools/ui-and-widgets/ui-type-safety-and-exhaustiveness
rubric: design
severity: should_fix
---

**Rule.** Model multi-state UI workflows with discriminated unions, Platform.assertNever exhaustiveness checks, and strict domain types
- **Look for**: `switch` statements over union/enum types missing `Platform.assertNever(x, message)` in `default:`, `any` or `declare` field modifiers in UI classes, multiple boolean flags (`isLoading`, `isError`, `isEmpty`) representing mutually exclusive states, or leaving `this.#fn = this.#fn.bind(this)` in constructors when converting methods to ECMAScript `#private` (`@devtools/prefer-private-class-members`; private methods are not writable, so use arrow class fields `#fn = (): void => { ... }` instead).
- **Do not flag**: Switch statements that intentionally handle only a small subset of a large external protocol enum, `switch` statements over untrusted persisted strings where `default:` falls back safely, `switch` statements where every `case` returns under an explicit function return type, or orthogonal (independently combinable) boolean properties (`disabled`, `hidden`, `selected`, `expanded`, `editing`).

**Why.** Representing mutually exclusive UI states with loose optional boolean flags or `any` types permits impossible states and silently misses new enum variants. Discriminated unions paired with `Platform.assertNever` in `default:` branches enforce compile-time exhaustiveness.

## Examples

Bad:

```ts
switch (state.type) {
  case StateType.LOADING:
    return renderLoading();
  case StateType.LOADED:
    return renderData(state.data);
}
```

Good:

```ts
switch (state.type) {
  case StateType.LOADING:
    return renderLoading();
  case StateType.LOADED:
    return renderData(state.data);
  default:
    Platform.assertNever(state, `Unhandled state: ${JSON.stringify(state)}`);
}
```
