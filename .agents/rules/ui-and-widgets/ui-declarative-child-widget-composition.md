---
name: devtools/ui-and-widgets/ui-declarative-child-widget-composition
rubric: design
severity: should_fix
---

**Rule.** Compose child UI.Widget instances declaratively in Lit templates using ${widget(ChildWidget, {...})} or declarative container elements instead of imperative show() calls, WrapperWidget, single-argument factory callbacks, or bare <devtools-widget> tags
- **Look for**: `new ChildWidget()` followed by `.show(...)` or `.appendChild(child.element)` inside Lit view functions or migrated `performUpdate()` methods, `UI.Widget.WrapperWidget` wrapping a child widget or layout container owned by the presenter (such as `new ChildWidget()`, `FlameChart`, `UI.TabbedPane.TabbedPane` / `tabbedLocation.tabbedPane()`, `StackLocation.widget()`, or `UI.ListWidget.ListWidget`) instead of `${widget(ChildWidget, {...})}`, `<devtools-list>`, `<devtools-tabbed-pane>`, `<devtools-stack-pane>`, or `<devtools-split-view>`, `ViewInput` properties typed as `UI.Widget` subclasses (recommend creating the widget or `<devtools-tabbed-pane>` / `<devtools-stack-pane>` declaratively in the view instead), sizing/border/background classes placed directly on a `<devtools-widget>` hosting `WrapperWidget` (which sets `display: contents`), passing fresh `.bind(this)` callbacks, `new Set(...)` copies, or unmemoized array/object literals in `widget(ChildWidget, {...})` (`WidgetDirective.update` checks `!==` reference equality and queues `requestUpdate()` on every change), `widget(element => ...)` factory callbacks configuring child widget properties imperatively instead of `${widget(ChildWidget, {...})}`, `<devtools-widget ${widget(ChildWidget, {...})}></devtools-widget>` tags that have no other attributes, directives, or child nodes, double-wrapping `<devtools-widget>${widget(...)}</devtools-widget>` (`widget()` as a child directive already renders `<devtools-widget>`), slotting `<devtools-widget slot="main|sidebar">` into `UI.Panel.PanelWithSidebar.splitWidget().element` (collides with `PanelWithSidebar`'s internal VBoxes; extend `UI.Panel.Panel` and render `<devtools-split-view>` instead), `<devtools-split-view>` `@change` handlers missing `if (e.target === e.currentTarget && e instanceof CustomEvent)` before reading `e.detail` (native `<input>`/`<select>` `change` events bubble with `e.detail === undefined`), or `@SomeEvent` on `<devtools-widget>` when the child class does not use `eventMixin` on `UI.Widget` (no `dispatchDOMEvent`), when the listener is placed on an ancestor element (the `CustomEvent` does not bubble), or when the handler reads `event.data` instead of `event.detail`.
- **Do not flag**: Top-level legacy split widgets or tabbed panes that have not migrated to Lit views, `<devtools-widget>` tags that set other attributes, use additional directives (e.g. `widgetRef`), or contain child nodes, `UI.Widget.WrapperWidget` wrapping an externally owned shared stateful singleton reparented across multiple containers (such as `ConsoleView.instance()` or `SourcesView`) or an opaque widget returned by an external factory, `ViewInput` properties carrying those externally owned singletons or opaque external-factory widgets into `DEFAULT_VIEW`, or `@SomeEvent=${handler}` on a `<devtools-widget>` whose class uses `Common.ObjectWrapper.eventMixin` on `UI.Widget` (`eventMixin` dispatches `new CustomEvent(type, {detail: data})` on `widget.element`, and Lit preserves the case of `@SomeEvent` from the template string).

**Why.** Imperatively instantiating child widgets and calling `child.show(container)` inside presenters or views bypasses Lit reconciliation, complicates lifecycle management, and recreates widgets unnecessarily across renders. Passing widget instances (`new ChildWidget()`, `UI.TabbedPane.TabbedPane` / `tabbedLocation.tabbedPane()`, `StackLocation.widget()`, `UI.ListWidget.ListWidget`, etc.) via `ViewInput` and wrapping them in `UI.Widget.WrapperWidget` leaks view widgets into presenter state, bypasses declarative lifecycle management, and breaks container box styling and `@scope to (devtools-widget > *)` boundaries because `WrapperWidget` sets `display: contents` on its host element. Child widgets and layout containers (`<devtools-tabbed-pane>`, `<devtools-stack-pane>`, `<devtools-split-view>`, `<devtools-list>`, `${widget(ChildWidget, {...})}`) must be created declaratively in the view with stable property references instead. Similarly, single-argument factory callbacks `widget(element => ...)` only run on initial creation and fail to propagate updated properties on subsequent re-renders; strongly prefer the two-argument `widget(ChildWidget, {...})` form (updating the child widget's constructor to accept `element?: HTMLElement` and converting `setFoo()` methods into `set foo()` setters if needed). Prefer `${widget(ChildWidget, {...})}` directly as a child expression over `<devtools-widget ${widget(ChildWidget, {...})}></devtools-widget>` or nested `<devtools-widget>${widget(...)}</devtools-widget>`.

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
