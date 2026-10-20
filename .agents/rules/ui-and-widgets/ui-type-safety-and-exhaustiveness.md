---
name: devtools/ui-and-widgets/ui-type-safety-and-exhaustiveness
rubric: design
severity: should_fix
---

**Rule.** Model multi-state UI workflows with discriminated unions, Platform.assertNever exhaustiveness checks, and strict domain types
- **Look for**: `switch` statements over union/enum types missing `Platform.assertNever(x)` in `default:`, `any` or `declare` field modifiers in UI classes, or multiple boolean flags (`isLoading`, `isError`, `isEmpty`) representing mutually exclusive states.
- **Do not flag**: Switch statements that intentionally handle only a small subset of a large external protocol enum.

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
