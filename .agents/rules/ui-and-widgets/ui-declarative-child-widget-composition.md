---
name: devtools/ui-and-widgets/ui-declarative-child-widget-composition
rubric: design
severity: should_fix
---

**Rule.** Compose child UI.Widget instances declaratively in Lit templates using the widget() directive instead of imperative show() calls
- **Look for**: `new ChildWidget()` followed by `.show(...)` or `.appendChild(child.element)` inside Lit view functions or migrated `performUpdate()` methods instead of `<devtools-widget ${widget(ChildWidget, {...})}></devtools-widget>` (or `${widget(ChildWidget, {...})}`).
- **Do not flag**: Top-level legacy split widgets or tabbed panes that have not migrated to Lit views.

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
