---
name: devtools/ui-and-widgets/ui-css-scoping-and-flex-layout
rubric: readability
severity: nit
---

**Rule.** Scope light-DOM stylesheets and align elements using flexbox or grid rather than competing margin and position offsets
- **Look for**: Unscoped generic selectors in light-DOM `.css` files (or `:host` inside `@scope` blocks instead of `:scope`), redundant `@scope to (devtools-widget > *)` wrappers on shadow-DOM (`useShadowDom: 'pure'` or `useShadowDom: true`) widgets that have no child `<devtools-widget>` elements, CSS rules combining `vertical-align`, negative `margin-top`, and pixel offsets to center icons and buttons, or `this.registerRequiredCSS(...)` or `widget.registerRequiredCSS(...)` calls in widgets migrated to Lit view functions instead of rendering `<style>${styles}</style>` inside the view template.
- **Do not flag**: Shadow DOM component stylesheets where `:host` scoping is native. `<style>${styles}</style>` interpolations of `*.css.js` default imports in Lit templates (generated `.css.js` files export plain CSS strings, not `CSSStyleSheet` objects, and `<style>${...}</style>` is the standard replacement for deprecated `registerRequiredCSS`).

**Why.** Unscoped class or tag selectors in light-DOM widget stylesheets leak across the DevTools document, while combining `vertical-align`, negative margins, and `position: relative` offsets creates brittle layouts that break under font scaling or zoom.

## Examples

Bad:

```ts
@scope to (devtools-widget > *) {
  :host { display: block; }
  .action-icon {
    vertical-align: middle;
    margin-top: -2px;
    position: relative;
    bottom: 1px;
  }
}
```
