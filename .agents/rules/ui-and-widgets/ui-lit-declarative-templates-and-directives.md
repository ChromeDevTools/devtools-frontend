---
name: devtools/ui-and-widgets/ui-lit-declarative-templates-and-directives
rubric: design
severity: should_fix
---

**Rule.** Use Lit.nothing, repeat with keys, classMap/styleMap, and ifDefined in single-pass declarative templates instead of imperative DOM mutations
- **Look for**: Ternary branches returning `''` or `undefined` in `html` templates instead of `Lit.nothing`, unkeyed `.map()` on dynamic stateful lists instead of `repeat()`, `ifDefined` omissions on optional attributes, or multiple `Lit.render()` calls mutating the same container.
- **Do not flag**: Static arrays of primitive labels where item identity never reorders.

**Why.** Mutating DOM elements via `appendChild`, `classList.toggle`, or `innerHTML` alongside Lit templates, or returning `''`/`null` instead of `Lit.nothing` in conditional branches, corrupts Lit's part tracking and creates unnecessary text nodes or wrapper `<div>`s.

## Examples

Bad:

```ts
html`
  <div class="item ${isActive ? 'active' : ''}" title=${ maybeTitle || '' }>
    ${showIcon ? html`<devtools-icon name="info"></devtools-icon>` : ''}
  </div>
`
```

Good:

```ts
html`
  <div class=${classMap({item: true, active: isActive})} title=${ifDefined(maybeTitle)}>
    ${showIcon ? html`<devtools-icon name="info"></devtools-icon>` : Lit.nothing}
  </div>
`
```
