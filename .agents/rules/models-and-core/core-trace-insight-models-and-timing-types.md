---
name: devtools/models-and-core/core-trace-insight-models-and-timing-types
rubric: correctness
severity: blocking
---

**Rule.** Enforce branded timing types (Micro, Milli) in trace models and keep types.ts and insight models free of executable or presentation logic
- **Look for**: Manual `/ 1000` or `* 1000` arithmetic on trace timestamps, executable functions placed in `models/trace/**/types.ts`, or CSS/DOM/AI markdown formatting inside `models/trace/insights/`.
- **Do not flag**: Type guard functions (`is*`) in `Trace.Types.Events` that only perform type predicate checks.

**Why.** Mixing microseconds and milliseconds causes 1000x calculation bugs across trace insights; branded types (`Types.Timing.Micro`, `Types.Timing.Milli`) and canonical conversion helpers (such as `Trace.Helpers.Timing.microToMilli` or `Platform.Timing.microSecondsToMilliSeconds`) prevent unit confusion. Placing executable functions in `types.ts` or UI/AI formatting in insight models violates trace architecture.

## Examples

Bad:

```ts
const durationMs = (event.ts + event.dur - startTs) / 1000;
// Or in models/trace/insights/types.ts:
export function computeSavings(insight: InsightModel): number { ... }
```

Good:

```ts
const durationMs = Trace.Helpers.Timing.microToMilli(
    Types.Timing.Micro(event.ts + (event.dur ?? 0) - startTs));
```
