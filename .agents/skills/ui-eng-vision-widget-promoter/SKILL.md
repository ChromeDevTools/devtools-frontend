---
name: ui-eng-vision-widget-promoter
description: Promotes legacy views to modern UI.Widget classes, hooks up performUpdate() rendering, and exports default views.
allowed-tools: code_search open_urls
---

# Subskill: Widget Promoter (Pass 3)

This subskill completes the architectural transition, upgrading the component
from legacy base classes (like `SimpleView` or custom wrapper layouts) into
clean `UI.Widget` classes that use native update rendering delegates.

--------------------------------------------------------------------------------

## 1. Widget Promotion Guidelines

*   **Widget Framework Rules**: Follow the rules defined in [`devtools-ui-widgets`](../ui-widgets/SKILL.md).

1.  **Change Class Inheritance**:

    *   Rewrite class declarations to extend `UI.Widget` (or specialized
        sub-layouts like `UI.Widget.VBox`).
    *   Clean up and remove older constructors that perform custom container
        initializations or access `.element` directly for manual append
        operations.
    *   Note that `VBox` and `HBox` inherit directly from `Widget`. They fully support view injection (`view = DEFAULT_VIEW`), `performUpdate()`, and `requestUpdate()` without modification.

2.  **Upgrade View Delegates & Inject View**:

    *   Migrate the local Lit template strings into a formally exported default
        view layout (using named imports `import {html, render} from '../../ui/lit/lit.js';`):

        ```typescript
        export const DEFAULT_VIEW: View = (input, output, target) => {
          render(html`...`, target);
        };
        ```

    *   Make the view injectable in the constructor for testability (as per `docs/ui_engineering.md`), and use static `INJECT` if requesting dependencies from `Universe`:

        ```typescript
        class MyWidget extends UI.Widget.VBox {
          static override readonly INJECT = [SDK.TargetManager.TargetManager] as const;

          #targetManager: SDK.TargetManager.TargetManager;
          #view: View;
          constructor(
            element?: HTMLElement,
            [targetManager]: UI.Widget.WidgetDependencies<typeof MyWidget> = [],
            view: View = DEFAULT_VIEW,
          ) {
            super(element);
            this.#targetManager = targetManager;
            this.#view = view;
          }
        ```

    *   Implement the standard modern `performUpdate()` override on the widget:

        ```typescript
        override performUpdate(): void {
          this.#view(this.viewInput, this.viewOutput, this.contentElement);
        }
        ```

3.  **Clean Up Legacy Wrappers**:

    *   Remove any `LegacyWrapper` bindings or custom wrappable custom elements.
    *   Replace old panel instantiations with declarative `widget` entries (using `const {widget} = UI.Widget;`). Prefer `${widget(MyWidgetClass, {params})}` directly as a child expression over `<devtools-widget ${widget(MyWidgetClass, {params})}></devtools-widget>`; only use an explicit `<devtools-widget>` tag when setting other attributes, applying other directives (such as `widgetRef` or `ref`), or providing child nodes:

        ```typescript
        html`${widget(MyWidgetClass, {params})}`
        ```

    *   **Strongly prefer the two-argument `widget(MyWidgetClass, {params})` form** over the single-argument factory callback `widget(element => new MyWidgetClass(element, ...))`. The single-argument factory only runs on initial creation and does not update properties on subsequent re-renders. If the child widget only exposes `setFoo(...)` methods, convert them into `set foo(...)` setters so they can be passed via the second argument of `widget()`.
    *   **Do NOT Use `UI.Widget.WrapperWidget` for Child Widgets or Layout Containers**: Never instantiate a child widget or layout container in the presenter (`this.#child = new ChildWidget()`, `UI.TabbedPane.TabbedPane` / `tabbedLocation.tabbedPane()`, `StackLocation.widget()`, `UI.ListWidget.ListWidget`) and pass it via `ViewInput` to `UI.Widget.WrapperWidget`. Child widgets and containers must be created declaratively in the view (`${widget(ChildWidget, {...})}`, `<devtools-tabbed-pane>`, `<devtools-stack-pane>`, `<devtools-list>`). `WrapperWidget` is only justified when reparenting a shared stateful singleton across multiple containers (such as `ConsoleView.instance()` or `SourcesView`) or bridging an opaque `UI.Widget` returned by an external factory. In particular, when migrating classes that use `UI.ListWidget.ListWidget` and `UI.ListWidget.Delegate`, do not keep `this.list` and `ListWidget.Delegate` on the presenter with `DocumentFragment` adapters and `WrapperWidget`; either replace `ListWidget` with `<devtools-list>` (recommended) or move `ListWidget` + `ListWidget.Delegate` ownership into the view layer (extending `UI.ListWidget.ListWidget` directly rather than `WrapperWidget`) behind pure `ViewInput` data and callbacks.
    *   **No Widget References on `ViewOutput`**: Keeping child `UI.Widget` instances on `ViewOutput` (e.g., `output.childWidget = w`) is not a good practice and must not remain in the final result (it is only acceptable temporarily in intermediate CLs). Either supply all configuration through setters on the child widget, or if imperative action calls are strictly needed, expose individual functions on `ViewOutput` (such as `output.doLayout = () => w.doLayout()` or `output.scrollWidgetToSomething = () => w.scrollToSomething()`). Remove legacy `get*ForTest()` methods that were only used to grab child widgets from `ViewOutput` and update tests to query the DOM (`view.contentElement.querySelector(...)?.getWidget()`) or inspect `ViewInput`.
    *   Inspect instantiator files (e.g., `ApplicationPanelSidebar.ts`) and
        decouple any direct accesses to `.element`.

--------------------------------------------------------------------------------

## 2. Safety & Verification Rules

*   **CRITICAL**: Never update screenshot goldens without explicit consent of the user. Most likely the failure points to an issue in the implementation or (less likely) the test itself. Look at the screenshot diffs to debug.
*   **Minimal Code Movement & Helper Topology**: When migrating, try to move code around as little as possible, in particular around the lit rendering helpers. Preserve existing standalone/module-level DOM helper functions (e.g., `linkifyIcon`, `maybeCreateLinkToElementsPanel`) and async class update helpers in their original locations, having DOM helpers return `LitTemplate` (or `Promise<LitTemplate|null>`) rather than deleting and inlining them into `performUpdate()` or `DEFAULT_VIEW`. This minimizes the git diff and improves reviewability.

--------------------------------------------------------------------------------

## 🔍 Mental Audit (Internal Self-Correction)

*Before reporting back or committing, re-read the instructions and verify:*
1.  ❓ **Decoupling**: Did I remove all direct `.element` or `.contentElement` couplings from instantiator files?
2.  ❓ **Inheritance**: Does the class now cleanly inherit from `UI.Widget` or its variants?
3.  ❓ **Injectability**: Is the view injectable in the constructor?
4.  ❓ **Build**: Does the code compile and do tests pass?
