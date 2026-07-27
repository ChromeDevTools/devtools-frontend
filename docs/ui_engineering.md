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

We should strictly separate business logic from UI logic and presentation. This means that most of the UI code should be centered around a presenter (a subclass of `UI.Widget`) that gets a view function injected. All the logic that is not related to the DevTools UI (i.e., that would stay the same if we were to rewrite DevTools as a command-line tool) should belong to the model layer.

The presenter should make no assumptions about the details of the model or view code. It should not care what race conditions CDP exposes or how many layers of `<div class="wrapper">` the markup has.

For testability and simplicity, the view function should be injectable into the presenter's constructor. The presenter should also provide a default view. The recommended pattern is to define the default rendering logic in a separate, exported function named `DEFAULT_VIEW`. The presenter's constructor can then use this as the default value for its `view` parameter.

This approach has two main benefits:
1.  **Testability**: In unit tests, we can pass a simple stub as the view function, which allows us to test the presenter's logic without any DOM manipulation.
2.  **Clarity**: It cleanly separates the presenter's logic from its rendering logic.

Note that `VBox` and `HBox` inherit directly from `Widget`. They fully support view injection (`view = DEFAULT_VIEW`), `performUpdate()`, and `requestUpdate()` without modification.

To test the `DEFAULT_VIEW` function itself, we should use screenshot and e2e tests.

### Dependency Injection via `INJECT`

Subclasses of `UI.Widget.Widget` can declare dependencies from `Universe` to be automatically injected when instantiated (e.g. via `<devtools-widget>` or `UI.Widget.widget()`).

To opt into dependency injection, define a static `INJECT` array containing dependency constructors:

```ts
class MyWidget extends UI.Widget.Widget {
  static override readonly INJECT = [SDK.TargetManager.TargetManager, Common.Settings.Settings] as const;

  #targetManager: SDK.TargetManager.TargetManager;
  #settings: Common.Settings.Settings;

  constructor(
    element?: HTMLElement,
    [targetManager, settings]: UI.Widget.WidgetDependencies<typeof MyWidget> = [],
    view: View = DEFAULT_VIEW,
  ) {
    super(element);
    this.#targetManager = targetManager;
    this.#settings = settings;
  }
}
```

When `instantiateWidget` creates a widget with a non-empty `INJECT` array, it automatically resolves each requested constructor from the active `Universe` and passes the resolved instances array as parameter #2 to the constructor.

Use `UI.Widget.WidgetDependencies<typeof MyWidget>` to type the injected dependencies parameter.

## Declarative and orchestrated DOM updates

We should no longer use imperative API to update DOM. Instead we rely on orchestrated rendering of lit-html templates. The view function described above should be a call to lit-html `render`. The view function should be called from `UI.Widget`’s `performUpdate` method, which by default is scheduled using `requestAnimationFrame`.

To embed another presenter (`UI.Widget`) in the lit-html template, use `widget(<class>, {foo: 1, bar: 2})`

This will instantiate a `Widget` class with the web component as its `element` and, optionally, will set the properties provided in the second parameter. The widget won’t be re-instantiated on the subsequent template renders, but the properties would be updated. For this to work, the widget needs to accept `HTMLElement` as its first constructor parameter, optional injected dependencies as parameter #2 (if `INJECT` is declared), and properties need to be public members or setters.

For backwards compatibility, the first argument to `widget` can also be a factory function: `widget(element => new MyWidget(foo, bar, element))`. Similar to the class constructor version, `element` is the actual `<devtools-widget>` so the following two invocations of `widget` are equivalent: `widget(MyWidget)` and `widget(element => new MyWidget(element))`.

## Styling
To prevent style conflicts in widgets without relying on shadow DOM, we use the CSS [`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) at-rule for style encapsulation. This ensures that styles defined for a widget do not leak out and affect other components.

The convention is to add the `@scope` rule directly into the widget's .css file. The scope's "lower boundary" is set to `(devtools-widget > *)`. This prevents the styles from cascading into the contents of any nested child widgets, while still allowing the parent to style the `<devtools-widget>` element itself.

First, define the styles within an @scope block in your CSS file:

```css
/* my-widget.css */
@scope to (devtools-widget > *) {
  /* Use :scope to style the widget's container element itself. */
  :scope {
    width: 100%;
    box-shadow: none;
  }

  .title {
    font-size: 1.2em;
    color: var(--sys-color-tonal-on-container);
  }
}
```

Then, import and use these styles in your widget's view function:
```ts
/* myWidget.ts */
import {html} from 'lit-html';
import * as UI from '../../ui/legacy/legacy.js';
import myWidgetStyles from './myWidget.css.js';

render(html`
  <style>
    ${myWidgetStyles}
  </style>
  <div class="container">
    <h3 class="title">My Widget</h3>
    ...
    ${widget(NestedWidget)}
  </div>
`, this.element);
```

In this example, the `.title` style will apply within the parent widget but will not leak into the nested widget. Because this convention relies on developer discipline, it is important to verify its correct application during code reviews.

**Note:** Inside a `<devtools-data-grid>`, any `<style>` tags must be placed as direct children of the `<table>` element.

## Examples

```html
<devtools-widget ${widget(ElementsPanel)}>
  <devtools-split-view>
    <devtools-widget slot="main" ${widget(ElementsTree)}></devtools-widget>
    <devtools-tab-pane slot="sidebar">
      ${widget(StylesPane, {element: input.element})}
      ${widget(ComputedPane, {element: input.element})}
      ...
    </devtools-tab-pane>
  </devtools-split-view>
</devtools-widget>
```

```ts
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
const DEFAULT_VIEW = (input, output, target) => {
  render(html`
    ${widget(MetricsPane, {element: input.element})}
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
    </devtools-tree-outline>
  `, target);
};

class StylesPane extends UI.Widget {
  #view: View;
  constructor(element, view = DEFAULT_VIEW) {
    this.#view = view;
  }

  performUpdate() {
    this.#view(inputPlaceholder, this.#outputPlaceholder, this.contentElement);
  }
}
```

[https://source.chromium.org/chromium/chromium/src/+/main:third\_party/devtools-frontend/src/front\_end/panels/protocol\_monitor/ProtocolMonitor.ts;l=197](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/panels/protocol_monitor/ProtocolMonitor.ts;l=197)

[https://source.chromium.org/chromium/chromium/src/+/main:third\_party/devtools-frontend/src/front\_end/panels/developer\_resources/DeveloperResourcesListView.ts;l=86](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/panels/developer_resources/DeveloperResourcesListView.ts;l=86)

[https://source.chromium.org/chromium/chromium/src/+/main:third\_party/devtools-frontend/src/front\_end/panels/timeline/TimelineSelectorStatsView.ts;l=113](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/panels/timeline/TimelineSelectorStatsView.ts;l=113)


### Unit tests

When testing presenters, rely on observable effects such as view updates or model calls.

#### View stubbing

```ts
// ✅ recommended: stub the view function using createViewFunctionStub.
import {createViewFunctionStub} from './ViewFunctionHelpers.js';
const view = createViewFunctionStub(Presenter);
const presenter = new Presenter(view);

// ✅ recommended: expect a view stub call in response to presenter behavior.
present.show();
const input = await view.nextInput;

// ✅ recommended: expect a view stub call in response to an event from the view.
input.onEvent();
assert.deepStrictEqual(await view.nextInput, {});

// ❌ not recommended: Widget.updateComplete only reports a current view update
// operation status and might create flakiness depending on doSomething() implementation.
presenter.doSomething();
await presenter.updateComplete;
assert.deepStrictEqual(view.lastCall.args[0], {});

// ❌ not recommended: awaiting for the present logic to finish might
// not account for async or throttled view updates.
await presenter.doSomething();
// ❌ not recommended: it is easy for such assertions to
// rely on the data not caused by the action being tested.
sinon.assert.calledWith(view, sinon.match({ data: 'smth' }));
```

#### Model stubbing

```ts
// ✅ recommended: stub models that the presenter relies on.
// Note there are many good ways to stub/mock models with sinon
// depending on the use case and existing model code structure.
const cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel);

const presenter = new Presenter();
// ✅ recommended: expect model calls as the result of invoking
// presenter's logic.
const modelCall = expectCall(cssModel.headersForSourceURL, {
  fakeFn: () => {
    return false,
  },
});
// ✅ recommended: expect view calls to result in output based
// on the mocked model.
const viewCall = view.nextInput;

presenter.doSomething();

// ✅ recommended: assert arguments provided to model calls.
const [url] = await modelCall;
assert.strictEqual(url, '...');

assert.deepStrictEqual((await viewCall).headersForSourceURL, [{...}]);

// ❌ not recommended: mocking CDP responses to make the models behave in a certain way
// while testing a presenter is fragile.
const connection = new MockCDPConnection();
connection.setSuccessHandler('CSS.getHeaders', () => ({}));
createTarget({connection});
const presenter = new Presenter();
presenter.doSomething();
```

#### Testing widgets with `INJECT` dependencies

When rendering widgets into DOM in unit tests (e.g. via `renderElementIntoDOM`), DOM test helpers automatically supply a default `TestUniverse` for resolving `INJECT` dependencies.

If a test requires a custom `TestUniverse` instance, pass it via `setTestUniverseForWidgets`:

```ts
import {setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

const customUniverse = new TestUniverse();
setTestUniverseForWidgets(customUniverse);
```

# Migrating Widgets and other "legacy" components

This section provides a series of examples for migrating from imperative DOM manipulation to a declarative approach using lit-html templates.

## Setting `className` on `this.element`

Instead of setting `className` directly on `this.element`, define the component's structure declaratively using a lit-html template. When classes or attributes (`jslog`) must be set directly on `target` itself (for example when `target` is positioned externally via `.positionAt()`), use the `container` option in DevTools' custom `render()` (`front_end/ui/lit/render.ts`).

**Before:**
```typescript
class SomeWidget extends UI.Widget.Widget {
  constructor(element?: HTMLElement) {
    super(element, {jslog: `${VisualLogging.deviceModeRuler().track({click: true})}`});
    this.element.className = 'some-class';
  }
}
```

**After (when creating an inner wrapper):**
```typescript
export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div class="some-class"></div>`,
    target);
};
```

**After (when classes or attributes must be applied directly to `target` itself):**
```typescript
export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div class="some-content">...</div>`,
    target, {
      container: {
        classes: ['some-class'],
        attributes: {jslog: VisualLogging.deviceModeRuler().track({click: true})},
      },
    });
};
```

## Appending a new element

Instead of using `appendChild` with `document.createElement`, define the new element within a lit-html template.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.appendChild(document.createElement('div'));
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <div></div>
    </div>`,
    target);
};
```

## Setting multiple attributes and `textContent`

Combine setting `className`, attributes, and `textContent` into a single declarative lit-html template.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.className = 'some-class';
    this.contentElement.setAttribute('aria-label', 'some-label');
    this.contentElement.textContent = 'some-text';
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div class="some-class" aria-label="some-label">some-text</div>`,
    target);
};
```

## Creating a child, adding a class, and adding an event listener

Use a lit-html template to create the element, set multiple classes, and attach event listeners declaratively.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.container = this.contentElement.createChild('div', 'some-class');
    this.container.classList.add('container');
    this.container.addEventListener('click', this.onClick.bind(this));
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <div class="some-class container" @click=${this.onClick.bind(this)}></div>
    </div>`,
    target);
};
```

## Setting inline styles

Set inline styles directly within the lit-html template using the `style` attribute.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.style.width = '100%';
    this.contentElement.style.marginLeft = '10px';
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div style="width:100%; margin-left:10px"></div>`,
    target);
};
```

## Creating and appending a styled element

Replace `document.createElement`, setting `className`, and `appendChild` with a declarative lit-html template.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const div = document.createElement('div');
    div.className = 'some-class';
    this.contentElement.appendChild(div);
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <div class="some-class"></div>
    </div>`,
    target);
};
```

## Creating a child with text content

Define the element and its text content directly within a lit-html template.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.createChild('span', 'some-class').textContent = 'some-text';
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <span class="some-class">some-text</span>
    </div>`,
    target);
};
```

## Migrating `UI.Toolbar.ToolbarFilter`

Replace the imperative creation of a `ToolbarFilter` with the declarative `<devtools-toolbar-input>` component.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const toolbar = this.contentElement.createChild('devtools-toolbar');
    const filterInput = new UI.Toolbar.ToolbarFilter('some-placeholder', 0.5, 1, undefined, this.complete.bind(this), false, 'some-filter');
    filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, this.onFilterChanged.bind(this));
    filterInput.element.classList.add('completions');
    filterInput.element.setAttribute('aria-hidden', 'true');
    toolbar.appendToolbarItem(filterInput);
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <devtools-toolbar>
        <devtools-toolbar-input class="completions" type="filter" placeholder="some-placeholder"
            list="completions" id="some-filter" aria-hidden="true"
            @change=${this.onFilterChanged.bind(this)} style="flex-grow:0.5; flex-shrink:1">
          <datalist id="completions">${this.complete.bind(this)}</datalist>
        </devtools-toolbar-input>
      </devtools-toolbar>
    </div>`,
    target);
};
```

## Migrating `UI.Toolbar.ToolbarInput`

Replace the imperative creation of a `ToolbarInput` with the declarative `<devtools-toolbar-input>` component.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const toolbar = this.contentElement.createChild('devtools-toolbar');
    const filterInput = new UI.Toolbar.ToolbarInput('some-placeholder', 'accessible-placeholder', 0.5, 1);
    toolbar.appendToolbarItem(filterInput);
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <devtools-toolbar>
        <devtools-toolbar-input type="text" placeholder="some-placeholder"
            aria-label="accessible-placeholder" style="flex-grow:0.5; flex-shrink:1"></devtools-toolbar-input>
      </devtools-toolbar>
    </div>`,
    target);
};
```

## Migrating `Adorners.Adorner.Adorner`

Replace the imperative creation of an `Adorner` with the declarative `<devtools-adorner>` component.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const adornerContent = document.createElement('span');
    adornerContent.innerHTML = '<div style="font-size: 12px;">💫</div>';
    const adorner = new Adorners.Adorner.Adorner();
    adorner.classList.add('fix-perf-icon');
    adorner.data = {
      name: i18nString(UIStrings.fixMe),
      content: adornerContent,
      jslogContext: 'fix-perf',
    };
    this.contentElement.appendChild(adorner);
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <devtools-adorner class="fix-perf-icon" aria-label=${i18nString(UIStrings.fixMe)}
          jslog=${VisualLogging.adorner('fix-perf')}>
        <span><div style="font-size: 12px;">💫</div></span>
      </devtools-adorner>
    </div>`,
    target);
};
```

## Migrating `UI.Toolbar.ToolbarButton`

Replace the imperative creation of a `ToolbarButton` with the declarative `<devtools-button>` component.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const toolbar = this.contentElement.createChild('devtools-toolbar');
    const editButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.editName), 'edit', undefined, 'edit-name');
    editButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.onClick.bind(this));
    toolbar.appendToolbarItem(editButton);
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <devtools-toolbar>
        <devtools-button title=${i18nString(UIStrings.editName)} @click=${this.onClick.bind(this)}
            .variant=${Buttons.Button.Variant.TOOLBAR} .iconName=${'edit'}
            .jslogContext=${'edit-name'}></devtools-button>
      </devtools-toolbar>
    </div>`,
    target);
};
```

## Migrating various HTML elements with multiple properties

Replace imperative creation of standard HTML elements like `<a>`, `<img>`, and `<input>` with their declarative equivalents in a lit-html template, setting their properties as attributes.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'some-placeholder';
    input.value = 'some-value';
    input.disabled = !this.enabled;
    input.checked = true
    this.contentElement.append(input);

    const anchor = document.createElement('a');
    anchor.href = 'https://www.google.com';
    anchor.innerText = 'some-text';
    anchor.dataset.someKey = 'some-value';
    anchor.role = 'some-role';
    this.contentElement.insertBefore(anchor, input);

    const img = document.createElement('img');
    img.src = 'https://www.google.com/some-image.png';
    img.alt = 'some-alt';
    img.draggable = true;
    img.height = 100;
    img.hidden = 'hidden';
    img.href = 'https://www.google.com';
    img.id = 'some-id';
    img.name = 'some-name';
    img.rel = 'some-rel';
    img.scope = 'some-scope';

    input.insertAdjacentElement('beforebegin', img);
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <a href="https://www.google.com" data-some-key="some-value" role="some-role">some-text</a>
      <img src="https://www.google.com/some-image.png" alt="some-alt" draggable="true" height="100"
          hidden="hidden" href="https://www.google.com" id="some-id" name="some-name" rel="some-rel"
          scope="some-scope">
      <input type="text" placeholder="some-placeholder" value="some-value"
          ?disabled=${!this.enabled} checked>
    </div>`,
    target);
};
```

## Migrating `UI.UIUtils` helpers

Replace `UI.UIUtils` helper functions like `createLabel` and `createTextButton` with their declarative component counterparts like `<label>` and `<devtools-button>`.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const select = document.createElement('select');
    select.add(UI.UIUtils.createOption('Option 1', '1', 'option-1'));
    this.contentElement.appendChild(UI.UIUtils.createLabel('Some label:', 'some-label', select));
    this.contentElement.appendChild(UI.UIUtils.createTextButton('Some button', onClick, {
      className: 'some-class',
      jslogContext: 'some-button',
      variant: Buttons.Button.Variant.PRIMARY,
      title: i18nString(UIStrings.someTitle),
      iconName: 'some-icon'
    }));
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <label class="some-label">Some label:
        <select>
          <option value="1" jslog=${VisualLogging.dropDown('1').track({click: true})}>Option 1</option>
        </select>
      </label>
      <devtools-button class="some-class" title=${i18nString(UIStrings.someTitle)} @click=${onClick}
          .jslogContext=${'some-button'} .variant=${Buttons.Button.Variant.PRIMARY}>Some button</devtools-button>
    </div>`,
    target);
};
```

## Migrating `UI.UIUtils.createTextChild`

Instead of using `createTextChild`, include the text directly inside the element in the lit-html template.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    UI.UIUtils.createTextChild(this.contentElement.createChild('div', 'some-class'), 'some-text');
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <div class="some-class">some-text</div>
    </div>`,
    target);
};
```

## Migrating `Buttons.Button.Button` with ARIA and Tooltip helpers

Replace the imperative creation of a `Button` and subsequent modifications with ARIA and Tooltip helpers with a single declarative `<devtools-button>` component, setting properties like `role` and `title`.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.button = new Buttons.Button.Button();
    this.button.data = {
      jslogContext: 'some-button',
      variant: Buttons.Button.Variant.PRIMARY,
      title: i18nString(UIStrings.someTitle),
    };
    UI.ARIAUtils.markAsPresentation(this.button);
    UI.Tooltip.Tooltip.install(this.button, i18nString(UIStrings.someTooltip));
  }
}
```

**After:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.button = html`
    <devtools-button role="presentation" title=${i18nString(UIStrings.someTooltip)}
        .data=${{
      jslogContext: 'some-button',
      variant: Buttons.Button.Variant.PRIMARY,
      title: i18nString(UIStrings.someTitle),
    }}
    ></devtools-button>`;
  }
}
```

## Migrating `Icon`

Replace the imperative `Icon` creation with the declarative `<devtools-icon>` component.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const icon = new Icon();
    icon.data = {iconName: 'checkmark', color: 'var(--icon-checkmark-green)', width: '14px', height: '14px'};
    this.contentElement.appendChild(icon);
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <devtools-icon name="checkmark"
          style="color:var(--icon-checkmark-green); width:14px; height:14px"></devtools-icon>
    </div>`,
    target);
};
```

## Migrating Checkboxes

Replace various imperative checkbox creation methods with the declarative `<devtools-checkbox>` component. For settings-backed checkboxes, use the `bindToSetting` directive.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.appendChild(UI.UIUtils.CheckboxLabel.create(
          i18nString(UIStrings.someTitle), true, i18nString(UIStrings.someTooltip),
          undefined, 'some-checkbox', true));
    this.contentElement.appendChild(UI.UIUtils.CheckboxLabel.create());
    this.contentElement.appendChild(UI.UIUtils.CheckboxLabel.createWithStringLiteral(
        ':hover', undefined, undefined, 'some-other-checkbox'));

    const toolbar = this.contentElement.createChild('devtools-toolbar');
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarCheckbox(
        i18nString(UIStrings.someToolbarTitle), i18nString(UIStrings.someToolbarTooltip),
        this.someToolbarCheckboxClicked.bind(this), 'some-toolbar-checkbox'));
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this.someSetting, i18nString(UIStrings.someToolbarTooltip), i18nString(UIStrings.alternateToolbarTitle)));
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(this.someOtherSetting));
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <devtools-checkbox class="small" checked>${i18nString(UIStrings.someTitle)}</devtools-checkbox>
      <devtools-checkbox></devtools-checkbox>
      <devtools-checkbox class="small">:hover</devtools-checkbox>
      <devtools-toolbar>
        <devtools-checkbox title=${i18nString(UIStrings.someToolbarTooltip)}
            @click=${this.someToolbarCheckboxClicked.bind(this)}
            .jslogContext=${'some-toolbar-checkbox'}>${i18nString(UIStrings.someToolbarTitle)}</devtools-checkbox>
        <devtools-checkbox title=${i18nString(UIStrings.someToolbarTooltip)}
            ${bindToSetting(this.someSetting)}>${i18nString(UIStrings.alternateToolbarTitle)}</devtools-checkbox>
        <devtools-checkbox ${bindToSetting(this.someOtherSetting)}>${this.someOtherSetting.title()}</devtools-checkbox>
      </devtools-toolbar>
    </div>`,
    target);
};
```

## Binding an action to a button

Use the `bindToAction` directive to create a button that is bound to a registered action. The button's properties (e.g., `title`, `disabled`) will be automatically updated when the action's state changes.

**Before:**
```typescript
class SomeWidget extends UI.Widget.Widget implements UI.Toolbar.ItemsProvider {
  constructor() {
    super();
    this.toolbarItemsInternal = [];
    this.toolbarItemsInternal.push(UI.Toolbar.Toolbar.createActionButton('elements.refresh-event-listeners'));
  }

  toolbarItems(): UI.Toolbar.ToolbarItem[] {
    return this.toolbarItemsInternal;
  }
}
```

**After:**
```typescript
export const DEFAULT_VIEW = (input, _output, target) => {
  const {bindToAction} = UI.UIUtils;
  render(html`
    <div>
      <devtools-toolbar>
        <devtools-button ${bindToAction('elements.refresh-event-listeners')}></devtools-button>
      </devtools-toolbar>
    </div>`,
    target);
};
```

## Binding a setting to a checkbox

Use the `bindToSetting` directive to bind a boolean setting to a `<devtools-checkbox>` component.

**Before:**
```typescript
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const toolbar = this.contentElement.createChild('devtools-toolbar');
    const showAllPropertiesSetting = Common.Settings.Settings.instance().createSetting('show-all-properties', false);
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        showAllPropertiesSetting, i18nString(UIStrings.showAllTooltip), i18nString(UIStrings.showAll)));
  }
}
```

**After:**
```typescript
export const DEFAULT_VIEW = (input, _output, target) => {
  const {bindToSetting} = UI.SettingsUI;
  const showAllPropertiesSetting = Common.Settings.Settings.instance().createSetting('show-all-properties', false);
  render(html`
    <div>
      <devtools-toolbar>
        <devtools-checkbox title=${i18nString(UIStrings.showAllTooltip)} ${bindToSetting(showAllPropertiesSetting)}>
          ${i18nString(UIStrings.showAll)}
        </devtools-checkbox>
      </devtools-toolbar>
    </div>`,
    target);
};
```

## Migrating `UI.Toolbar.ToolbarComboBox`

Replace the imperative creation of a `ToolbarComboBox` with a declarative `<select>` element.

**Before:**
```typescript
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const toolbar = this.contentElement.createChild('devtools-toolbar');
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarComboBox(
       this.someToolbarComboBoxClicked.bind(this), 'Combox',
       'the-toolbar-combox', 'some-toolbar-combox'));
  }
}
```

**After:**
```typescript
export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <devtools-toolbar>
        <select class="the-toolbar-combox" title="Combox" aria-label="Combox"
            jslog=${VisualLogging.dropDown('some-toolbar-combox').track({change: true})}
            @change=${this.someToolbarComboBoxClicked.bind(this)}></select>
      </devtools-toolbar>
    </div>`,
    target);
};
```

## Migrating various Toolbar items

Replace various imperative `UI.Toolbar` methods like `appendSeparator`, `appendSpacer`, and `setEnabled` with their declarative equivalents.

**Before:**
```typescript
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const toolbar = this.contentElement.createChild('devtools-toolbar');
    toolbar.wrappable = true;
    toolbar.appendSeparator();
    const combo = new UI.Toolbar.ToolbarComboBox(this.onSelect.bind(this), 'aria-label', undefined, 'combo-box');
    combo.createOption('Option 1', '1', 'option-1');
    const option2 = document.createElement('option');
    option2.value = '2';
    option2.textContent = 'Option 2';
    combo.addOption(option2);
    toolbar.appendToolbarItem(combo);
    toolbar.appendSpacer();
    const button = new UI.Toolbar.ToolbarButton('Click me', 'largeicon-add');
    button.setEnabled(false);
    toolbar.appendToolbarItem(button);
    const otherButton = new UI.Toolbar.ToolbarButton('Other button', 'largeicon-delete');
    otherButton.setEnabled(this.isEnabled);
    toolbar.appendToolbarItem(otherButton);
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator());
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator(false));
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator(true));
  }
}
```

**After:**
```typescript
export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <devtools-toolbar wrappable>
        <div class="toolbar-divider"></div>
        <select title="aria-label" aria-label="aria-label"
            jslog=${VisualLogging.dropDown('combo-box').track({change: true})}
            @change=${this.onSelect.bind(this)}>
          <option value="1" jslog=${VisualLogging.item('option-1').track({click: true})}>Option 1</option>
          <option value="2">Option 2</option>
        </select>
        <div class="toolbar-spacer"></div>
        <devtools-button title="Click me" .variant=${Buttons.Button.Variant.TOOLBAR}
            .iconName=${'largeicon-add'} disabled></devtools-button>
        <devtools-button title="Other button" ?disabled=${!this.isEnabled}
            .variant=${Buttons.Button.Variant.TOOLBAR} .iconName=${'largeicon-delete'}></devtools-button>
        <div class="toolbar-divider"></div>
        <div class="toolbar-divider"></div>
        <div class="toolbar-spacer"></div>
      </devtools-toolbar>
    </div>`,
    target);
};
```

## Migrating `iframe` creation

Replace `document.createElement('iframe')` and `setAttribute` calls with a declarative `<iframe>` tag in a lit-html template.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', '');
    iframe.tabIndex = -1;
    this.contentElement.appendChild(iframe);
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <iframe sandbox tabindex="-1"></iframe>
    </div>`,
    target);
};
```

## Migrating `UI.UIUtils.createInput`

Replace the `createInput` helper with a standard `<input>` element in a lit-html template.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.appendChild(UI.UIUtils.createInput('add-source-map', 'text', 'url'));
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <input class="harmony-input add-source-map" spellcheck="false" type="text"
          jslog=${VisualLogging.textField('url').track({keydown: 'Enter', change: true})}>
    </div>`,
    target);
};
```

## Migrating `SortableDataGrid`, `ViewportDataGrid`, `DataGridImpl`

Replace the imperative `SortableDataGrid`, `ViewportDataGrid`, or `DataGridImpl` with the declarative `<devtools-data-grid>` component. Columns are defined using `<th>` elements inside a `<table>`.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.#columns = [
      {
        id: 'node-id',
        title: i18nString(UIStrings.element),
        sortable: true,
        weight: 50,
        align: undefined,
      },
      {
        id: 'declaration',
        title: i18nString(UIStrings.declaration),
      },
      {
        id: 'source-url',
        title: i18nString(UIStrings.source),
        sortable: false,
        weight: 100,
        align: DataGrid.DataGrid.Align.RIGHT,
      },
    ];

    this.#dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: i18nString(UIStrings.someTitle),
      columns: this.#columns,
      deleteCallback: undefined,
      refreshCallback: undefined,
    });
    this.#dataGrid.setStriped(true);
    this.#dataGrid.addEventListener(
        DataGrid.DataGrid.Events.SORTING_CHANGED, this.#sortMediaQueryDataGrid.bind(this));

    this.#dataGrid.asWidget().show(this.element);
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <devtools-data-grid name=${i18nString(UIStrings.someTitle)} striped
          @sort=${this.#sortMediaQueryDataGrid.bind(this)}>
        <table>
          <tr>
            <th id="node-id" weight="50" sortable>${i18nString(UIStrings.element)}</th>
            <th id="declaration">${i18nString(UIStrings.declaration)}</th>
            <th id="source-url" weight="100" align="right">${i18nString(UIStrings.source)}</th>
          </tr>
        </table>
      </devtools-data-grid>
    </div>`,
    target);
};
```

## Migrating `DataGridNode.createCell`

The `createCell` method in a `DataGridNode` can be refactored to return a lit-html template for the cell's content, making it declarative.

**Before:**
```typescript

class ElementNode extends DataGrid.SortableDataGrid.SortableDataGridNode<ElementNode> {
  override createCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId);
    cell.classList.add('node-id');
    cell.createChild('span', 'node-id-text').textContent = this.data.id;
    return cell;
  }
}
```

**After:**
```typescript

class ElementNode extends DataGrid.SortableDataGrid.SortableDataGridNode<ElementNode> {
  override createCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId);
    render(html`
      <td class="node-id">
        <span class="node-id-text">${this.data.id}</span>
      </td>`, cell);
    return cell;
  }
}
```

## Migrating `SplitWidget`

Replace the imperative `SplitWidget` with the declarative `<devtools-split-view>` component. Nested widgets can be rendered using `<devtools-widget>`.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.#splitWidget = new UI.SplitWidget.SplitWidget(this.vertical, false, undefined, 200);
    this.#splitWidget.show(this.element);

    this.#mainContainer = new UI.SplitWidget.SplitWidget(true, true);
    this.#resultsContainer = new UI.Widget.EmptyWidget();
    this.#elementContainer = new DetailsView();

    this.#mainContainer.setMainWidget(this.#resultsContainer);
    this.#mainContainer.setSidebarWidget(this.#elementContainer);
    this.#mainContainer.setVertical(false);
    this.#mainContainer.setSecondIsSidebar(this.dockedLeft);

    this.#sideBar = new SidebarPanel();
    this.#sideBar.setMinimumSize(100, 25);
    this.#splitWidget.setSidebarWidget(this.#sideBar);
    this.#splitWidget.setMainWidget(this.#mainContainer);
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <devtools-split-view direction=${this.vertical ? 'column' : 'row'} sidebar-position="first"
          sidebar-initial-size="200">
        <devtools-widget slot="sidebar" ${widget(SidebarPanel,
            {minimumSize: {width: 100, height: 25}})}></devtools-widget>
        <devtools-split-view direction="column" sidebar-position="second" slot="main"
            direction="row" sidebar-position="$this.dockedLeft ? 'second' : 'first'}">
          <devtools-widget slot="main" ${widget(UI.Widget.EmptyWidget)}></devtools-widget>
          <devtools-widget slot="sidebar" ${widget(DetailsView)}></devtools-widget>
        </devtools-split-view>
      </devtools-split-view>
    </div>`,
    target);
};
```

## Migrating `UI.ARIAUtils` helpers

Replace calls to `UI.ARIAUtils` helper functions with the corresponding ARIA attributes directly in the lit-html template.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.button = this.contentElement.createChild('button');
    UI.ARIAUtils.markAsMenuButton(this.button);
    const tree = this.contentElement.createChild('ul');
    UI.ARIAUtils.markAsTree(tree);
    UI.ARIAUtils.markAsTreeitem(tree.createChild('li'));
    const alert = this.contentElement.createChild('span');
    alert.textContent = 'Alert';
    UI.ARIAUtils.markAsAlert(alert);
    const slider = this.contentElement.createChild('input');
    UI.ARIAUtils.markAsSlider(slider, 10);

    UI.ARIAUtils.setDescription(this.button, 'Some button');
    UI.ARIAUtils.setInvalid(slider, this.valid);

    const progress = this.contentElement.createChild('div');
    UI.ARIAUtils.markAsProgressBar(progress);
    UI.ARIAUtils.setProgressBarValue(progress, 0.5, '50% done');
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <button role="button" aria-haspopup="true" aria-description="Some button"></button>
      <ul role="tree">
        <li role="treeitem"></li>
      </ul>
      <span role="alert" aria-live="polite">Alert</span>
      <input role="slider" aria-valuemin="10" aria-valuemax="100" aria-invalid=${this.valid}>
      <div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0.5"
          aria-valuetext="50% done"></div>
    </div>`,
    target);
};
```

## Migrating `EmptyWidget`

Replace the imperative `EmptyWidget` with a declarative `widget` and configure it to render an `EmptyWidget`.

**Before:**
```typescript

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const widget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.nothingToSeeHere), this.explanation);
    widget.link = 'http://www.google.com';
    widget.show(this.element);
  }
}
```

**After:**
```typescript


export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      ${widget(UI.EmptyWidget.EmptyWidget,{
          header: i18nString(UIStrings.nothingToSeeHere), text: this.explanation,
          link: 'http://www.google.com',})}
    </div>`,
    target);
};
```

## Migrating `TextPrompt` and `InplaceEditor`

Replace imperative `TextPrompt` or `UI.InplaceEditor` creation with the declarative `<devtools-prompt>` component, providing completions via `<datalist>`.

### Critical Rules for `<devtools-prompt>`:
1. **Prompt Owns the Content (`<slot>`)**: When `editing` is `false`, `<devtools-prompt>` renders `<span class="entrypoint"><slot></slot></span>` in shadow DOM. Therefore, `<devtools-prompt>` **must contain the display text/title directly as a child** (`<devtools-prompt ...>${title}</devtools-prompt>`) and live inside the element container (e.g., inside `<devtools-checkbox>`).
2. **Do Not Conditionally Swap Elements**: Do NOT render `<devtools-prompt>` conditionally *in place of* a `<span>` or text node (`isEditing ? html`<devtools-prompt>...` : html`<span>${title}</span>``). Mount `<devtools-prompt>` unconditionally, holding the text content at all times, and only toggle its boolean property `?editing=${item === input.editingItem}`.
3. **Conditional Input Styling**: Because `<devtools-prompt>` is present in both display and editing modes, any input-mode borders or background classes must be applied conditionally (e.g., `class=${Directives.classMap({'condition-input': isEditing})}`) so non-editing rows remain unbordered.

**Before (`InplaceEditor` or imperative `TextPrompt`):**
```typescript
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const prompt = new UI.TextPrompt.TextPrompt();
    prompt.initialize(async (expression, prefix) => {
      const options = ['completion1', 'completion2'];
      return options.filter(opt => opt.startsWith(prefix)).map(text => ({text}));
    });
    const promptElement = this.contentElement.createChild('span');
    prompt.attach(promptElement);
  }

  #startEditing(item: string, element: HTMLElement): void {
    const config = new UI.InplaceEditor.Config(this.#commit.bind(this), this.#cancel.bind(this), element);
    UI.InplaceEditor.InplaceEditor.startEditing(element, config);
  }
}
```

**After (Declarative `<devtools-prompt>` inside Lit):**
```typescript
export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <datalist id="my-completions">
        <option>completion1</option>
        <option>completion2</option>
      </datalist>
      <devtools-checkbox .checked=${input.enabled}>
        <devtools-prompt
            value=${input.item}
            completions="my-completions"
            ?editing=${input.item === input.editingItem}
            class=${Directives.classMap({'prompt-editing-border': input.item === input.editingItem})}
            @commit=${(e: CustomEvent) => input.onCommit(input.item, e.detail)}
            @cancel=${() => input.onCancel(input.item)}>
          ${input.title}
        </devtools-prompt>
      </devtools-checkbox>
    </div>`,
    target);
};
```

## Migrating `TreeOutline`

Replace imperative `TreeOutline` and `TreeElement` creation with the declarative `<devtools-tree>` component.

**Before:**
```typescript
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    const tree = new UI.TreeOutline.TreeOutlineInShadow();
    this.contentElement.appendChild(tree.element);

    const root = tree.rootElement();
    const node1 = new UI.TreeOutline.TreeElement('Node 1');
    root.appendChild(node1);

    const node2 = new UI.TreeOutline.TreeElement('Node 2', true);
    root.appendChild(node2);

    const child1 = new UI.TreeOutline.TreeElement('Child 1');
    node2.appendChild(child1);
  }
}
```

**After:**
```typescript
export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <devtools-tree .template=${html`
        <ul role="tree">
          <li role="treeitem">Node 1</li>
          <li role="treeitem" open>
            Node 2
            <ul role="group">
              <li role="treeitem">Child 1</li>
            </ul>
          </li>
        </ul>
      `}></devtools-tree>
    </div>`,
    target);
};
```

In a more complex case you might want to skip rendering of the collapsed nodes
subtrees and temporarily expand nodes to show search matches. This could be done
as follows:

```typescript
export const DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <div>
      <devtools-tree .template=${html`
        <ul role="tree">
          ${input.topLevelNodes.map(node => html`
            <li role="treeitem" ?open=${containsSearchResult(node)}>
              ${node.name}
              ${node.children.length ? html`
                <ul role="group">
                  ${ifExpanded(node.children.map(renderChild))}
                </ul>
              ` : nothing}
            </li>`)}
        </ul>
      `}></devtools-tree>
    </div>`,
    target);
};
```

Here `open` attribute overrides the expansion state set by the user. Once `open`
attribute is removed, the expansion state is reversed to the last state set by
the user.

`ifExpanded` is a lit directive provided on `UI.TreeOutline` and it makes its
argument render only if the current tree node is expanded.

## Refactoring UI.Toolbar.Provider

As part of the migration, sometimes classes need to be broken up into smaller pieces. Classes implementing
`UI.Toolbar.Provider` logic are good examples of this, if they implement `View` logic in addition to their
`UI.Toolbar.Provider` responsibilities. The View logic needs to be moved to a separate class.


**Before:**
```typescript
export class NodeIndicator implements UI.Toolbar.Provider {
  readonly #element: Element;
  readonly #item: UI.Toolbar.ToolbarItem;

  private constructor() {
    // Creates `this.#element` and `this.#item` imperatively (e.g. using document.createElement/createChild).
  }
  static instance(opts: { forceNew: boolean|null, } = {forceNew: null}): NodeIndicator {
    // Creates an instance of this class and returns it.
  }
  #update(input): void { /* Handles updates to `this.#element` and `this.#item`. */}
  item(): UI.Toolbar.ToolbarItem|null {
    return this.#item;
  }
}
```

**After:**
```typescript
export const DEFAULT_VIEW: View = (input, output, target) => {
  // Implementation of the View using Lit.render() (omitted for brevity).
};

export class NodeIndicator extends UI.Widget.Widget {
  readonly #view: View;

  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  override performUpdate(): void {
    const input = {
      // Whatever input the View needs.
    };
    this.#view(input, {}, this.contentElement);
  }
}

let nodeIndicatorProviderInstance: NodeIndicatorProvider;
export class NodeIndicatorProvider implements UI.Toolbar.Provider {
  #toolbarItem: UI.Toolbar.ToolbarItem;
  #widgetElement: UI.Widget.WidgetElement<NodeIndicator>;

  private constructor() {
    this.#widgetElement = document.createElement('devtools-widget') as UI.Widget.WidgetElement<NodeIndicator>;
    this.#widgetElement.widgetConfig = UI.Widget.widgetConfig(NodeIndicator);

    this.#toolbarItem = new UI.Toolbar.ToolbarItem(this.#widgetElement);
    this.#toolbarItem.setVisible(false);
  }

  item(): UI.Toolbar.ToolbarItem|null {
    return this.#toolbarItem;
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): NodeIndicatorProvider {
    const {forceNew} = opts;
    if (!nodeIndicatorProviderInstance || forceNew) {
      nodeIndicatorProviderInstance = new NodeIndicatorProvider();
    }

    return nodeIndicatorProviderInstance;
  }
}
```

## Highlighting text

### (UI.UIUtils.highlightRangesWithStyleClass or Highlighting.HighlightManager)

Use the `<devtools-highlight>` component to highlight text ranges within its
container. The component takes two attributes: `ranges`, which is a
space-separated list of `offset,length` pairs, and `current-range`, which is a
single `offset,length` pair to highlight with a different color.

The component will automatically sort and merge the ranges provided.

```html
<div style="position:relative">
  <devtools-highlight ranges="10,2 1,3 2,3" current-range="5,3">
    This is some text to highlight.
  </devtools-highlight>
</div>
```

In this example, the ranges `1,3` and `2,3` will be merged into `1,4`. The
ranges `10,2` and the current range `5,3` will also be highlighted.

## Migrating `UI.ListWidget.ListWidget`

Replace the legacy imperative `UI.ListWidget.ListWidget` (which rendered inline editing controls and required custom delegates) with the modern `<devtools-list>` component.

### Guidelines
1. **Dialogue Modals for Complex Editors:** If the editor contains multiple input fields (e.g., location details, headers), show the editor in a modal card dialog powered by `UI.Dialog.Dialog`.
2. **Inline Prompts for Trivial Editors:** If the editor is trivial (i.e., a single text input, such as URL pattern blocking rules), handle editing inline using a `<devtools-prompt>` component. In this case, clicking the item focuses the prompt and toggles `editing` mode inline, dispatching `@commit` and `@cancel` events to update the state. See `RequestConditionsDrawer` for a reference implementation.
3. **Conditionally render list:** Use `<devtools-list>` and conditionally render it inside the card only if the list has elements (`input.locations.length > 0`). This ensures empty state layout rules are correctly applied and prevents extra spacing/gaps.
4. **Declarative dialog views:** Define the edit/add modal content in a separate, customizable view function (e.g. `DEFAULT_DIALOG_VIEW`). Instantiating `UI.Dialog.Dialog` in the class is fine, but its content rendering should be driven declaratively by the dialog view function.
5. **Common styles integration:** Ensure `{includeCommonStyles: true}` is passed when rendering elements into the DOM inside test setups to import proper layout variables and global typography styles (e.g. Roboto).

**Before:**
```typescript
class SettingsTab extends UI.Widget.VBox implements UI.ListWidget.Delegate<Location> {
  private readonly listWidget: UI.ListWidget.ListWidget<Location>;
  constructor() {
    super();
    this.listWidget = new UI.ListWidget.ListWidget(this);
    this.listWidget.show(this.element);
  }

  renderItem(item: Location, editable: boolean): Element {
    const element = document.createElement('div');
    element.createChild('span').textContent = item.title;
    return element;
  }

  beginEdit(item: Location): UI.ListWidget.Editor<Location> {
    const editor = new UI.ListWidget.Editor<Location>();
    editor.createInput('title', 'text', 'Title', titleValidator);
    return editor;
  }

  commitEdit(item: Location, editor: UI.ListWidget.Editor<Location>, isNew: boolean): void {
    item.title = editor.control('title').value;
    this.update();
  }
}
```

**After:**
```typescript
export interface SettingsTabInput {
  items: Location[];
  onAddClicked: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export const DEFAULT_VIEW: View = (input, _output, target) => {
  render(html`
    <devtools-card heading="Locations">
      ${input.items.length > 0 ? html`
        <devtools-list
          .editable=${true}
          .deletable=${true}
          @edit=${(e: Lists.List.ItemEditEvent) => input.onEdit(e.detail.index)}
          @delete=${(e: Lists.List.ItemRemoveEvent) => input.onDelete(e.detail.index)}>
          ${input.items.map((item, index) => html`
            <div slot="slot-${index}">
              <span>${item.title}</span>
            </div>
          `)}
        </devtools-list>
      ` : nothing}
      <devtools-button @click=${input.onAddClicked}>Add location</devtools-button>
    </devtools-card>
  `, target);
};

export interface SettingsTabDialogInput {
  editingValues: {title: string};
  validationErrors: {title: string | null};
  onTitleInput: (val: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const DEFAULT_DIALOG_VIEW = (input: SettingsTabDialogInput, target: HTMLElement) => {
  render(html`
    <div class="editor-container">
      <input type="text" .value=${input.editingValues.title} @input=${(e: Event) => input.onTitleInput((e.target as HTMLInputElement).value)}>
      <devtools-button @click=${input.onCancel}>Cancel</devtools-button>
      <devtools-button @click=${input.onSave}>Save</devtools-button>
    </div>
  `, target);
};
```
