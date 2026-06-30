---
name: devtools-migrate-chromium-test
description: Use when migrating chromium `third_party/blink/web_tests/http/tests/devtools/` tests to modern unit tests in `third_party/devtools-frontend/src/front_end/`.
---

# Migrating Legacy DevTools Tests

The skill should be used from within a Chromium check out. The agent should make a devtools CL for the changes in `third_party/devtools-frontend`.

## Workflow

1.  **Identify the Test to Move**:

- Locate the legacy test file (usually `.js`) and its expectation file (`-expected.txt`) in `third_party/blink/web_tests/http/tests/devtools/`.
- Example: `unit/datagrid-editable-longtext.js`

2.  **Identify the Target Location**:

- Find the file being tested in `third_party/devtools-frontend/src/front_end/`.
- Place the new test file next to the file being tested, following the naming convention `[FileName].test.ts`.
- Example: If testing `ui/legacy/components/data_grid/DataGrid.ts`, the test should be `ui/legacy/components/data_grid/DataGrid.test.ts`.

3.  **Convert the Test Content**:

- Rewrite the test from the legacy `TestRunner` style to the modern Mocha/Chai style used in DevTools.
- Use `describeWithEnvironment` or `describe` as appropriate.
- Replace `TestRunner.addResult` and expectation comparisons with standard assertions (`assert.strictEqual`, `assert.isTrue`, etc.).
- If the test requires rendering, use `renderElementIntoDOM` to attach elements to a test container.
- If testing legacy components that require internal tokens or have private methods, try to use public APIs or events instead. If impossible, consider using structural typing workarounds or updating the component to be more testable.
- If tests require a repetitive setup extract it into a test helper function at the top of the file.

4.  **Update BUILD.gn**:

- Add the new test file to the `sources` list of the `devtools_ui_module("unittests")` or `devtools_foundation_module("foundation_unittests")` target in the corresponding `BUILD.gn` file.

5.  **Verify the Changes**:

- Build the unittests target: `autoninja -C out/Default <target_path>:unittests`
- Run the test using the DevTools test runner: `npm run test -- <relative_path_to_test>`
- Ensure the test passes.

6.  **Clean Up**:

- Delete the original legacy test file and its expectation file from `third_party/blink/web_tests/...`.
- _(Optional)_ If instructed by the user, you may leave the files or handle them differently.

## Example Conversion

### Legacy Test (`datagrid-editable-longtext.js`)

```javascript
import { TestRunner } from 'test_runner';
import * as DataGrid from 'devtools/ui/legacy/components/data_grid/data_grid.js';

(async function () {
  TestRunner.addResult('This tests long text in datagrid.');
  // ... setup grid ...
  TestRunner.addResult('Original lengths');
  // ... dump results ...
  TestRunner.completeTest();
})();
```

### Converted Test (`DataGrid.test.ts`)

```typescript
import * as DataGrid from './data_grid.js';
import { renderElementIntoDOM } from '../../../../testing/DOMHelpers.js';
import { describeWithEnvironment } from '../../../../testing/EnvironmentHelpers.js';

describeWithEnvironment('DataGrid', () => {
  it('tests long text in datagrid', () => {
    // ... setup grid ...
    // Use assertions instead of printing results
    assert.strictEqual(keyElement.textContent.length, 1500);
  });
});
```

## Tips & Troubleshooting

- **TypeScript Type Mismatches**: Legacy tests often use plain strings for properties that now require specific branded types like `LocalizedString`. You can often bypass this in tests by casting the object array `as DataGrid.DataGrid.ColumnDescriptor[]` or similar, or by using `i18n.i18n.lockedString` if appropriate.
- **Accessing Private Methods**: Legacy tests frequently called private methods (e.g., `dataGrid.update()`). In TypeScript unit tests, you should avoid this. Look for public alternatives (e.g., `updateInstantly()`) or trigger the behavior by dispatching standard DOM events (e.g., `element.dispatchEvent(new Event('scroll'))` instead of calling `onScroll()`).
- **Recursive Expansion Limits**: Methods like `TreeElement.expandRecursively()` have a default depth limit (e.g., 3) to prevent infinite loops. If your test requires expanding deeper trees, remember to pass a higher max depth argument: `expandRecursively(10)`.
- **Mocking Objects**: When testing UI components that display objects (like `RemoteObject`), look for existing mock helpers in related test files (e.g., `createDeepRemoteObjectMock` in `ObjectPropertiesSection.test.ts`) instead of trying to create real SDK objects or complex mocks from scratch. Other helpers live inside `front_end/testing`.
- **Ignoring Environment Failures**: In some environments, `npm run test` may exit with code 1 due to memory leaks (e.g., `WebFrame LEAKED`) or infrastructure issues (e.g., `gpkg` or `Corp Airlock` logs), even if the tests themselves passed. Always check the end of the test log for `TOTAL: X SUCCESS` to confirm if the test logic was successful.
- **Rendering issue**: If you encounter an issue where checking values never gives correct information it may be due to async rendering. To resolve that you may trying using `raf()` from `front_end/testing/DOMHelpers.ts` to wait for the next rendering cycle.

## Creating a DevTools CL from a Chromium Checkout

To create a DevTools Change List (CL) from a Chromium checkout, you'll be working within the devtools-frontend repository, which is located inside your Chromium source tree. The depot_tools package (which includes git cl) must be in your PATH.

Here's the typical workflow:

1.  **Navigate to the DevTools Frontend Directory**:
    The DevTools frontend code resides in `third_party/devtools-frontend/src/` within your Chromium checkout (`chromium/src`).

```bash
cd path/to/chromium/src/third_party/devtools-frontend/src/
```

2.  **Create a New Branch**:
    It's best practice to create a new branch for your changes:

```bash
git new-branch my-devtools-feature
```

(Or use `git checkout -b my-devtools-feature`)

3.  **Make Your Code Changes**:
    Edit the files as needed for your feature or bug fix.

4.  **Commit Changes Locally**:
    Stage and commit your changes using standard Git commands:

```bash
git add .
git commit -m "My DevTools feature description"
```

_See the Chromium guide on commit messages for best practices on formatting descriptions, including the use of tags like Bug:. _

5.  **Upload the CL for Review**:
    Use `git cl upload` to send your changes to the Chromium Gerrit code review system:

```bash
git cl upload
```

This command will create a CL on `https://chromium-review.googlesource.com`. Follow the prompts to add a description, reviewers, etc. You can also add reviewers and trigger builds through the Gerrit web UI.

6.  **Code Review Process**:
    Your CL will be reviewed by DevTools owners. You may need to address feedback by amending your commit and uploading new patch sets using `git cl upload` again. Once approved, you can land the change via the Commit Queue (CQ).

### Working on Changes Across DevTools and Chromium Core

- DevTools frontend (`third_party/devtools-frontend/src/`) and the main Chromium codebase (`chromium/src`) are distinct Git repositories.
- If your work involves changes in both areas, you generally need to create separate CLs: one within the devtools-frontend repo and one within the main `chromium/src` repo.
- The "Juggling the git submodules" section of the DevTools documentation provides guidance on managing these cross-repository changes.

## After finishing the migration

Identify any helping tips that you discovered during the migration and add them to this skill.
