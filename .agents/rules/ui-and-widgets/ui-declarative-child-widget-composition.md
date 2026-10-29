---
name: devtools/ui-and-widgets/ui-declarative-child-widget-composition
rubric: design
severity: should_fix
---

**Rule.** Compose child UI.Widget instances declaratively in Lit templates using ${widget(ChildWidget, {...})} or declarative container elements instead of imperative show() calls, WrapperWidget, single-argument factory callbacks, or bare <devtools-widget> tags
- **Look for**: `new ChildWidget()` followed by `.show(...)` or `.appendChild(child.element)` inside Lit view functions or migrated `performUpdate()` methods, `UI.Widget.WrapperWidget` wrapping a child widget or layout container owned by the presenter (such as `new ChildWidget()`, `FlameChart`, `UI.TabbedPane.TabbedPane` / `tabbedLocation.tabbedPane()`, `StackLocation.widget()`, or `UI.ListWidget.ListWidget`) instead of `${widget(ChildWidget, {...})}`, `<devtools-list>`, `<devtools-tabbed-pane>`, `<devtools-stack-pane>`, or `<devtools-split-view>`, `ViewInput` properties typed as `UI.Widget` subclasses (recommend creating the widget or `<devtools-tabbed-pane>` / `<devtools-stack-pane>` declaratively in the view instead), sizing/border/background classes placed directly on a `<devtools-widget>` hosting `WrapperWidget` (which sets `display: contents`), `widget(element => ...)` factory callbacks configuring child widget properties imperatively instead of `${widget(ChildWidget, {...})}`, or `<devtools-widget ${widget(ChildWidget, {...})}></devtools-widget>` tags that have no other attributes, directives, or child nodes.
- **Do not flag**: Top-level legacy split widgets or tabbed panes that have not migrated to Lit views, `<devtools-widget>` tags that set other attributes, use additional directives (e.g. `widgetRef`), or contain child nodes, or `UI.Widget.WrapperWidget` wrapping an externally owned shared stateful singleton reparented across multiple containers (such as `ConsoleView.instance()` or `SourcesView`) or an opaque widget returned by an external factory.

**Why.** Imperatively instantiating child widgets and calling `child.show(container)` inside presenters or views bypasses Lit reconciliation, complicates lifecycle management, and recreates widgets unnecessarily across renders. Passing widget instances (`new ChildWidget()`, `UI.TabbedPane.TabbedPane` / `tabbedLocation.tabbedPane()`, `StackLocation.widget()`, `UI.ListWidget.ListWidget`, etc.) via `ViewInput` and wrapping them in `UI.Widget.WrapperWidget` leaks view widgets into presenter state, bypasses declarative lifecycle management, and breaks container box styling and `@scope to (devtools-widget > *)` boundaries because `WrapperWidget` sets `display: contents` on its host element. Child widgets and layout containers (`<devtools-tabbed-pane>`, `<devtools-stack-pane>`, `<devtools-split-view>`, `<devtools-list>`, `${widget(ChildWidget, {...})}`) must be created declaratively in the view instead. Similarly, single-argument factory callbacks `widget(element => ...)` only run on initial creation and fail to propagate updated properties on subsequent re-renders; strongly prefer the two-argument `widget(ChildWidget, {...})` form (updating the child widget's constructor to accept `element?: HTMLElement` and converting `setFoo()` methods into `set foo()` setters if needed). Prefer `${widget(ChildWidget, {...})}` directly as a child expression over `<devtools-widget ${widget(ChildWidget, {...})}></devtools-widget>`.

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
  ${UI.Widget.widget(DetailsWidget, {data: input.data})}
`, target);
```
