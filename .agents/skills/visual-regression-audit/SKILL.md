---
name: visual-regression-audit
description: >-
  Audits UI Engineering Vision migrations, CSS @scope conversions, widget
  refactorings, and UI layout or styling changes for visual, layout, and
  interaction regressions before merge. Use when reviewing changes touching
  front_end/(panels|ui)/**/*.{ts,css} or whenever a CL changes UI layout or
  rendered appearance.
---

# Visual & Interaction Regression Audit

Apply this checklist whenever a CL migrates imperative DOM to `UI.Widget` +
`lit-html`, wraps Light DOM styles in `@scope`, swaps `TreeOutline`,
`DataGrid`, `ListControl`, or `ListWidget` to declarative components, or
whenever a CL changes UI layout, styling, or rendered appearance.

## 1. Screenshot Golden Gate (`assertScreenshot`)

- **Require visual baselines on layout-affecting diffs:** Flag any CL that
  wraps a `.css` file in `@scope to (devtools-widget > *)`, promotes a class to
  `UI.Widget`, swaps a legacy tree/grid/list widget, or otherwise changes UI
  layout or styling without either existing or newly added
  `assertScreenshot(...)` tests covering its non-empty rendered state (and dark
  mode or overflow state when styling colors/scrollbars). Check sibling
  `*.test.ts` files before flagging standalone CSS CLs whose existing
  `assertScreenshot(...)` tests are not modified in the diff.
- **Do not flag** pure Pass 0.5 `#private`/dead-code prefactors, presenter-only
  logic moves that leave DOM structure and CSS untouched, or removals of
  provably unreferenced CSS selectors or files (which touch CSS without
  changing rendered appearance).

## 2. Flex, Sizing, and Overflow Clipping (`<devtools-widget>` & Popovers)

- **Host vs. `contentElement` classes:** When removing `super(..., {classes})`
  or imperative `this.element.classList.add(...)`, verify every layout class
  (`vbox`, `hbox`, `flex-auto`, `overflow-auto`, custom root classes) moved to
  `render(..., target, {container: {classes: [...]}})` (or `:scope` in CSS).
  Dropping `vbox` or `min-height: 0` on a flex child collapses height to `0` or
  clips scrollbars (e.g. popover and sidebar panes). Also check two manual
  `@devtools/no-widget-constructor-classes` traps:
  - **`useShadowDom: true` vs. `'pure'`:** Under `useShadowDom: true` (unlike
    Light DOM or `useShadowDom: 'pure'`), `this.contentElement` is an inner
    `<div>` inside the shadow root while `Widget` adds `vbox flex-auto` to
    `this.element`. Moving host classes (such as `flex-none`) to
    `render(..., target, {container: {classes}})` without switching to
    `useShadowDom: 'pure'` applies them to the inner `<div>` instead of the
    host element.
  - **Multi-branch `render(..., target)` views:** Every `render(..., target)`
    branch in a view function must pass `{container: {classes: [...]}}`, or
    `render()` will strip those classes when switching branches/states.
- **`WrapperWidget` uses `display: contents`:** Flag any width, height, flex,
  overflow, border, or background styling placed on a `<devtools-widget>` host
  that mounts `UI.Widget.WrapperWidget`. Wrap it in a sized `<div>` instead.
- **`<devtools-tree>` overflow:** Check `?hide-overflow` vs. scrollable parent
  containers so horizontal/vertical scrollbars are neither double-rendered nor
  clipped at container edges.

## 3. `<devtools-tree>` Parity Traps (Top Source of M152/M156 Regressions)

- **Event name is `@expand`, never `@expanded`:** `TreeViewElement` dispatches
  `new ExpandEvent(...)` with type `'expand'` (`e.detail.expanded`,
  `e.detail.recursively`). Flag any `@expanded=${...}` listener on
  `<li role="treeitem">` as a dead handler that silently drops expansion state.
- **Lazy child population & `ifExpanded`:** When migrating recursive trees
  (`DOMTreeWidget`, `ObjectTree`, `NavigatorView`), verify expanding a parent
  populates child data *and* triggers `requestUpdate()`, and verify initial
  root/default-open nodes render their children on first paint.
- **Context menus (`@contextmenu`):** Verify every legacy
  `appendApplicableItems` / `treeElement.oncontextmenu` path (such as *Reveal
  in Elements*, *Copy value*, *Expand recursively*) is wired on the migrated
  `<li role="treeitem">` or root container, and check `event.target` assumptions
  across `<devtools-tree>`'s shadow clone boundary.
- **Keyboard `@select` vs. mouse `@click`:** Ensure arrow-key navigation
  triggers the same preview/highlight side effects (e.g. DOM node overlay
  highlight) as clicking the row, respecting `e.detail.selectedByUser`.
- **Inline text selection & editing:** Check that `user-select` rules inside
  tree rows still allow partial token selection where expected, and keep
  editable `<devtools-prompt ?editing>` inside a child `${widget(...)}` so
  attribute mutations do not re-clone the row and blur focus.

## 4. `@scope` Visual Parity Checks

- Verify `@scope` wrapping is landed in a standalone CSS CL rather than mixed
  with template or widget-promotion changes.
- Check removed selectors for layout side effects on legacy imperative child
  widgets (`childWidget.show(container)` renders `<div class="widget">`, which
  is *not* stopped by the `(devtools-widget > *)` lower boundary).
