---
name: devtools/ui-and-widgets/ui-accessibility-and-semantic-html
rubric: design
severity: should_fix
---

**Rule.** Use native semantic HTML controls with accurate ARIA attributes, keyboard handlers, and !event.isComposing guards
- **Look for**: `@click` on `<div>`/`<span>` without button semantics, `<button>` nested inside `<button>`/`<a>`/`<devtools-link>`, `<devtools-button>` elements using HTML `aria-label` or dynamic HTML `title=${...}` attributes instead of `.accessibleLabel=${...}` / `.title=${...}` JS properties (`<devtools-button>` sets `role="presentation"` on its host and only re-renders `title` via its `.title` setter), icon-only `<devtools-button>` elements missing both `.accessibleLabel=${...}` and `.title=${...}` (`.buttonTitle` alone leaves the inner shadow `<button>` without `aria-label`), `Enter` keydown handlers missing `!event.isComposing`, `aria-describedby` pointing to interactive `<devtools-tooltip>` elements, or declarative replacements for `UI.ListControl` missing container `role="listbox"` (or `role="menu"`) with `tabindex="-1"`, item `role="option"` with `aria-selected` / `aria-activedescendant`, or `ArrowUp`/`ArrowDown`/`Home`/`End` keyboard navigation.
- **Do not flag**: Delegating click listeners on container elements that handle bubbled events from child buttons. Rendering `<tr>` rows directly into `this.affectedResources` (`<table class="affected-resource-list">`) in `AffectedResourcesView` subclasses without a `<tbody>` wrapper (`AffectedResourcesView` creates the `<table>` container without a `<tbody>` and subclasses render `<tr>` rows directly into `this.affectedResources`). Inner `<devtools-prompt>` elements omitting `aria-label` when enclosed inside `<li role="treeitem" aria-label=...>`.

**Why.** Clickable `<div>`/`<span>` elements and nested interactive controls (`<button>` inside `<a>`, `<devtools-link>`, or `<button>`) break keyboard navigation and screen readers. Interactive elements require semantic tags (`<button>`, `<details>`/`<summary>`, `<thead>`/`<tbody>`), accurate widget property bindings (`.accessibleLabel` or `.title` on `<devtools-button>`), synchronized ARIA roles and keyboard navigation (`listbox`/`option` roving navigation when replacing `UI.ListControl`, `aria-expanded`, `aria-details` for rich tooltips vs `aria-describedby` for plain text), and `!event.isComposing` checks on `Enter` keydown handlers.

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
