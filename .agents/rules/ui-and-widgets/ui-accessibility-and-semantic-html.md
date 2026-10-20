---
name: devtools/ui-and-widgets/ui-accessibility-and-semantic-html
rubric: design
severity: should_fix
---

**Rule.** Use native semantic HTML controls with accurate ARIA attributes, keyboard handlers, and !event.isComposing guards
- **Look for**: `@click` on `<div>`/`<span>` without button semantics, `<button>` nested inside `<button>`/`<x-link>`, `Enter` keydown handlers missing `!event.isComposing`, or `aria-describedby` pointing to interactive `<devtools-tooltip>` elements.
- **Do not flag**: Delegating click listeners on container elements that handle bubbled events from child buttons.

**Why.** Clickable `<div>`/`<span>` elements and nested interactive controls (`<button>` inside `<a>` or `<button>`) break keyboard navigation and screen readers. Interactive elements require semantic tags (`<button>`, `<details>`/`<summary>`, `<thead>`/`<tbody>`), synchronized ARIA state (`aria-expanded`, `aria-details` for rich tooltips vs `aria-describedby` for plain text), and `!event.isComposing` checks on `Enter` keydown handlers.

## Examples

Bad:

```ts
html`
  <div class="custom-btn" @click=${onSubmit}>Submit</div>
  <textarea @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && onSubmit()}></textarea>
`
```

Good:

```ts
html`
  <devtools-button @click=${onSubmit}>Submit</devtools-button>
  <textarea aria-label=${i18nString(UIStrings.prompt)}
    @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && !e.isComposing && onSubmit()}></textarea>
`
```
