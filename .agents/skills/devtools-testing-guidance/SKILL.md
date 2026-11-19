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
  - Do **not** use `describeWithEnvironment` or `describeWithMockConnection` in new or migrated unit tests. Use plain `describe` (`import {describe, it} from 'mocha';`) with `TestUniverse` (`front_end/testing/TestUniverse.js`) and modular setup hooks (`setupLocaleHooks()`, `setupSettingsHooks()`, `setupRuntimeHooks()`; see `foundation-test-migration`) for isolated setup of required dependencies and models.
  - For testing UI widgets, use stubbed view functions and screenshot assertions rather than spinning up heavy DOM/browser infrastructure.
- **Location:** Co-located next to their implementation files (e.g. `TimelinePanel.ts` and `TimelinePanel.test.ts`).
- **Test functions:** import `describe`, `it`, `beforeEach`, etc. from `mocha` (e.g. `import {describe, it} from 'mocha';`). They are not available as globals.
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
- **Test functions:** import `describe`, `it` and `setup` from `test/api/mocha-interface.ts`. They are not available as globals.
- **BUILD.gn**: test file should be added to `devtools_api_test_module("api_tests")` target in the corresponding `BUILD.gn` file, which needs `test/api` in its `ts_deps`.

---

### 3. End-to-End (E2E) Tests

Use E2E tests to verify real end-to-end user stories and user journeys.

- **When to use:**
  - Verifying full user journeys across DevTools panels and drawers.
  - Complex UI behaviors that require extensive user interaction setup and benefit from a complete DevTools frontend page connected to an inspected target page over CDP.
- **Location:** Defined in `test/e2e/` (e.g. `test/e2e/console/console-log.test.ts`).
- **Test functions:** import `describe`, `it` and `setup` from `test/e2e/conductor/mocha-interface.ts` (e.g. `import {describe, it} from '../conductor/mocha-interface.js';`). They are not available as globals.
- **BUILD.gn**: test file should be added to the `node_ts_library` target in the corresponding `BUILD.gn` file, which needs `"../conductor:implementation"` in its `ts_deps`. And `node_ts_library` in `test/e2e/BUILD.gn` for its dependencies.

---

## Test Discovery & Naming Pitfalls

### GN Metadata Manifests in `front_end/BUILD.gn`

Karma and Node test runners execute **only** the compiled test files listed in the GN `generated_file` manifests defined in `front_end/BUILD.gn`:

- `generated_file("test_inputs")` writes `tests.txt` from `data_keys = ["tests"]` metadata collected across `group("unittests")`.
- `generated_file("foundation_test_inputs")` writes `foundation_tests.txt` from `group("foundation_unittests")`.
- `generated_file("api_test_inputs")` writes `api_tests.txt` from `group("api_tests")`.

Watch out for two GN pitfalls:

- **Unreachable subdirectory targets never run:** Adding a new `devtools_ui_module("unittests")` (e.g. `panels/foo/components:unittests`), `devtools_foundation_module("foundation_unittests")`, or `devtools_api_test_module("api_tests")` target in a subdirectory `BUILD.gn` does nothing unless `front_end/BUILD.gn` reaches it through the matching root `group(...)`. Build, lint, and presubmit do not warn when a test target is unreachable; always verify the test runs with a non-zero test count (see `devtools-verification`).
- **No empty `api_tests` targets:** GN (`ts_library`) rejects empty `devtools_api_test_module("api_tests")` targets with zero `sources`. Only define an `api_tests` target when it lists at least one `.test.api.ts` file, and remove both the target and its `front_end/BUILD.gn` `group("api_tests")` entry when deleting its last test file.

### Duplicate Test ID Collisions (`MochaHelpers.checkForDuplicateTests`)

`MochaHelpers.checkForDuplicateTests` (`front_end/testing/MochaHelpers.ts`) normalizes Mocha suite and `it()` titles into lowercase ASCII test IDs by stripping non-ASCII characters, lone surrogates, BiDi controls, and most control characters (`TestIdGeneration.ts`). When writing parameterized `it()` loops over control characters, surrogates, or non-ASCII strings, give each test case an explicit, distinct ASCII `label` instead of interpolating raw inputs or `JSON.stringify(value)` into the `it()` title; otherwise normalized titles collide with `Duplicate test <testId>`.
