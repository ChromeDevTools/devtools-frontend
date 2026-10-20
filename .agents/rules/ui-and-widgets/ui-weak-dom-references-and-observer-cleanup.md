---
name: devtools/ui-and-widgets/ui-weak-dom-references-and-observer-cleanup
rubric: design
severity: should_fix
---

**Rule.** Store DOM node metadata in WeakMap or WeakRef collections and clean up observers when elements detach
- **Look for**: Strong `Map<Element, ...>` / `Set<Element>` collections holding DOM/model associations, `WeakMap` values retaining strong references back to their DOM keys, `ResizeObserver`/`IntersectionObserver` without `.unobserve()`/`.disconnect()` on teardown, or `ref(el => ...)` callbacks that do not handle `el === undefined`.
- **Do not flag**: Module-level `WeakMap<Element, ...>` globals whose values do not strongly reference the key, or short-lived local maps created and discarded within a single synchronous function call.

**Why.** Retaining DOM `Element` or `SDK.Target` references in strong `Map`/`Set` collections (or in `WeakMap` values that hold strong references back to their keys) prevents detached DOM trees from being garbage-collected, while leaving `ResizeObserver`, `MutationObserver`, or `Lit.Directives.ref` callbacks active after unmount leaks memory.

## Examples

Bad:

```ts
const elementState = new Map<HTMLElement, State>();
// Or in Lit template:
html`<div ${ref(el => { this.#el = el as HTMLElement; })}></div>`
```

Good:

```ts
readonly #elementState = new WeakMap<HTMLElement, State>();
// In Lit template, handle undefined when element detaches:
html`<div ${ref(el => { this.#el = el instanceof HTMLElement ? el : undefined; })}></div>`
```
