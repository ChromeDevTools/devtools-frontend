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

1.  **Change Class Inheritance**:

    *   Rewrite class declarations to extend `UI.Widget` (or specialized
        sub-layouts like `UI.Widget.VBox`).
    *   Clean up and remove older constructors that perform custom container
        initializations or access `.element` directly for manual append
        operations.

2.  **Upgrade View Delegates & Inject View**:

    *   Migrate the local Lit template strings into a formally exported default
        view layout:

        ```typescript
        export const DEFAULT_VIEW: View = (input, output, target) => {
          Lit.render(html`...`, target);
        };
        ```

    *   Make the view injectable in the constructor for testability (as per `docs/ui_engineering.md`):

        ```typescript
        class MyWidget extends UI.Widget.VBox {
          #view: View;
          constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
            super(true, element);
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
    *   Replace old panel instantiations with standard `<devtools-widget>`
        declarative entries:

        ```typescript
        html`<devtools-widget .widgetConfig=${widgetConfig(MyWidgetClass, [params])}></devtools-widget>`
        ```

    *   Inspect instantiator files (e.g., `ApplicationPanelSidebar.ts`) and
        decouple any direct accesses to `.element`.

--------------------------------------------------------------------------------

## 2. Safety & Verification Rules

*   **CRITICAL**: Never update screenshot goldens without explicit consent of the user. Most likely the failure points to an issue in the implementation or (less likely) the test itself. Look at the screenshot diffs to debug.
*   **Minimal Code Movement**: When migrating, try to move code around as little as possible, in particular around the lit rendering helpers. This minimizes the git diff and improves reviewability.

--------------------------------------------------------------------------------
