---
name: code-review
description: Generic checklist for reviewing DevTools CLs (your own before upload, or someone else's on Gerrit). Covers test correctness (tautological/vacuous tests, cleanup, leaks), code clarity, CL hygiene, and points to the specialized skills to consult for imports, UI, testing, strings, models, and verification. Use when asked to review a CL, a diff, a patch, or to self-review before `git cl upload`.
---

# Code Review

This checklist comes from recurring reviewer feedback on landed DevTools CLs.
Use it for self-review before upload and for reviewing other people's CLs.

## 1. Gather context

- **Automated Review Agent (diff already in prompt):** Do not run shell
  commands. Use `read_file` to inspect enclosing classes/functions/tests and
  `search_files` to verify callers or conventions across the repository.
- **Local CLI / Interactive session (no diff in prompt):**
  - **Local change:** `git diff origin/main...HEAD` (or `git show HEAD` for a
    single-commit branch). To learn about the branch and upload workflow, see the
    `devtools-version-control` skill.
  - **Gerrit CL:** strip the leading `)]}'` line from each response to get JSON:
    - Diff: `git cl diff` (for the current branch), or fetch the patch set.
    - Inline comments:
      `curl -s https://chromium-review.googlesource.com/changes/devtools%2Fdevtools-frontend~<CL_NUMBER>/comments | tail -n +2`
    - Messages:
      `.../changes/devtools%2Fdevtools-frontend~<CL_NUMBER>/messages`
  - Read the CL description first. Then check that the diff does what the
    description says, and nothing else.

## 2. Consult the specialized skills

Load the skill that matches what the diff touches, and apply its rules:

| If the diff touches… | Use skill |
| :--- | :--- |
| Any `import` statement, or a new cross-module dependency | `devtools-imports` |
| `UI.Widget`, lit-html views, components, CSS | `ui-widgets` |
| Migration of legacy imperative DOM to widgets or Lit | `ui-eng-vision-orchestrator` (and its sub-skills) |
| New or changed tests: choosing unit, API, or E2E | `devtools-testing-guidance` |
| Tests that use `describeWithEnvironment` or `describeWithMockConnection`, or foundation modules | `foundation-test-migration` |
| Ported Chromium web tests (`web_tests/http/tests/devtools`) | `migrate-chromium-test` |
| Flaky or disabled tests, or `it.skip` / `it.skipOnPlatforms` | `fix-tests` |
| `UIStrings` / user-facing text | `devtools-ux-writing-refactor` |
| Rendering user-controlled strings (URLs, names, console text) | `devtools-unicode-escaping` |
| `front_end/models/*`, `BUILD.gn`, `devtools_grd_files.gni`, entrypoints | `devtools-model-management` |
| Merging modules or consolidating `BUILD.gn` | `merging-devtools-module` |
| `Settings` registrations and descriptors | `devtools-setting-migration` |
| Stack traces, source maps, `DebuggerWorkspaceBinding` | `devtools-source-maps` |
| Building, running tests, or lint | `devtools-verification` |

## 3. Test correctness (the most common review feedback)

- **Tautological tests:** A test must exercise real production code. If a
  mock does the thing the test asserts (for example, a mocked `DOM.undo` that
  calls `removeSection()` directly, followed by an assertion that the section
  was removed), the test checks the mock and nothing else. Mock the *boundary*
  instead (for example, have the CDP stub emit `CSSModel.Events.StyleSheetChanged`)
  and let production code react to it.
- **Vacuous tests:** Look for local promises or data that are never connected
  to DevTools logic, or stubs (like `initialize`) that skip the code path under
  test. These tests pass because nothing happens.
- **Assertions that check the setup:** For example,
  `assert.isNull(pane.node())` right after `pane.setNodeForTest(null)`. Each
  assertion should verify the behavior that the test name describes.
- **Test lives where it belongs:** A test in `Foo.test.ts` should exercise
  `Foo`. Move logic-only tests to the model's test file (for example,
  `CSSMatchedStyles.test.ts`). Otherwise, render the UI and assert on the DOM.
- **Test covers the scenario it claims:** For example, an "iframe event
  listeners" test must select a node *inside* the iframe. It is not enough
  that it passes on `<body>` of the main frame.
- **Right suite:** Ask whether an E2E test could be a unit test, or whether the
  E2E coverage is intentional for a user story. See `devtools-testing-guidance`.
- **E2E selectors match real UI:** Labels and `aria-label`s must match the
  actual strings, for example "Show user agent shadow DOM" and not "User agent
  shadow DOM". Check that the setting being toggled actually affects the
  scenario.
- **Fail fast:** Throw or assert when a required value is missing. Don't let
  the test time out later.

## 4. Test hygiene and cleanup

- Pair every `beforeEach` singleton creation with a cleanup in `afterEach`
  (for example, `CSSWorkspaceBinding.removeInstance()` or
  `WorkspaceImpl.removeInstance()`) so that state does not leak between tests.
- Restore fake timers in `try { … } finally { clock.restore(); }`, or use the
  sandbox or cleanup that the test runner provides. Keep the scope of fake
  timers small.
- Don't stub the same method twice without calling `restore()` first. Sinon
  throws `Attempted to wrap … which is already wrapped` when the object is the
  same instance.
- Remove guards that were copied from helpers for no reason (for example,
  `if (!stub.called) …` in a test that stubs the method only once).

## 5. Code clarity

- Don't take detours to reach a value. If a module is imported, call
  `TextUtils.TextRange.TextRange.fromObject(...)` directly instead of going
  through `rule.style.range.constructor`.
- Look for dead code, leftover debug code, commented-out blocks, and unrelated
  formatting churn.
- Check that the change stays in scope. Flag unrelated refactors that should be
  split into a separate CL.
- Check for lifecycle issues: event listeners and observers that are added
  without being removed, and async work that continues after a widget is
  detached.

## 6. CL hygiene

- The description explains *why*, including external dependencies (for
  example, "V8 will stop emitting X; this must land first").
- Include a `Bug:` or `Fixed:` trailer, or `Bug: None`. Keep lines under 72
  characters.
- For migrations and stacked series, list the legacy tests or files covered,
  and number the series (for example, `(13/16)`).
- Disabled tests reference a bug.
- Presubmit, lint, and format pass. See `devtools-verification`.

## 7. Writing review comments

- Be specific: cite file and line, explain the concrete failure mode (such as
  a leak, a hang, or "passes vacuously"), and suggest a fix. Include a code
  snippet when it helps.
- Separate blocking issues from nits and questions (for example, "Should we
  move this to a unit test?").
- When a reviewer's concern is not an actual bug, reply with the rationale.
  Don't make a silent change.
