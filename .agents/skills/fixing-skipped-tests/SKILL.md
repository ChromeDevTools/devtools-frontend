---
name: fixing-skipped-tests
description: Use this skill when unskipping a test that was previously skipped.
---
# Fixing Skipped Tests

This skill outlines the workflow for fixing skipped tests in the DevTools codebase, typically given a Chromium bug link (e.g., `crbug.com/1234567`).

## Workflow

1. **Extract the Bug ID**
   - The input is typically a bug link like `crbug.com/<bugid>`. Extract the `<bugid>` from the link.

2. **Create a Branch**
   - Create a new branch named `fixed-<bugid>`.
   - Ensure you use the instructions from the `devtools-version-control` skill to create and switch branches appropriately.

3. **Search for the Skipped Tests**
   - Search the `test/TestExpectations` file for the `<bugid>` to find skipped tests.
   - Tests are no longer skipped using `.skip` in the code, but rather by having a `[ Skip ]` expectation in `test/TestExpectations`.

4. **Iterative Fix Process**
   - **Step 1:** Remove the `[ Skip ]` expectation for *one* of the tests associated with the bug in `test/TestExpectations` (or change it to `[ Pass Failure ]` if you are investigating flakiness).
   - **Step 2:** Re-run the specific test using its exact test ID (e.g., `npm run test path/to/foo.test.ts:test_name`) using the guidelines from the `devtools-verification` skill. If you are dealing with flaky tests, you can use the `--repeat=x` flag (e.g. `npm run test -- --repeat=20 path/to/foo.test.ts:test_name`) to run the test multiple times to reproduce the flakiness. This flag works for both E2E and unit tests.
   - **Step 3:** Analyze the test failure and make the necessary fixes to the code or the test itself.
   - **Step 4:** Re-run the test to ensure the fix is correct.
   - **Step 5:** Remove the `[crbug.com/<bugid>]` prefix from the test name string in the code if it is present.
   - **Step 6:** Remove any comments directly above the test in the code that explain the reason why the test was skipped (e.g., `// TODO(crbug...): Flaky`).
   - **Step 7:** Apply the fix to the remaining tests, un-skipping them one by one or in batches by modifying `test/TestExpectations`, and verifying until all are passing.

5. **Verify Full Build**
   - Before finishing, run the full verification process (TypeScript checks, linters, full test run) as required by the repository best practices.
