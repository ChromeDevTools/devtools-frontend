---
name: devtools-testing-guidance
description: Guidance on selecting the appropriate test suite (Unit, API, or E2E tests) when writing new tests in Chrome DevTools. MUST be used when writing new tests.
---

# Testing Guidance

This guide outlines when and how to select the appropriate test suite when writing new tests in Chrome DevTools.

> [!NOTE]
> This skill provides guidance on **which** test suite to choose when writing tests. To learn **how** to run tests, build targets, or execute linters, refer to the `devtools-verification` skill.

## Choosing a Test Suite

### 1. Unit Tests

**Default choice:** The vast majority of tests in DevTools should be unit tests.

Use unit tests for isolated testing of individual functions, classes, models, helpers, and UI components.

- **Utilities & Framework:**
  - Use `TestUniverse` (and foundation test helpers) for easy, isolated setup of required dependencies and models.
  - For testing UI widgets, use stubbed view functions and screenshot assertions rather than spinning up heavy DOM/browser infrastructure.
- **Location:** Co-located next to their implementation files (e.g. `TimelinePanel.ts` and `TimelinePanel.test.ts`).
- **BUILD.gn**: test file should be added to `devtools_ui_module("unittests")` or `devtools_foundation_module("foundation_unittests")` target in the corresponding `BUILD.gn` file.

---

### 2. API Tests

Use API tests for integration tests that verify business logic requiring more complex setups or extensive CDP (Chrome DevTools Protocol) traffic, without needing the full DevTools frontend UI.

- **When to use:**
  - Evaluating JavaScript expressions in the target page (e.g. via `Runtime.evaluate`).
  - Complex source map setups and symbolization.
  - Multi-context or target setups (workers, iframes, OOPIFs).
  - Tests that require extensive CDP mock setup.
  - Verifying the "foundational layer" of DevTools models against a real browser/web page.
- **Location:** Defined in `front_end/` with `.test.api.ts` extension (e.g. `Universe.test.api.ts`).
- **BUILD.gn**: test file should be added to `devtools_api_test_module("api_tests")` target in the corresponding `BUILD.gn` file.

---

### 3. End-to-End (E2E) Tests

Use E2E tests to verify real end-to-end user stories and user journeys.

- **When to use:**
  - Verifying full user journeys across DevTools panels and drawers.
  - Complex UI behaviors that require extensive user interaction setup and benefit from a complete DevTools frontend page connected to an inspected target page over CDP.
- **Location:** Defined in `test/e2e/` (e.g. `test/e2e/console/console-log.test.ts`).
- **Test functions:** import `describe`, `it` and `setup` from `test/e2e/conductor/mocha-interface.ts` (e.g. `import {describe, it} from '../conductor/mocha-interface.js';`). They are not available as globals.
- **BUILD.gn**: test file should be added to the `node_ts_library` target in the corresponding `BUILD.gn` file, which needs `"../conductor:implementation"` in its `ts_deps`. And `node_ts_library` in `test/e2e/BUILD.gn` for its dependencies.
