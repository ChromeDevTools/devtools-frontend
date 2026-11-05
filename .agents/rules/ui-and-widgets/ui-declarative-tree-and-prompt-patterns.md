---
name: devtools/ui-and-widgets/ui-declarative-tree-and-prompt-patterns
rubric: design
severity: should_fix
---

**Rule.** Use declarative <devtools-tree> and persistent <devtools-prompt ?editing> (wrapped in a child widget inside tree rows) without widening ui/legacy Treeoutline contracts
- **Look for**: Panel or widget migrations modifying `front_end/ui/legacy/Treeoutline.ts` (`TreeViewElement` or `TreeViewTreeElement`) to accommodate legacy `TreeOutline` patterns—such as exporting `TreeViewTreeElement`, overriding `title` or `titleAsText()`, adding custom `.leading-icons` or `.trailing-icons` cloning hooks, or renaming `getInternalTreeOutlineForTest()` or `flushPendingUpdatesForTesting()` into public APIs—or leaving public `TreeOutline` getters (such as `get scriptsTree()`) on migrated presenters instead of rendering icons, labels, tooltips, and trailing actions inline inside `<li role="treeitem">` within `<devtools-tree .template=${html`<ul role="tree">...</ul>`}>` (`import '../../ui/kit/kit.js'`) and driving state via `?selected`, `?open`, `@select`, and `@expand`; duplicating `class="tree-element-title"` on inner `<span>` elements inside `<li role="treeitem">` (`TreeViewTreeElement.titleElement` already has `.tree-element-title`, causing rules like `.is-ignore-listed .tree-element-title { opacity: 40% }` to compound), or rendering an empty trailing-icons container instead of `nothing` when a row has no trailing actions; imperatively swapping `<devtools-prompt>` or `UI.InplaceEditor.startEditing` elements in and out of the DOM, subclassing `TreeElement` just to host prompt titles, keeping `UI.UIUtils.markBeingEdited` or `isBeingEdited` DOM markers on fully declarative widgets instead of presenter editing state, or setting a duplicate `aria-label` on an inner `<devtools-prompt>` when the enclosing `<li role="treeitem" aria-label=...>` already provides the accessible name; rendering `<devtools-prompt ?editing=${...}>` directly inside a `<devtools-tree>` `<li role="treeitem">` template instead of hosting it inside a small child `UI.Widget` via `${widget(RowPromptWidget, {...})}` (`<devtools-tree>` clones `<template>` nodes into shadow DOM and `TreeViewTreeElement.refresh()` re-clones and refocuses the `<li>` on any light-DOM mutation, immediately blurring and cancelling the active prompt when `?editing` toggles); or custom elements inside `<devtools-tree>` rows whose state updates via JS properties (`.data`) without overriding `cloneNode(deep)` to copy that state and reflecting dynamic state via a DOM attribute (such as `data-badge=${...}`) so `<devtools-tree>`'s `MutationObserver` refreshes the shadow clone.
- **Do not flag**: Unit tests or `front_end/legacy_test_runner/**` helpers calling `getInternalTreeOutlineForTest()` or `flushPendingUpdatesForTesting()` on `<devtools-tree>` for test inspection or synchronization. Explicitly scoped intermediate CLs (`Bug: <id>`) in a multi-CL migration that introduce persistent `<devtools-prompt ?editing>` on plain `UI.TreeOutline.TreeElement` rows (temporarily retaining `UI.UIUtils.markBeingEdited`) ahead of replacing `TreeOutline` with `<devtools-tree>`.

**Why.** Preserving `<devtools-tree>`'s declarative contract (`?selected`, `?open`, `@select`, `@expand`) prevents leaking legacy imperative `TreeOutline` internals across module boundaries. Keeping `<devtools-prompt ?editing>` persistently mounted in the template avoids disruptive DOM swapping and focus loss, while isolating editable prompts inside a child `UI.Widget` within `<devtools-tree>` prevents `MutationObserver` light-DOM re-clones from refocusing the `<li>` and blurring the active input. Omitting redundant `aria-label`s on inner prompts preserves accessible tree names without duplicate screen-reader announcements.

## Examples

Bad:

```ts
// Exposing legacy TreeOutline getters and rendering prompt directly in tree row
export class MyTreeView extends UI.Widget.VBox {
  get scriptsTree(): UI.TreeOutline.TreeOutline {
    return this.#tree;
  }
}

const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html`
    <devtools-tree .template=${html`
      <ul role="tree">
        <li role="treeitem" aria-label=${input.label}>
          <span class="tree-element-title">
            <devtools-prompt
              aria-label=${input.label}
              value=${input.title}
              ?editing=${input.isEditing}>
              ${input.title}
            </devtools-prompt>
          </span>
        </li>
      </ul>
    `}></devtools-tree>
  `, target);
};
```

Good:

```ts
const {widget} = UI.Widget;

const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html`
    <devtools-tree autofocus .template=${html`
      <ul role="tree">
        <li role="treeitem" ?selected=${input.isSelected} ?open=${input.isOpen} aria-label=${input.label}>
          ${widget(RowPromptWidget, {title: input.title, isEditing: input.isEditing})}
        </li>
      </ul>
    `}></devtools-tree>
  `, target);
};
```
