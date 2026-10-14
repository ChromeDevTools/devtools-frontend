---
name: ui-eng-vision-logic-consolidator
description: Consolidates manual DOM creation, updates, and constructors into private helper methods and structured state interfaces.
allowed-tools: code_search open_urls
---

# Subskill: Logic Consolidator (Pass 1)

This subskill extracts manual layout building, attribute modifications, and
rendering loops out of the constructor and scattered event handlers,
consolidating them into private helper methods with explicit data contracts.

--------------------------------------------------------------------------------

## 1. Logic Consolidation Rules

1.  **Identify UI updates Creation**:

    *   Scan the class constructor and search for manual DOM operations (e.g.,
        `element.createChild('div')`, `document.createElement`,
        `element.appendChild`).
    *   Also look for any UI updates which call lit-html `render`.

2.  **Isolate Update and Draw Operations**:

    *   Group the imperative creation/update lines into dedicated private helper
        methods (e.g., `#updateSummaryBar(...)` or `#createEditorToolbar(...)`).
    *   Group event-handling updates (e.g., state variables like `pageSize`,
        modified during buttons clicks) into centralized functions like
        `onPageSizeChanged`.

3.  **Define the State Interface**:

    *   Identify the class state and ensure it is captured in the private member
        variables, e.g.

        ```typescript
        #entries: Entry[];
        #canGoBack: boolean;
        #canGoForward: boolean;
        #staleWarningVisible: boolean;
        ```

    *   Replace direct mutations of UI with updates to these member variables,
        followed by a call to the public `performUpdate()` method that is
        calling previously extracted update helpers. Use this specific
        identifier.

    *   If there's only one or two update helpers, consider inlining them into the
        `performUpdate`.

4.  **Extract/Consolidate Rendering Operations**:

    *   If Logic First (imperative DOM remains), make sure all updates to the UI
        go through the performUpdate method
    *   If Lit First (Lit template already exists), make sure there's a single
        master call to Lit render inside performUpdate. The master template
        might include calls to the helper functions e.g.

        ```typescript
        render(html`
          <div class="specific-view">
            <span>View Title</span>
            ${this.renderOverviewSection()}
          </div>
        `, this.contentElement);
        ```

5.  **Minimize Diffs (Safety Rule)**:

    *   Avoid moving existing code to a different location in the file. Put the
        function signature around the existing code to minimize the diff.
    *   The Gerrit Code Review UI cannot identify moved blocks of unchanged
        code.
    *   If blocks of code need to be reordered, create a "prefactoring" change
        that first extracts the code that needs to be reordered into named
        helper functions and pause the migration, waiting for user confirmation.

6.  **No Write-Only State Fields in Prefactor CLs**:

    *   Do not introduce `#state` fields in a logic-consolidation CL that are only
        written to in that CL and only read in the *next* CL's `DEFAULT_VIEW`.
    *   Either read them in the prefactor CL (e.g., inside an extracted imperative
        `#render...` helper) or introduce them in the CL that actually adds
        `DEFAULT_VIEW`.

7.  **Extract Imperative `#renderSubtreeContent()` Helpers**:

    *   For complex layouts, extracting an imperative `#renderFooContent()`
        helper in Pass 1 (while keeping the outer container imperative) minimizes
        the Pass 2/3 diff when converting `#renderFooContent()` to
        `renderFooContent(input: ViewInput): LitTemplate`.

8.  **Preserve Imperative Cleanup Calls**:

    *   When consolidating DOM/widget references (e.g., replacing
        `#tabbedLocationHeader` with `#debuggerSidebarTabbedLocation`), preserve
        imperative cleanup calls like `splitWidget.uninstallResizer(...)` until the
        imperative container itself is removed.

9.  **Wait for confirmation**:

    *   Wait for an explicit confirmation from the user (or Parent Orchestrator Agent) before proceeding to the next step.

--------------------------------------------------------------------------------

## 🔍 Mental Audit (Internal Self-Correction)

*Before reporting back or committing, re-read the instructions and verify:*
1.  ❓ **Minimal Diffs**: Did I move code blocks around unnecessarily?
2.  ❓ **State Completeness & Utility**: Are all state variables actually read in this CL, with no write-only placeholders?
3.  ❓ **Cleanup Preserved**: Are resizer/listener uninstallation calls preserved during reference consolidation?
4.  ❓ **Build**: Does the code still compile?


