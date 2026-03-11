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
* Constructor MUST call `super()`. If taking `element?: HTMLElement`, pass it to `super(element)`. `super(true)` is forbidden.
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
* MUST NOT hold state, fetch data, or perform business logic.

#### Helper Functions in Views

Complex views can be broken down using helper functions defined inside `DEFAULT_VIEW` to access `input` and `output`.

```ts
// clang-format off
const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  const renderHeader = (): Lit.LitTemplate => {
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

* To render a child widget, the parent's View MUST use lit-html directive `UI.Widget.wiget`
* Configuration is passed via the parameters.
* Properties passed from a parent MUST be declared as public fields on the child presenter class.
* The framework automatically updates these properties and calls `requestUpdate()` on the child when the parent re-renders.

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
*   **Raw Elements:** Use `Lit.Directives.ref` to obtain a reference to a raw `HTMLElement` if needed for imperative APIs (e.g., `splitWidget.installResizer(element)`).
*   **Child Widgets:** Use `UI.Widget.widgetRef` to obtain the class instance of a child widget if you need to call methods on it directly (though declarative data flow is preferred).

### Dependencies
The `DEFAULT_VIEW` is typically a module-level function. Ensure all dependencies (enums, constants, other components) are imported at the top of the file so they are available in the function scope.

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

import * as Lit from '../../ui/lit/lit.js';
import * as UI from '../../ui/legacy/legacy.js';

import myExampleWidgetStyles from './myExampleWidget.css.js';

const {html, render, ref} = Lit;

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

import * as Lit from '../../ui/lit/lit.js';
import * as UI from '../../ui/legacy/legacy.js';
import {MyExampleWidget} from '../my_example/MyExampleWidget.ts';

import parentWidgetStyles from './parentWidgetStyles.css';

const {html, render} = Lit;
const {widgetConfig} = UI.Widget;

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
