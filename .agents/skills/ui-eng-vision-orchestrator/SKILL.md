---
name: ui-eng-vision-orchestrator
description: High-level orchestrator for managing multi-pass migration of Chrome DevTools legacy components to the modern UI engineering vision (UI.Widget & Lit-html).
allowed-tools: code_search open_urls search_changelists data_analysis import_skill close_skill
---

# UI Engineering Vision Orchestrator: Meta-Skill Instructions

This meta-skill acts as the central coordinator for modernizing legacy Chrome
DevTools views into declarative `UI.Widget` components based on lit-html,
managing a multi-pass sequential CL pipeline to ensure each code modification is
small, testable, and highly reviewable.

Refer to [ui_engineering.md](../../../docs/ui_engineering.md) for general principles.

--------------------------------------------------------------------------------

## 1. Migration Philosophy & Plan-Validate-Execute Pattern

1.  **The Plan-Validate-Execute Principle**: For each target file, the
    orchestrator must first generate a structured `migration_plan.md` listing
    the exact transformations, file targets, and subskills allocated for each
    pass.
2.  **User Acceptance Gate**: The orchestrator must halt execution and present
    the migration plan to the user. No code modification, subskill loading, or
    CL staging can occur until the user explicitly accepts the plan.
3.  **No Assumptions on Inheritance**: Do not assume the class hierarchy in a
    file matches older patterns or generic examples. Always perform a structure
    analysis of the active file first and adapt the plan to the actual, current
    code.
4.  **Hybrid Files**: Files may contain multiple classes in different states of
    modernization (e.g., one partially migrated class and one fully legacy
    class). Propose modifications only for classes with actual violations.
5.  **Coupling Analysis**: Always check the integration files (e.g., sidebar
    files, parent panel files) where the target class is instantiated to see if
    there are any direct `.element` or `.contentElement` couplings. If found,
    include the decoupling of these references in the plan.
6.  **Neighboring Component Reference**: Inspect neighboring modernized files of
    the same archetype (e.g., `DOMStorageItemsView.ts` or
    `KeyValueStorageItemsView.ts` for storage-like components) to find proven
    patterns for toolbar and data-grid configurations.
7.  **The Narrow Bridge Principle**: Keep code modifications tightly scoped to a
    single responsibility per CL. Do not combine technology migrations (e.g.,
    converting imperative DOM to Lit-html) with base class refactoring in the
    same diff.
8.  **Never Break Compilation**: Run a compiler build and execute the DevTools
    test suite between every pass.
9.  **Establish Comprehensive Guardrails First**: Ensure both **logic tests**
    (verifying presenter interactions and state updates) and **screenshot tests**
    (verifying layout/styling) exist before rewriting code. If coverage is
    missing, scaffold it first.

--------------------------------------------------------------------------------

## 2. Multi-Pass Execution Lifecycle

### Plan Generation (Gated)

*   **Actions**:
    1.  Scan the target file to determine size, complexity, legacy elements
        (e.g., `ReportView`, `ToolbarButton`, `DataGrid`, `TreeOutline`), and
        actual class inheritance. Deconstruct the file mentally (or in the plan)
        into **Business Logic** (state, event handlers) and **Rendering Logic**
        (DOM creation, CSS classes). Reference code elements by **Name** (not
        line numbers) to ensure the plan remains valid as the codebase evolves.
        Check if the class dependencies have been migrated to the ui eng vision or not.
    2.  Check the files depending on this file, to understand how the code in
        this file is being used.
    3.  **Dynamic Ordering Decision**: Determine whether to run
        Logic Consolidation first or Local lit-html rendering first:
        *   **Option A (Logic First)**: Choose this if the component has a
            complex, nested state model or highly coupled event-handlers.
            Consolidating the state variables and defining the `ViewInput`
            interface first provides a clean data contract, making the
            subsequent template conversion highly deterministic.
        *   **Option B (Technology First)**: Choose this if the component has a
            relatively simple state flow but massive, deeply nested imperative
            DOM construction. Converting the layout to declarative Lit templates
            first (using temporary inline or local state) makes it much easier
            to isolate and group the remaining state updates afterward.
    4.  Generate a `migration_plan.md` reflecting this ordering and outlining
        the target steps.
    5.  Halt execution and print the formatted plan in Markdown to the chat.
        Wait for user approval.

### Baseline & Safety Scaffolding

*   **Trigger Condition**: User explicitly says "I accept the plan" or
    equivalent.
*   **Subskill to Import**: `ui-eng-vision-test-scaffolder`
*   **Actions**:
    1.  Verify existing test coverage. Propose and add missing **logic tests**
        for interactions and **screenshot tests** for visual validation to avoid regressions.
    2. Pay extra attention not to skip this step.

### Logic Consolidation

*   **Trigger Condition**: Baseline tests green (or respective previous pass
    staged).
*   **Subskill to Import**: `ui-eng-vision-logic-consolidator`
*   **Actions**:
    1.  Extract manual elements, constructor DOM configurations, and imperative
        updates into private update helper methods with structured
        state-passing.

### Local Lit-HTML Rendering (Technology Migration)

*   **Trigger Condition**: Previous pass staged.
*   **Subskill to Import**: `ui-eng-vision-local-lit-renderer`
*   **Actions**:
    1.  Migrate imperative elements to declarative templates (using component
        mapping rules defined inside the subskill) and render them locally
        within the existing view.

### Widget Promotion (Architectural Bridge)

*   **Trigger Condition**: Both local template rendering and logic consolidation
    staged.
*   **Subskill to Import**: `ui-eng-vision-widget-promoter`
*   **Actions**:
    1.  Promote view classes to modern `UI.Widget` classes, hook up
        `performUpdate()` delegates, export the default view layout, and clean
        up legacy wrappers.
