---
name: ui-eng-vision-test-scaffolder
description: Scaffolds unit tests and screenshot tests to establish visual and functional rendering baselines for views before refactoring.
allowed-tools: code_search open_urls
---

# Subskill: Test Scaffolder

This subskill establishes the safety net of existing and new visual/functional
tests before any codebase modifications occur, ensuring that no rendering or
logical regressions are introduced during modernization.

--------------------------------------------------------------------------------

## 1. Test Verification Lifecycle

1.  **Verify Existing Tests**:

    *   Inspect the corresponding unit test file (e.g., `IndexedDBViews.test.ts`
        for `IndexedDBViews.ts`) under the target folder or `test/unittests/`.
    *   Check for **logic tests** (verifying presenter interactions and view function callbacks).
    *   Check for screenshot or interaction tests (under `test/interactions/` or
        `test/goldens/`) matching the visual component to verify layout and styling.

2.  **Detect Sub-component Testing Gaps (Hybrid Files)**:

    *   Identify if the existing test suite only covers one class of a hybrid
        file while missing another class being migrated (e.g., tests exist for
        `IDBDatabaseView` but are scarce/missing for `IDBDataView`).

3.  **Scaffold Missing Tests**:

    *   If **logic tests** are missing, draft tests verifying that callbacks trigger the expected state updates or model interactions.
    *   If **rendering/screenshot tests** are missing or inadequate for the legacy class being
        migrated, draft a basic Mocha/Chai rendering test.
    *   Verify that the component compiles and mounts successfully inside a
        synthetic DOM helper or unit-test container.
    *   **Screenshot Tests**: Create screenshot tests to establish visual baselines before refactoring. Follow the pattern seen in `CategorizedBreakpointsSidebarPane.test.ts`:
        *   First run the test having `renderElementIntoDOM` with `{includeCommonStyles: true}` to ensure styles are applied.
        *   The first run will generate the screenshot.
        *   Now try removing `{includeCommonStyles: true}` to see if class is
            adding the styles itself. If the test pass, keep the version without
            `{includeCommonStyles: true}`. Otherwise, bring it back.
        *   Screenshot tests are unittests that render either the full widget (if not migrated to the MVP architecture) or its view function (if already in MVP shape).
        *   When testing view-separated components, prefer testing the View function (e.g., `DEFAULT_VIEW`) directly by passing mock state and callbacks.
        *   Use `assertScreenshot` to capture and verify the visual output.
        *   Example structure:

            ```typescript
            it('renders the view', async () => {
              const target = document.createElement('div');
              renderElementIntoDOM(target, {includeCommonStyles: true});
              MyComponent.DEFAULT_VIEW(mockViewInput, undefined, target);
              await assertScreenshot('my_component/base.png');
            });
            ```

4.  **Wait for confirmation**:

    *   Wait for an explicit confirmation from the user (or Parent Orchestrator Agent) before proceeding to the next step.

--------------------------------------------------------------------------------

## 2. Environment Detection & Test Execution Guide

Always detect the execution environment first to run tests successfully:

### Scenario A: Google-Internal Cog Workspaces (PRIMARY PATH for Google Workspaces)

*   **Detection**: Triggered if the workspace path starts with `/google/cog/` or
    `/google/src/`.
*   **Execution Guide**: Follow [`devtools-verification`](../devtools-verification/SKILL.md).
*   **Resolution Steps**:

    1.  Ensure `depot_tools` is at the front of your `PATH`:

        ```bash
        export PATH="/path/to/depot_tools:$PATH"
        ```

    2.  Execute tests using `./dt test` directly from `chromium/third_party/devtools-frontend/src`:

        ```bash
        ./dt test front_end/panels/application/IndexedDBViews.test.ts
        ```

### Scenario B: Standard Chromium Environment (Fallback)

*   **Detection**: Triggered if in an open-source or local standard Chromium
    checkout without Cog paths.
*   **Troubleshooting vpython3 / depot_tools errors**:

    *   **Symptom**: Command fails with `vpython3: command not found` or
        `python3_bin_reldir.txt not found`.
    *   **Resolution Steps**:

        1.  Export `depot_tools` path:

            ```bash
            export PATH=$PATH:/path/to/depot_tools
            ```

        2.  Initialize the depot_tools binaries by running update/gclient help
            once from the checkout root:

            ```bash
            update_depot_tools
            ```

        3.  Execute the tests:

            ```bash
            ./dt test front_end/panels/application/IndexedDBViews.test.ts
            ```

### Scenario C: ESLint TS Module Resolution Failure (ERR_UNKNOWN_FILE_EXTENSION)

*   **Symptom**: Running lint checks fails with: `TypeError
    [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts" for
    scripts/eslint_rules/...`
*   **Resolution Steps**:

    1.  Compile the custom eslint rules and build assets first so that Node can
        parse the rules:

        ```bash
        ./dt build
        ```

### Scenario D: Screenshot Test Fails (Visual Diffs > 0%)

*   **Symptom**: The test runs but fails with a percentage difference in visual regression.
*   **Resolution Steps**:
    1.  Do **NOT** ask the user to accept the new screenshot yet.
    2.  Inspect the failure log to see if it is a **layout shift** or a **missing style**.
    3.  If it's a layout shift, check if you replaced a block element with an inline element (e.g. `div` -> `span`).
    4.  If styles are missing, verify if the test wrapper needs `{includeCommonStyles: true}`.

### Scenario E: Lightweight Test Hook Gotchas (`describe` vs `describeWithEnvironment`)

*   Prefer `describe` with lightweight hooks (`setupLocaleHooks()`, `setupSettingsHooks()`) when full `describeWithEnvironment` is unnecessary.
*   **Always reset singleton registries in `afterEach`**:
    When registering actions, shortcuts, or context menus in tests, singleton registries MUST be reset in `afterEach`:

    ```typescript
    afterEach(() => {
      UI.ActionRegistration.reset();
      UI.ActionRegistry.ActionRegistry.reset();
      UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
    });
    ```

    Without these resets, repeated runs (such as `--repeat=10` or CQ flake detection) will fail on iteration 2+ with `Duplicate action ID: '...'`.

*   **GlassPane Container Setup**:
    If testing UI that opens a `GlassPane` or long-press option menu (e.g. `bindToAction` with long-press buttons) in a test suite using `describe` without `describeWithEnvironment`, call:

    ```typescript
    beforeEach(() => {
      UI.GlassPane.GlassPane.setContainer(document.body);
    });
    ```

    Otherwise, menu rendering will fail because `GlassPane` lacks an attached container element.

--------------------------------------------------------------------------------

## 🔍 Mental Audit (Internal Self-Correction)

*Before reporting back or committing, re-read the instructions and verify:*
1.  ❓ **Coverage**: Did I cover all classes in the file, or only the main one?
2.  ❓ **Stability**: Can the tests run repeatedly without flakiness?
3.  ❓ **Integrations**: Did I verify that the component mounts correctly?
