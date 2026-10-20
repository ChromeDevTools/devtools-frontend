---
name: devtools/ui-and-widgets/ui-performance-and-flamechart-rendering
rubric: design
severity: should_fix
---

**Rule.** Precompute expensive metrics outside render loops, use Set/Map for O(1) lookups, and debounce high-frequency UI updates
- **Look for**: `.includes()` / `.find()` / `.sort()` inside canvas draw or event iteration loops, repeated `ResizeObserver` registrations on individual child items instead of the parent container, or un-debounced filter/mutation handlers.
- **Do not flag**: One-time initialization passes over bounded small arrays (less than 20 items).

**Why.** Performing linear `Array.includes`/`find` scans, sorting, or regex parsing inside FlameChart canvas draw loops, `ElementsTreeOutline` mutation callbacks, or Lit render passes causes frame drops and UI jank on large traces and DOM trees.

## Examples

Bad:

```ts
for (const entry of traceEntries) {
  if (allowedTypesArray.includes(entry.name) && Root.Runtime.experiments.isEnabled('exp')) {
    drawEntry(entry);
  }
}
```

Good:

```ts
const isExpEnabled = Root.Runtime.experiments.isEnabled('exp');
for (const entry of traceEntries) {
  if (isExpEnabled && ALLOWED_TYPES_SET.has(entry.name)) {
    drawEntry(entry);
  }
}
```
