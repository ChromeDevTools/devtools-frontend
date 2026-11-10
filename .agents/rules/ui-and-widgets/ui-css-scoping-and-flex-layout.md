---
name: devtools/ui-and-widgets/ui-css-scoping-and-flex-layout
rubric: readability
severity: should_fix
---

**Rule.** Scope light-DOM stylesheets with `@scope to (devtools-widget > *)` and align elements using flexbox or grid rather than competing margin and position offsets
- **Look for**: Adding files to the `@devtools/no-unscoped-light-dom-styles` `burndown` list in `eslint.config.mjs`, leaving Light DOM stylesheets without top-level `@scope to (devtools-widget > *)` blocks, `:host` inside `@scope` (which is unconditionally forbidden by `plugin/check_scope_selectors`, even with `:scope` or `&`), ancestor selectors inside `@scope` without `:scope` or `&` that receive an implicit `:scope ` descendant prefix and never match (such as `:host-context()`, `:root`, `html`, `body`, `.theme-with-dark-background`, `.platform-*`, or `.overlay-scrollbar-enabled`), injecting redundant `inspectorCommonStyles` or `textButtonStyles` into Light DOM views, injecting other shared stylesheets into Light DOM without wrapping them inline as `<style>@scope to (devtools-widget > *) { ${styles} }</style>`, relying on `(devtools-widget > *)` to stop at imperatively attached `childWidget.show(container)` legacy children, redundant `@scope to (devtools-widget > *)` wrappers on shadow-DOM (`useShadowDom: 'pure'` or `useShadowDom: true`) widgets that have no child `<devtools-widget>` elements, CSS rules combining `vertical-align`, negative `margin-top`, and pixel offsets to center icons and buttons, or `this.registerRequiredCSS(...)` or `widget.registerRequiredCSS(...)` calls in widgets migrated to Lit view functions instead of rendering `<style>${styles}</style>` inside the view template.
- **Do not flag**: Shadow DOM component stylesheets where `:host` scoping is native. `<style>${styles}</style>` interpolations of `*.css.js` default imports in Lit templates (generated `.css.js` files export plain CSS strings, not `CSSStyleSheet` objects, and `<style>${...}</style>` is the standard replacement for deprecated `registerRequiredCSS`). Removing scoped files from the `@devtools/no-unscoped-light-dom-styles` `burndown` list.

**Why.** Unscoped selectors in Light DOM stylesheets leak across the DevTools document, while `:host` is invalid in Light DOM and ancestor selectors inside `@scope` without `:scope` or `&` receive an implicit `:scope ` descendant prefix and never match. Combining `vertical-align`, negative margins, and `position: relative` offsets creates brittle layouts that break under font scaling or zoom.

## Examples

Bad:

```css
/* Unscoped Light DOM rules or dead selectors inside @scope */
.widget-container {
  display: block;
}

@scope to (devtools-widget > *) {
  /* Dead selector: :host is Shadow DOM only and never matches in @scope */
  :host {
    display: flex;
  }

  /* Dead selector: receives implicit :scope descendant prefix, so ancestor theme never matches */
  .theme-with-dark-background .item {
    color: #fff;
  }

  .action-icon {
    vertical-align: middle;
    margin-top: -2px;
    position: relative;
    bottom: 1px;
  }
}
```

Good:

```css
/* Properly scoped Light DOM stylesheet */
@scope to (devtools-widget > *) {
  :scope {
    display: flex;
    align-items: center;
  }

  .item {
    /* Use theme-aware design tokens instead of ancestor theme selectors */
    color: var(--sys-color-on-surface);
  }

  .action-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
```
