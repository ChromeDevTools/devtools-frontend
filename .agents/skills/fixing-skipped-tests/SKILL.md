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
   - Search the codebase for the `<bugid>` to find skipped tests.
   - You should look for occurrences like `it.skip('[crbug.com/<bugid>] ...', ...)` or skipped describes that mention the bug ID.

4. **Iterative Fix Process**
   - **Step 1:** Change `it.skip` or `describe.skip` to `it.only` or `describe.only` for *one* of the tests associated with the bug, so that only that specific test runs.
   - **Step 2:** Re-run the tests (e.g., `npm run test -- <path_to_test_file>`) using the guidelines from the `devtools-verification` skill.
   - **Step 3:** Analyze the test failure and make the necessary fixes to the code or the test itself.
   - **Step 4:** Re-run the test to ensure the fix is correct. Remove `.only`.
   - **Step 5:** Remove the `[crbug.com/<bugid>]` prefix from the test name string if it is present.
   - **Step 6:** Remove any comments directly above the test that explain the reason why the test was skipped (e.g., `// TODO(crbug...): Flaky`).
   - **Step 7:** Apply the fix to the remaining tests, un-skipping them one by one or in batches, and verifying until all are passing.

5. **Verify Full Build**
   - Before finishing, run the full verification process (TypeScript checks, linters, full test run) as required by the repository best practices.
