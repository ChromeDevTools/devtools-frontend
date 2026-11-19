---
name: migrate-chromium-test
description: Use when migrating Chromium layout tests to DevTools unit tests or API tests.
---

## Workflow

### 1. Identify the Test to Move

- You should have already received the issue ID, the test title, and the exact local paths of the downloaded legacy test file (`.js`) and its expectation file (`-expected.txt`) in your initial prompt.
- Refer to these local copies as you write the new modern test.

### 2. Determine Target Location & Test Suite Type

Investigate what files are being tested, start location should be `front_end/`.Consult the `devtools-testing-guidance` skill to select the appropriate test suite.
- **Pure CDP protocol tests:** If a legacy `http/tests/devtools/` test exercises only Blink or V8 CDP backend commands (`TestRunner.*Agent.invoke_*`) without testing `front_end/` logic, migrate it in `chromium/src` to `third_party/blink/web_tests/inspector-protocol/` (or `third_party/blink/web_tests/http/tests/inspector-protocol/` when OOPIFs or an HTTP server are needed), starting any new Blink HTML test resource with `<!DOCTYPE html>`.

### 3. Convert the Test Content

- **Testing Style:** Rewrite legacy `TestRunner` calls into modern Mocha (`describe`, `it`) and Chai assertions (`assert.strictEqual`, `assert.isTrue`, `assert.deepEqual`, `assert.isNotNull`, `assert.instanceOf`).
- **Import Conventions:** Strictly follow the `devtools-imports` skill:
  - Import cross-module code via module entrypoints (e.g., `import * as Module from '../module/module.js'`).
  - Always use `import * as` for cross-module imports.
  - TypeScript imports in DevTools **must** use `.js` file extensions (e.g., `./data_grid.js`).
- **Environment & Setup Selection:** `describeWithEnvironment` and `describeWithMockConnection` are banned in all new and migrated unit tests; both foundation and UI/widget tests use plain `describe` (from `'mocha'`) with `TestUniverse` and modular setup hooks (`setupLocaleHooks()`, `setupSettingsHooks()`, `setupRuntimeHooks()`).
  - **Foundation / Non-UI Tests:** Follow the `foundation-test-migration` skill. Use `TestUniverse` and setup hooks (`setupLocaleHooks()`, `setupSettingsHooks()`, `setupRuntimeHooks()`) instead of DOM-heavy singletons or `describeWithEnvironment`. Use `universe.createTarget()` and `MockCDPConnection` for CDP mocking.
  - **UI & Widget Tests:** Follow the `devtools-ui-widgets` skill. Use `renderElementIntoDOM` from `front_end/testing/DOMHelpers.js` for mounting elements, or `createViewFunctionStub` and `view.nextInput` from `front_end/testing/ViewFunctionHelpers.js` for testing MVP widgets.
- **Code Comments:**
  - Must be full sentences ending with a period (except when the entire comment is a URL).
  - Do **not** include comments like `// Replaces web test: http/tests/devtools/...`. Since migrated web tests are deleted, these references become stale.
- **Accessing Private Members & Events:** Avoid calling private methods or accessing internal tokens. Test public APIs or trigger behavior by dispatching standard DOM/SDK events instead.

### 4. Update BUILD.gn Configuration

Every newly created test file must be added to the appropriate target in its folder's `BUILD.gn`:

> [!IMPORTANT]
> If you omit the test file from `BUILD.gn`, the test target will not be compiled by Ninja and will be skipped by test runners.
When adding a brand-new `unittests`, `foundation_unittests`, or `api_tests` target in a subdirectory `BUILD.gn`, also wire it into the matching root `group(...)` in `front_end/BUILD.gn` (see `devtools-testing-guidance`).

### 5. Verify the Changes

Use the `devtools-verification` skill to build and verify your changes.

### 6. Evaluate Test Completeness and Utility

- Critically review the newly created test to ensure it provides meaningful coverage. Cross-reference it with the original Chromium layout test to verify that all original behaviors, edge cases, and assertions have been fully migrated.
- If the newly added test does not test any logic from the component but only tests getters from mocked data, explain to the user that this test does not add value and it is better to close it without adding the test. Provide a command without executing it to close the issue as "Fixed".

### 7. Upload the CL

Follow the `devtools-version-control` skill when uploading CLs.
Follow the following format and constraints:
   - **Title line:** `[test-migration] Migrate <short test name> test to unit test`
   - **Body:** `This CL migrates the legacy layout test <long test name> to a unit test in <new test name>. <optional additional explanation>`
   - **Body appendix:** `https://crsrc.org/c/third_party/blink/web_tests/<long test name>;drc=4d51e9cab50efd0f8029c45a486e199a1d519fd1`
   - **Bug line:** `Bug: <issue number>` on the `devtools-frontend` CL when a follow-up `chromium/src` CL still needs to delete the legacy web test, and `Fixed: <issue number>` only on the final CL that completes the migration (such as the `chromium/src` deletion CL or a single-CL `inspector-protocol/` migration, where you may also pair the issue's active parent tracker in `Bug:`; never reference closed bug `407751692`).
   - **AI-assisted trailer:** Include `Ai-Assisted: true` in the footer block for AI-assisted CLs.
   - **Line Length Constraint:** Wrap all lines in the commit message to a maximum of 72 characters per line.
   - **No Piper tags:** Never add Piper `KEY=VALUE` tags (such as `TAG=agy` or `CONV=...`); use Git trailers only (`PRESUBMIT.py` rejects Piper tags).
   - **Clean up `chromium/src` expectations on deletion:** When deleting the legacy `.js` and `-expected.txt` files in `chromium/src`, remove any matching entries from `TestExpectations`, `MSANExpectations`, `ASANExpectations`, `LeakExpectations`, `FlagExpectations/*`, `SlowTests`, and `NeverFixTests` under `third_party/blink/web_tests/`.

Example commit message:

```text
[test-migration] Migrate console-eval-global test to unit test

This CL migrates the legacy layout test
http/tests/devtools/console/console-eval-global.js to a unit test in
ConsolePrompt.test.ts. It verifies that the evaluation in ConsolePrompt
is performed in the correct execution context (the active one) and with
the correct expression.

https://crsrc.org/c/third_party/blink/web_tests/http/tests/devtools/console/console-eval-global.js;drc=4d51e9cab50efd0f8029c45a486e199a1d519fd1

Bug: <issue number>
Ai-Assisted: true
```


---

## Conversion Examples

### Example 1: UI Unit Test (`DataGrid.test.ts`)

#### Legacy Test (`datagrid-editable-longtext.js`)

```javascript
import {TestRunner} from 'test_runner';
import * as DataGrid from 'devtools/ui/legacy/components/data_grid/data_grid.js';

(async function () {
  TestRunner.addResult('This tests long text in datagrid.');
  // ... setup grid ...
  TestRunner.addResult('Original lengths');
  // ... dump results ...
  TestRunner.completeTest();
})();
```

#### Converted UI Test (`DataGrid.test.ts`)

```typescript
import {assert} from 'chai';
import {describe, it} from 'mocha';

import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';

import * as DataGrid from './data_grid.js';

describe('DataGrid', () => {
  setupLocaleHooks();

  it('tests long text in datagrid', () => {
    // ... setup grid ...
    const grid = new DataGrid.DataGrid.DataGridImpl({...});
    renderElementIntoDOM(grid.element);

    // Use Chai assertions instead of printing results.
    assert.strictEqual(keyElement.textContent.length, 1500);
  });
});
```

---

## Tips & Troubleshooting

- **TypeScript Type Mismatches:** Legacy tests often use plain strings for properties that now require branded types like `LocalizedString`. You can bypass this in tests by casting (`as DataGrid.DataGrid.ColumnDescriptor[]`) or by using `i18n.i18n.lockedString` where appropriate.
- **Accessing Private Methods:** Legacy tests frequently called private methods (e.g., `dataGrid.update()`). Look for public alternatives (e.g., `updateInstantly()`) or trigger the behavior by dispatching standard DOM/SDK events (e.g., `element.dispatchEvent(new Event('scroll'))`).
- **Domain Test Helpers in `front_end/testing/`:** Check existing helper utilities before writing custom boilerplate:
  - `DOMHelpers.ts`: `renderElementIntoDOM`, `dispatchAndAwait`.
  - `ViewFunctionHelpers.ts`: `createViewFunctionStub`, `view.nextInput` (for MVP widget tests).
  - `MockCDPConnection.ts`: Scoped protocol mocking.
  - `SourceMapHelpers.ts`, `TraceHelpers.ts`, `ConsoleHelpers.ts`, `SettingsHelpers.ts` etc.
- **Async Rendering:** If component values fail to update immediately during tests, wait for the next rendering frame using `raf()` from `front_end/testing/DOMHelpers.js`.
- **Recursive Expansion Limits:** Methods like `TreeElement.expandRecursively()` have default depth limits (e.g. 3). Pass a higher max depth argument if your test requires deeper tree expansion: `expandRecursively(10)`.
- **Mocking Complex Objects:** Look for existing mock helpers in related test files (e.g., `createDeepRemoteObjectMock` in `ObjectPropertiesSection.test.ts`) instead of instantiating real objects from scratch.
- **Ignoring Infrastructure Log Warnings:** In some local environments, test runs may print leak messages (e.g., `WebFrame LEAKED`) or `Corp Airlock` warnings. Always inspect the summary line at the end of the test log for `TOTAL: X SUCCESS` to confirm if test logic passed.

---

## After Finishing the Migration

If you encountered any novel issues, workarounds, or helpful tips during the migration that are not already documented, please inform the user so the skill documentation can be further updated.
