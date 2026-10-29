---
name: devtools/ui-and-widgets/ui-declarative-child-widget-composition
rubric: design
severity: should_fix
---

**Rule.** Compose child UI.Widget instances declaratively in Lit templates using the widget() directive instead of imperative show() calls
- **Look for**: `new ChildWidget()` followed by `.show(...)` or `.appendChild(child.element)` inside Lit view functions or migrated `performUpdate()` methods, or `UI.Widget.WrapperWidget` wrapping a child widget owned by the presenter (`FlameChart`, `ListWidget`, `TabbedPane`) instead of `<devtools-widget ${widget(ChildWidget, {...})}></devtools-widget>` (or `${widget(ChildWidget, {...})}`), `<devtools-list>`, `<devtools-tabbed-pane>`, or `<devtools-split-view>`.
- **Do not flag**: Top-level legacy split widgets or tabbed panes that have not migrated to Lit views, or `UI.Widget.WrapperWidget` when wrapping an externally owned singleton/location widget (such as `ViewManager` locations).

**Why.** Imperatively instantiating child widgets and calling `child.show(container)` inside presenters or views bypasses Lit reconciliation, complicates lifecycle management, and recreates widgets unnecessarily across renders.

## Examples

Bad:

```ts
const child = new DetailsWidget();
child.data = input.data;
child.show(target.querySelector('.container')!);
```

Good:

```ts
Lit.render(html`
  <devtools-widget ${UI.Widget.widget(DetailsWidget, {data: input.data})}></devtools-widget>
`, target);
```
