# Chromium DevTools UI Engineering

## Objective and scope

This document defines how to build Chromium DevTools UI. It aims at improving consistency, maintainability and extensibility of the current code

**Consistency** here means to have one way to do one thing, in the context of this doc to have a single reusable component per repeated task.

**Maintainability** is addressed here through the [separation of concerns](https://en.wikipedia.org/wiki/Separation_of_concerns) while avoiding unnecessary indirection.

**Extensibility** requires the ease of understanding and imitation, i.e. being able to take an existing code, understand and use it as an example to solve another problem.

Additionally, all the changes need to be applicable to the existing code **point-wise** instead of requiring extensive rewriting.

## Reusable web components

Common UI primitives need to be implemented as web components. Examples include buttons, checkboxs, or data grids. Web components should not be used solely for encapsulation, we should not have single-use web components.

Not all reusable code should be a web component: in the Application panel we have several similar views showing key-value pairs in a datagrid with a preview sidebar. Making this a truly reusable component will lead to an unjustifiable complexity. Instead we should have extracted a base class or helpers implementing the common functionality.

In implementation we should prefer wrapping existing code under ui/legacy over new implementation. The former is the most feature-rich (including less obvious aspects like a11y) and has stood the test of time.

We should however strive to expose a “HTML-native” API: e.g. toolbar doesn’t need an `items` setter if its child HTML elements could define its content. Even the data grid doesn’t need to expose data grid nodes, when `<tr>` and `<td>`’s are enough.

## Model-View-Presenter architecture

We should strictly separate business logic, from UI logic and presentation. This means that most of the UI code should be centered around a presenter (subclass of a `UI.Widget`) that gets a view function injected. All the logic that is not related to the DevTools UI (i.e. that would stay the same if we rewrite DevTools as a command-line tool), should belong to the model layer.

The presenter code should make no assumptions about the details of model or view code. It should not care what race conditions CDP exposes or how many layers of `<div class=”wrapper”>` does the markup have. However, for simplicity, the injected view function should have a default implementation inlined with a presenter (see an example below).

In tests, we use a simple stub as a view function, which allows us to test the presenter logic without any DOM manipulation. To test the view function itself we should use screenshot and e2e tests.

## Declarative and orchestrated DOM updates

We should no longer use imperative API to update DOM. Instead we rely on orchestrated rendering of lit-html templates. The view function described above should be a call to lit-html `render`. The view function should be called from `UI.Widget`’s `performUpdate` method, which by default is scheduled using `requestAnimationFrame`.

To embed another presenter (`UI.Widget`) in the lit-html template, use `<devtools-widget .widgetConfig=${widgetConfig(<class>, {foo: 1, bar: 2})}`

This will instantiate a `Widget` class with the web component as its `element` and, optionally, will set the properties provided in the second parameter. The widget won’t be re-instantiated on the subsequent template renders, but the properties would be updated. For this to work, the widget needs to accept `HTMLElement` as a sole constructor parameter and properties need to be public members or setters.

## Examples

```html
<devtools-widget .config=${widgetConfig(ElementsPanel)}>
  <devtools-split-widget>
    <devtools-widget slot="main".config=${widgetConfig(ElementsTree)}></devtools-widget>
    <devtools-tab-pane slot="sidebar">
      <devtools-widget .config=${widgetConfig(StylesPane, {element: input.element})}></devtools-widget>
      <devtools-widget .config=${widgetConfig(ComputedPane, {element: input.element})}></devtools-widget>
      ...
    </devtools-tab-pane>
  </devtools-split-widget>
</devtools-widget>
```

```ts
class StylesPane extends UI.Widget {
  constructor(element, view = (input, output, target) => {
    render(html`
      <devtools-widget .config=${widgetConfig(MetricsPane, {element: input.element})}>
      </devtools-widget>
      <devtools-toolbar>
        <devtools-filter-input @change=${input.onFilter}></devtools-filter-input>
        <devtools-checkbox @change=${input.onShowAll}>Show All</devtools-checkbox>
        <devtools-checkbox @change=${input.onGroup}>Group</devtools-checkbox>
      </devtools-toolbar>
      <devtools-tree-outline>
        ${input.properties.map(p => html`<li>
          <dt>${p.key}</dt><dd>${renderValue(p.value)}</dd>
          <ol>${p.subproperties.map(...)}
          </li>`)}
      </devtools-tree-outline>`
  }
}
```

[https://source.chromium.org/chromium/chromium/src/+/main:third\_party/devtools-frontend/src/front\_end/panels/protocol\_monitor/ProtocolMonitor.ts;l=197](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/panels/protocol_monitor/ProtocolMonitor.ts;l=197)

[https://source.chromium.org/chromium/chromium/src/+/main:third\_party/devtools-frontend/src/front\_end/panels/developer\_resources/DeveloperResourcesListView.ts;l=86](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/panels/developer_resources/DeveloperResourcesListView.ts;l=86)

[https://source.chromium.org/chromium/chromium/src/+/main:third\_party/devtools-frontend/src/front\_end/panels/timeline/TimelineSelectorStatsView.ts;l=113](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/panels/timeline/TimelineSelectorStatsView.ts;l=113)
