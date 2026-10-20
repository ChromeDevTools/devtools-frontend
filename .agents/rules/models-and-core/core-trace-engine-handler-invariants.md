---
name: devtools/models-and-core/core-trace-engine-handler-invariants
rubric: correctness
severity: blocking
---

**Rule.** Normalize and precompute trace events in handler finalize passes using Types.Events.is* guards while keeping raw events immutable
- **Look for**: In-place property mutation of raw trace events, repeated full-trace `.filter()` scans inside insight calculators instead of handler precomputation, or ad-hoc property checks instead of `Types.Events.is*` (or `Trace.Types.Events.is*`) type guards.
- **Do not flag**: Constructing new synthetic trace event objects owned by the handler during `finalize()`.

**Why.** Trace handlers (`front_end/models/trace/handlers/`) must normalize synthetic event fields, validate bounds, and group events once during `finalize()` so downstream insights and UI tracks do not repeatedly filter the raw trace array or mutate raw trace event objects.

## Examples

Bad:

```ts
export function generateInsight(events: readonly Types.Events.Event[]) {
  for (const event of events) {
    (event as any).args.normalized = true; // Mutates raw trace event!
  }
}
```

Good:

```ts
// In handler finalize(): precompute and store in handler state without mutating raw events
if (Types.Events.isTraceEventNavigationStart(event)) {
  navigations.push(createSyntheticNavigation(event));
}
```
