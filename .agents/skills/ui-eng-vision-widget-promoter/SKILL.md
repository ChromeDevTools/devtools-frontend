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
        view layout:

        ```typescript
        export const DEFAULT_VIEW: View = (input, output, target) => {
          Lit.render(html`...`, target);
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

## 🔍 Mental Audit (Internal Self-Correction)

*Before reporting back or committing, re-read the instructions and verify:*
1.  ❓ **Decoupling**: Did I remove all direct `.element` or `.contentElement` couplings from instantiator files?
2.  ❓ **Inheritance**: Does the class now cleanly inherit from `UI.Widget` or its variants?
3.  ❓ **Injectability**: Is the view injectable in the constructor?
4.  ❓ **Build**: Does the code compile and do tests pass?
