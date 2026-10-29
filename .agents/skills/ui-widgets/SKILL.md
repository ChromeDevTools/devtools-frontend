---
name: devtools-ui-widgets
description: Guidelines for building UI widgets using the MVP architecture in DevTools. Covers Widget lifecycle, lit-html views, and state management.
---

## UI Widget Framework Guide (MVP Architecture)

Adhere strictly to the Model-View-Presenter (MVP) architecture.

* **Models** (`front_end/models/`): Handle business logic and application state. MUST NOT have knowledge of the UI.
* **Presenters (`Widget`)**: Orchestrate data flow, manage UI-specific state, and handle interactions.
* **Views (`function`)**: Purely presentational. Stateless functions that receive data/callbacks and render using `lit-html`.

**Refactoring Note:** When refactoring legacy widgets to this framework, the widget's class name MUST NOT be changed. If you're refactoring a UI piece that uses shadow root (e.g. custom HTMLElements) to a Widget, make sure to update its styles to wrap the rules with a `@scope to (devtools-widget > *)` rule.

### Presenter (`Widget`) Rules

* Location: Co-located in the same file as its View.
* MUST extend a base `UI.Widget` class (e.g., `UI.Widget.Widget`). Note that `UI.Widget.Widget` is not an `HTMLElement` and must be appended via `.show()` or `UI.Widget.widget`
* Constructor MUST assign the injected view function to a private `#view` field.
* Constructor MUST call `super()`. If taking `element?: HTMLElement`, pass it to `super(element)`. `super(true)` is forbidden. Do not pass `classes` or `jslog` in `WidgetOptions` (`super(..., {classes: [...], jslog: ...})`); instead, pass container CSS classes and `jslog` via the third parameter of `render(template, target, {container: {classes: [...], attributes: {jslog: ...}}})` in the view function (and if the widget uses shadow DOM, pass `useShadowDom: 'pure'` and extend `Widget<ShadowRoot>` / `VBox<ShadowRoot>` with `target: HTMLElement|DocumentFragment` so `render()` applies `container.classes` and `container.attributes` to the shadow host `this.element`).
* Dependencies from `Universe` SHOULD be requested via static `INJECT`: `static override readonly INJECT = [...] as const;` and received as constructor parameter #2 (`[dep1, dep2]: UI.Widget.WidgetDependencies<typeof MyWidget>`).
* Styling MUST be handled within the View. `this.registerCSSFiles()` is forbidden.
* Initial render MUST be triggered in `override wasShown(): void` by calling `this.requestUpdate()`.
* MUST hold all UI state as private class fields (e.g., `#counter`).
* To schedule a UI update, MUST call `this.requestUpdate()`. `performUpdate()` MUST NOT be called directly.

### View (`function`) Rules

* MUST be a pure function, typically named `DEFAULT_VIEW`, in the same file as the Presenter.
* MUST use the signature: `(input: ViewInput, output: ViewOutput, target: HTMLElement)`.
  * `input`: Data and event handlers from the Presenter.
  * `output`: Callbacks for imperative actions (e.g., focus) provided to the Presenter. If unused, the `output` parameter should be typed as `undefined` in the view's signature, and `undefined` should be passed from the presenter.
  * `target`: The HTML element to render into.
* The `input` parameter MUST NOT be destructured. Always use `input.propertyName`.
* Responsibility: Render a `lit-html` template into `target`.
  * **Template Formatting & Whitespace:** The custom `html` tag from `ui/lit/lit.js` (`front_end/ui/lit/strip-whitespace.ts`) automatically strips `\n\s*` outside of `<...>` tags at runtime, so multi-line formatting between text interpolations and inline elements (`<span>`, etc.) does not introduce whitespace text nodes.
* MUST NOT hold state, fetch data, or perform business logic.

#### Helper Functions in Views

Complex views can be broken down using helper functions defined inside `DEFAULT_VIEW` to access `input` and `output`.

```ts
// clang-format off
const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  const renderHeader = (): LitTemplate => {
    return html`<h1>${input.title}</h1>`;
  };
  // ...
  render(html`
    <div class="child-widget">
      ${renderHeader()}
    </div>
  `, target);
};
// clang-format on
```

### Composition

* To render a child widget, the parent's View MUST use the lit-html directive `UI.Widget.widget`.
* **Prefer `${widget(WidgetClass, {params})}` directly as a child expression** over `<devtools-widget ${widget(WidgetClass, {params})}></devtools-widget>`. Only use an explicit `<devtools-widget>` tag when you need to set other HTML attributes/classes, apply additional directives (such as `widgetRef` or `ref`), or provide child nodes.
* **Strongly prefer the two-argument `widget(WidgetClass, {params})` form** over the single-argument factory callback `widget(element => new WidgetClass(element, ...))`. The two-argument form automatically updates properties and calls `requestUpdate()` on subsequent renders, whereas a factory callback only runs once on initial instantiation.
* If a child widget currently exposes imperative setter methods (e.g., `setStorageKey(key)` or `setStorageBucket(bucket)`) instead of public properties/setters, convert them into standard TypeScript setters (`set storageKey(key)`, `set storageBucket(bucket)`) on the child widget so it can be instantiated and updated declaratively via the two-argument `widget(WidgetClass, {params})` directive.
* Configuration is passed via the parameters.
* Properties passed from a parent MUST be declared as public fields or setters on the child presenter class.
* The framework automatically updates these properties and calls `requestUpdate()` on the child when the parent re-renders.
* **Avoid `UI.Widget.WrapperWidget`:** Do **NOT** pass `UI.Widget` instances (such as `new ChildWidget()`, `UI.TabbedPane.TabbedPane` / `tabbedLocation.tabbedPane()`, `StackLocation.widget()`, `UI.ListWidget.ListWidget`, or `UI.SplitWidget.SplitWidget`) via `ViewInput` to wrap in `UI.Widget.WrapperWidget`.
  * **Child widgets:** Refactor the child widget to accept `element?: HTMLElement` in its constructor and setters for its state, and instantiate it declaratively in the view with `${widget(ChildWidget, {...})}`.
  * **`TabbedPane` and `StackLocation`:** Create tabbed panes and stack panes declaratively in the view using `<devtools-tabbed-pane>` (or `${widget(UI.TabbedPane.TabbedPane, ...)}`) and `<devtools-stack-pane>` rather than passing a `TabbedPane` or `StackLocation.widget()` instance through `ViewInput` to `WrapperWidget`.
  * **`UI.ListWidget.ListWidget` and `UI.ListWidget.Delegate`:** Do NOT keep `this.list` and `UI.ListWidget.Delegate` on the presenter (calling `this.list.clear()`, `this.list.appendItem()`, `this.list.addNewItem()`, rendering `renderItem`/`beginEdit` into a `DocumentFragment`, and mounting `this.list` via `WrapperWidget`). Replace `ListWidget` + `ListWidget.Delegate` with `<devtools-list>` (`ui/components/lists/lists.js`) driven by pure `ViewInput` data and callbacks (using `<devtools-prompt>`, an inline editor row, or `UI.Dialog.Dialog` for editing). If legacy `ListWidget.Editor` DOM/screenshot goldens must be preserved temporarily in an incremental CL, move `ListWidget` + `ListWidget.Delegate` ownership into the view layer (e.g. a small view-layer child class extending `UI.ListWidget.ListWidget` directly and instantiated via `${widget(...)}` in `DEFAULT_VIEW`, without `WrapperWidget`) so the presenter only passes pure data and callbacks in `ViewInput`.
  * `WrapperWidget` is only justified when reparenting a shared stateful singleton across multiple containers (such as `ConsoleView.instance()` or `SourcesView`) or bridging an opaque `UI.Widget` returned by an external factory. Remember that `WrapperWidget` sets `display: contents` on its `<devtools-widget>` host element, so never put sizing, border, or background classes on that `<devtools-widget>` host (wrap it in a `<div>` instead).

## Refactoring Legacy Components

When migrating imperative components (extending `UI.VBox`, `UI.Panel`, or `HTMLElement`) to the MVP architecture:

1.  **Analyze Rendering Logic:** Identify where DOM is created (constructor, `wasShown`, imperative methods). This logic moves to the `DEFAULT_VIEW`.
2.  **Convert Base Class:**
    *   Prefer extending `UI.Widget.Widget`.
    *   **Special Case:** If the component *must* extend `UI.Panel.Panel` or `UI.Dialog.Dialog` (to retain specific functionality), you cannot use `requestUpdate()`. Instead, call `this.performUpdate()` directly on state changes.
3.  **State Migration:** Move DOM-stored state to private class fields.
4.  **Update Usage:** Replace `new MyComponent()` instantiations with declarative `widget(MyComponent, {params})` in parent templates.
5.  **Scoping Styles:** Ensure your CSS file uses the `@scope` block to prevent style leaks:
    ```css
    @scope to (devtools-widget > *) {
      ...
    }
    ```

## Key Implementation Details (Gotchas)

### Styling Strategy
DevTools widgets typically render into Light DOM (the default for `UI.Widget`). To ensure styles are scoped to the component and do not leak into child widgets, wrap your CSS in an `@scope` block:

```css
/* myWidget.css */
@scope to (devtools-widget > *) {
  .my-class { ... }
}
```

Then, include the styles in your `DEFAULT_VIEW`:

```ts
import myWidgetStyles from './myWidget.css.js';
// ...
render(html`
  <style>${myWidgetStyles}</style>
  <div class="my-widget">...</div>
`, target);
```

**Note:** The `{host: input}` option in `render()` is generally **not required** unless you are using specific Shadow DOM patterns that necessitate it. The `@scope` strategy is the preferred method for style isolation in DevTools widgets.

### Legacy Interop & Refs
*   **Raw Elements:** Use `Directives.ref` (from `ui/lit/lit.js`) to obtain a reference to a raw `HTMLElement` if needed for imperative APIs (e.g., `splitWidget.installResizer(element)`).
*   **Child Widgets:** Use `UI.Widget.widgetRef` to obtain the class instance of a child widget inside the view function if you need to call imperative methods on it. **Do NOT store child widget instances on `ViewOutput` as a final result** (doing so is only acceptable temporarily in intermediate migration CLs). Instead, either supply all needed configuration declaratively through setters/inputs on the child widget, or if imperative calls are strictly necessary, expose narrow action functions on `ViewOutput` (e.g., `output.doLayout = () => splitWidget.doLayout()`, `output.revealPosition = pos => childWidget.revealPosition(pos)`). Do not keep `get*ForTest()` methods that return child widget instances via `ViewOutput`; tests should query rendered `<devtools-widget>` elements via `.getWidget()` or assert on `ViewInput` via `createViewFunctionStub`.

### Dependencies

* **View Dependencies:** The `DEFAULT_VIEW` is typically a module-level function. Ensure all dependencies (enums, constants, other components) are imported at the top of the file so they are available in the function scope.
* **Presenter (`Universe`) Dependencies:** To access dependencies managed by `Universe` (e.g. `SDK.TargetManager.TargetManager`, `Common.Settings.Settings`), declare a static `INJECT` array on the `Widget` subclass:
  ```ts
  export class MyWidget extends UI.Widget.Widget {
    static override readonly INJECT = [SDK.TargetManager.TargetManager, Common.Settings.Settings] as const;

    #targetManager: SDK.TargetManager.TargetManager;
    #settings: Common.Settings.Settings;
    #view: View;

    constructor(
      element?: HTMLElement,
      [targetManager, settings]: UI.Widget.WidgetDependencies<typeof MyWidget> = [],
      view: View = DEFAULT_VIEW,
    ) {
      super(element);
      this.#targetManager = targetManager;
      this.#settings = settings;
      this.#view = view;
    }
  }
  ```
  `instantiateWidget` automatically resolves dependencies from `Universe` and passes them as constructor parameter #2. In unit tests using `renderElementIntoDOM`, `TestUniverse` handles injection automatically (override via `setTestUniverseForWidgets`).

## Step-by-Step Implementation Example

### 1\. Create the Widget File and Styles

Example: `front_end/panels/my_example/MyExampleWidget.ts`.

```css
/* front_end/panels/my_example/myExampleWidget.css */
@scope to (devtools-widget > *) {
  p {
    color: blue;
  }
}
```

```ts
// front_end/panels/my_example/MyExampleWidget.ts

import {Directives, html, render} from '../../ui/lit/lit.js';
import * as UI from '../../ui/legacy/legacy.js';

import myExampleWidgetStyles from './myExampleWidget.css.js';

const {ref} = Directives;

// 1. Define Input data shape. (Assuming Child Widget configuration for completeness)
export interface ViewInput {
  title: string;
  counter: number;
  onButtonClick: () => void;
}

// 2. Define Output imperative API shape.
export interface ViewOutput {
  focusButton?: () => void;
}

// 3. Define the View function.
// clang-format off
const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  render(html`
    <style>${myExampleWidgetStyles}</style>
    <div class="child-widget">
      <h3>${input.title}</h3>
      <p>Counter: ${input.counter}</p>
      <button @click=${input.onButtonClick} ${ref(el => {
        if (el) {
          output.focusButton = () => el.focus();
        }
      })}>Increment</button>
    </div>
  `, target);
};
// clang-format on

// 4. Type alias for the view.
type View = typeof DEFAULT_VIEW;

// 5. Define the Presenter.
export class MyExampleWidget extends UI.Widget.Widget {
  #counter: number = 0;

  // Public field REQUIRED to receive data from a parent.
  title: string = 'Default Title';

  #view: View;
  #viewOutput: ViewOutput = {};

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    // Initial render trigger.
    this.requestUpdate();
  }

  focus(): void {
    this.#viewOutput.focusButton?.();
  }

  #handleButtonClick = (): void => {
    this.#counter++;
    this.requestUpdate();
  }

  override performUpdate(): void {
    const viewInput = {
      title: this.title,
      counter: this.#counter,
      onButtonClick: this.#handleButtonClick,
    };
    this.#view(viewInput, this.#viewOutput, this.contentElement);
  }
}
```

### 2\. Compose Widgets (Parent Widget)

Example: `front_end/panels/parent/ParentWidget.ts`. Demonstrates passing state via `widgetConfig` and a view with no `output`.

```ts
// front_end/panels/parent/ParentWidget.ts

import {html, render} from '../../ui/lit/lit.js';
import * as UI from '../../ui/legacy/legacy.js';
import {MyExampleWidget} from '../my_example/MyExampleWidget.ts';

import parentWidgetStyles from './parentWidgetStyles.css';

const {widget} = UI.Widget;

interface ViewInput {
  title: string;
  onTitleChange: () => void;
}

// Parent View
// clang-format off
const DEFAULT_VIEW = (input: ViewInput, output: undefined, target: HTMLElement): void => {
  render(html`
    <style>${parentWidgetStyles}</style>
    <div class="parent-container">
      <h1>Parent Widget</h1>
      <button @click=${input.onTitleChange}>Change Child Title</button>

      <!-- Pass properties to the child widget. -->
      ${widget(MyExampleWidget, {title: input.title})}
    </div>
  `, target);
};
// clang-format on

type View = typeof DEFAULT_VIEW;

// Parent Presenter
export class ParentWidget extends UI.Widget.Widget {
  #childTitle: string = 'Initial Title';
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  #handleChangeTitleClick = () => {
    this.#childTitle = `Title set at ${new Date().toLocaleTimeString()}`;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({
      title: this.#childTitle,
      onTitleChange: this.#handleChangeTitleClick,
    }, undefined, this.contentElement);
  }
}
```

### 3\. Testing Widgets

Testing focuses on the Presenter's logic. The View MUST be replaced by a stub using `createViewFunctionStub`.

* **`describeWithEnvironment`**: Sets up the testing environment.
* **`createViewFunctionStub`**: Stubs the view to capture `input` data.
* **`renderElementIntoDOM`**: Attaches the widget to the DOM to trigger lifecycle methods (like `wasShown`).
* **`view.nextInput`**: A promise that resolves with the next `input` when the widget re-renders.
* **Simulating Events**: Invoke callbacks directly (e.g., `view.input.onButtonClick()`), do not interact with the DOM.

```ts
// front_end/panels/my_example/MyExampleWidget.test.ts

import {
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as MyExampleWidget from './MyExampleWidget.js';

const {MyExampleWidget} = MyExampleWidget;

describeWithEnvironment('MyExampleWidget', () => {
  // Helper to set up the widget with a stubbed view.
  async function createWidget() {
    // 1. Stub the view function.
    const view = createViewFunctionStub(MyExampleWidget);

    // 2. Instantiate the widget, injecting the stub.
    const widget = new MyExampleWidget(undefined, view);

    // 3. Render the widget into the DOM (triggers `wasShown`).
    widget.markAsRoot();
    renderElementIntoDOM(widget);

    // 4. Wait for the initial render.
    await view.nextInput;

    return {view, widget};
  }

  it('renders with initial state', async () => {
    const {view} = await createWidget();
    assert.strictEqual(view.input.counter, 0);
  });

  it('increments counter on button click', async () => {
    const {view} = await createWidget();

    // Simulate the click by invoking the callback.
    view.input.onButtonClick();

    // Wait for the re-render.
    const finalInput = await view.nextInput;

    assert.strictEqual(finalInput.counter, 1);
  });

  it('updates its title when a new one is passed in', async () => {
    const {view, widget} = await createWidget();

    widget.title = 'New Test Title';
    widget.requestUpdate();

    const finalInput = await view.nextInput;
    assert.strictEqual(finalInput.title, 'New Test Title');
  });
});
```

## Improving this Guide

This document is a living guide. If you find that the instructions are incomplete, lead to errors, or could be improved, please suggest updates. Your goal is to make this guide as helpful as possible for both human developers and your future AI counterparts.
