---
name: ui-eng-vision-orchestrator
description: High-level orchestrator for managing multi-pass migration of Chrome DevTools legacy components to the modern UI engineering vision (UI.Widget & Lit-html).
allowed-tools: code_search open_urls search_changelists data_analysis import_skill close_skill invoke_subagent send_message
---

# UI Engineering Vision Orchestrator: Meta-Skill Instructions

This meta-skill acts as the central coordinator for modernizing legacy Chrome
DevTools views into declarative `UI.Widget` components based on lit-html,
managing a multi-pass sequential CL pipeline to ensure each code modification is
small, testable, and highly reviewable.

Refer to [ui_engineering.md](../../../docs/ui_engineering.md) for general
principles.

--------------------------------------------------------------------------------

## 🛑 Critical Constraints & Forbidden Actions

1.  **NEVER Break the Build**: Code must compile and tests must pass at all steps. If you change a class API or method signature, you **MUST** update its usage in the same CL to maintain stability.
2.  **Strict Intermediate Stability**: Do not leave the code in a broken state between passes.
3.  **No Beautification of Adjacent Code**: Do NOT fix unrelated typos, formatting issues, or lint warnings in code you aren't actively migrating.
4.  **No Monolithic Refactors**: Do NOT batch Lit conversion and Widget Promotion in the same pass. Keep CLs small and focused.


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
4.  **Hybrid Files/Multiple Classes**: Files may contain multiple classes in
    different states of modernization (e.g., one partially migrated class and
    one fully legacy class). If the file being migrated contains several
    classes, the migration needs to be done separately for each class, starting
    with the leaves and going up the dependency chain. Propose modifications
    only for classes with actual violations.
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
8.  **Strict Intermediate Stability**: The code must compile and work correctly,
    and all tests must pass after each step. You **MUST** update usages if you
    change APIs.
9.  **Establish Comprehensive Guardrails First**: Ensure both **logic tests**
    (verifying presenter interactions and state updates) and **screenshot
    tests** (verifying layout/styling) exist before rewriting code. If coverage
    is missing, scaffold it first.
10. **Pre-flight Clarification**: Before starting, verify if the task is
    underspecified or ambiguous. If so, point this out and ask for
    clarifications before proceeding.
11. **Step Sizing & Complexity Assessment**: Assess the complexity of each step
    beforehand. Aim for intermediate steps that involve changing or adding
    roughly 300 lines of code. If a step is predicted to be too complex, break
    it down into smaller substeps. The agent must stop and report back after
    each step or substep to allow verification.
12. **Context Hygiene via Subagents**: To keep the main conversation context
    clean and focused on high-level orchestration, prefer delegating intense
    execution tasks (like running tests, debugging compilations, or processing
    independent classes in parallel) to specialized subagents.
13. **Cross-Repo Runtime Coupling Check (`legacy_test_runner` & `blink/web_tests`)**:
    Before converting TypeScript `private` fields/methods to ES `#private` or
    removing widget properties (e.g., `.tabbedPane`, `.sidebarPaneStack`,
    `.threadsSidebarPane`, `.searchInputElement`), search both
    `front_end/legacy_test_runner/**/*.js` and Chromium's
    `third_party/blink/web_tests/http/tests/devtools/**/*.js` (which run on
    `dtf_linux_rel` CQ via `blink_web_tests` and reflectively access private
    members in untyped JS). Keep accessed members as TypeScript `private` with a
    `// Accessed in web_tests / legacy_test_runner` comment, or migrate the
    web_tests first in a dedicated CL.
14. **Strict CL Splitting Rules**:
    *   **One Class Per CL for Hybrid Files**: When modernizing files containing
        multiple classes, extract or migrate secondary classes (e.g.,
        `QuickSourceView`) into their own dedicated CLs.
    *   **Separate Infrastructure CLs**: Keep shared `ui/legacy` or component
        infrastructure changes (e.g., `bindToAction`, `SplitWidget`,
        `WrapperWidget`) in separate, preceding CLs. Always verify with
        `cog_api.py diff` before uploading that no changes from later commits
        leaked into earlier infrastructure CLs.



--------------------------------------------------------------------------------

## 2. Multi-Pass Execution Lifecycle

### Plan Generation (Gated)

*   **Actions**:
    1.  Verify if the task is underspecified or ambiguous. If so, ask for
        clarifications first.
    2.  Scan the target file to determine size, complexity, legacy elements
        (e.g., `ReportView`, `ToolbarButton`, `DataGrid`, `TreeOutline`), and
        actual class inheritance. Deconstruct the file mentally (or in the plan)
        into **Business Logic** (state, event handlers) and **Rendering Logic**
        (DOM creation, CSS classes). Reference code elements by **Name** (not
        line numbers) to ensure the plan remains valid as the codebase evolves.
        Check if the class dependencies have been migrated to the ui eng vision
        or not. If the file contains multiple classes, plan the migration
        separately for each class, starting with the leaves and going up the
        dependency chain.
    3.  Check the files depending on this file, to understand how the code in
        this file is being used.
    4.  **Dynamic Ordering Decision**: Determine whether to run Logic
        Consolidation first or Local lit-html rendering first:
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
    5.  Generate a `migration_plan.md` using the **Structured Plan Template** below.
    6.  Halt execution and print the formatted plan in Markdown to the chat.
        Wait for user approval.

### 📝 Structured Plan Template
The plan you generate **MUST** follow this structure:

```markdown
# Migration Plan: [FileName.ts]

## 📊 Current State
- **Hybrid File**: [Yes/No]
- **Classes Found**: [ClassA, ClassB]
- **Strategy Selection**: [Option A (Logic First) | Option B (Tech First)]

## 🛠️ Passes Checklist
- [ ] **Pass 0: Baseline & Safety Scaffolding**
  - Assigned to: `ui-eng-vision-test-scaffolder`
- [ ] **Pass 0.5: Privatize & Dead-Code Cleanup**
  - Mechanical prefactor: convert TypeScript `private` to ES `#private` and remove dead code
- [ ] **Pass 1: Logic Consolidation**
  - Assigned to: `ui-eng-vision-logic-consolidator`
- [ ] **Pass 2: Lit-HTML Rendering**
  - Assigned to: `ui-eng-vision-local-lit-renderer`
- [ ] **Pass 3: Widget Promotion**
  - Assigned to: `ui-eng-vision-widget-promoter`
```


### Baseline & Safety Scaffolding

*   **Trigger Condition**: User explicitly says "I accept the plan" or
    equivalent.
*   **Subskill to Import/Delegate**: `ui-eng-vision-test-scaffolder` (Delegate to a subagent to encapsulate verbose test logs)
*   **Actions**:
    1.  Verify existing test coverage. Propose and add missing **logic tests**
        for interactions and **screenshot tests** for visual validation to avoid
        regressions.
    2.  Pay extra attention not to skip this step.

### Privatize & Dead-Code Cleanup (Pass 0.5)

*   **Trigger Condition**: Baseline tests green.
*   **Actions**:
    1.  Perform the **Cross-Repo Runtime Coupling Check** against `legacy_test_runner` and `blink_web_tests` first.
    2.  Convert internal TypeScript `private` fields/methods to ES `#private` (except those reflectively accessed by web tests).
    3.  Identify and remove unused dead code, redundant containers, or obsolete split widgets in a dedicated prefactor CL so mechanical renames don't clutter logic and view CLs.
    4.  Verify that all tests and lints pass and stage this prefactor CL before proceeding to logic consolidation.

### Logic Consolidation

*   **Trigger Condition**: Pass 0.5 staged (or baseline tests green if 0.5 skipped).
*   **Subskill to Import/Delegate**: `ui-eng-vision-logic-consolidator` (Delegate to a subagent to maintain focus)
*   **Actions**:
    1.  Extract manual elements, constructor DOM configurations, and imperative
        updates into private update helper methods with structured
        state-passing.

### Local Lit-HTML Rendering (Technology Migration)

*   **Trigger Condition**: Previous pass staged.
*   **Subskill to Import/Delegate**: `ui-eng-vision-local-lit-renderer` (Delegate to a subagent for isolated template generation)
*   **Actions**:
    1.  Migrate imperative elements to declarative templates (using component
        mapping rules defined inside the subskill) and render them locally
        within the existing view.

### Widget Promotion (Architectural Bridge)

*   **Trigger Condition**: Both local template rendering and logic consolidation
    staged.
*   **Subskill to Import/Delegate**: `ui-eng-vision-widget-promoter` (Delegate to a subagent for final architectural cleanup)
*   **Actions**:
    1.  Promote view classes to modern `UI.Widget` classes, hook up
        `performUpdate()` delegates, export the default view layout, and clean
        up legacy wrappers.
