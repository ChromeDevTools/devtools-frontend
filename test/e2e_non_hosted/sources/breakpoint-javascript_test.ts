// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getMenuItemAtPosition,
  getMenuItemTitleAtPosition,
  openFileQuickOpen
} from '../../e2e/helpers/quick_open-helpers.js';
import {
  addBreakpointForLine,
  addLogpointForLine,
  CODE_LINE_COLUMN_SELECTOR,
  getBreakpointHitLocation,
  isBreakpointSet,
  isEqualOrAbbreviation,
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON,
  retrieveTopCallFrameWithoutResuming,
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

async function assertScriptLocation(
    expectedLocation: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
  assert.isOk(scriptLocation, 'Unable to retrieve script location for call frame');
  assert.isTrue(isEqualOrAbbreviation(scriptLocation, expectedLocation));
}

async function waitForTopCallFrameChanged(
    previousCallFrame: string, updatedCallFrame: string, devToolsPage: DevToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
    if (scriptLocation === previousCallFrame) {
      return false;
    }
    assert.strictEqual(scriptLocation, updatedCallFrame);
    return true;
  });
}

async function testScriptPauseAndResume(script: string, inspectedPage: InspectedPage, devToolsPage: DevToolsPage) {
  const scriptEvaluation = inspectedPage.evaluate('f2();');

  const scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
  assert.deepEqual(scriptLocation, `${script}:4`);

  await devToolsPage.click(RESUME_BUTTON);
  await scriptEvaluation;
}

describe('The Sources Tab', function() {
  const CLICK_BREAKPOINT_SCRIPT = 'click-breakpoint.js';
  const CLICK_BREAKPOINT_HTML = 'click-breakpoint.html';

  it('sets and hits breakpoints in JavaScript', async ({inspectedPage, devToolsPage}) => {
    await openSourceCodeEditorForFile(CLICK_BREAKPOINT_SCRIPT, CLICK_BREAKPOINT_HTML, devToolsPage, inspectedPage);
    await addBreakpointForLine(4, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('f2();');

    const scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
    assert.deepEqual(scriptLocation, `${CLICK_BREAKPOINT_SCRIPT}:4`);

    const breakpointLocation = await getBreakpointHitLocation(devToolsPage);
    assert.deepEqual(breakpointLocation, scriptLocation);

    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('can disable and re-enable breakpoints in JavaScript', async ({inspectedPage, devToolsPage}) => {
    await openSourceCodeEditorForFile(CLICK_BREAKPOINT_SCRIPT, CLICK_BREAKPOINT_HTML, devToolsPage, inspectedPage);

    // After adding a breakpoint, we expect the script to pause. Resume afterwards.
    await addBreakpointForLine(4, devToolsPage);
    await testScriptPauseAndResume(CLICK_BREAKPOINT_SCRIPT, inspectedPage, devToolsPage);

    // Disable breakpoint. This time, we should not pause but be able to
    // run the script until the end.
    await devToolsPage.click(`[aria-label="${CLICK_BREAKPOINT_SCRIPT}"] [aria-label="checked"] input`);
    await inspectedPage.evaluate('f2();');

    // Re-enable breakpoint. Again, we should expect a pause and resume to finish the script.
    await devToolsPage.click(`[aria-label="${CLICK_BREAKPOINT_SCRIPT}"] [aria-label="unchecked"] input`);
    await testScriptPauseAndResume(CLICK_BREAKPOINT_SCRIPT, inspectedPage, devToolsPage);
  });

  it('can set and remove breakpoints in JavaScript', async ({inspectedPage, devToolsPage}) => {
    await openSourceCodeEditorForFile(CLICK_BREAKPOINT_SCRIPT, CLICK_BREAKPOINT_HTML, devToolsPage, inspectedPage);
    await addBreakpointForLine(4, devToolsPage);

    // Hover over breakpoint.
    await devToolsPage.hover(`[aria-label="${CLICK_BREAKPOINT_SCRIPT}"] [aria-label="checked"]`);

    // Remove breakpoint.
    await devToolsPage.click(`[aria-label="${CLICK_BREAKPOINT_SCRIPT}"] [aria-label="Remove breakpoint"]`);

    // Running the function should not pause anywhere.
    await inspectedPage.evaluate('f2();');
  });

  it('doesn\'t synchronize breakpoints between scripts and source-mapped scripts',
     async ({devToolsPage, inspectedPage}) => {
       // Navigate to page with sourceURL annotation and set breakpoint in line 2.
       await openSourceCodeEditorForFile(
           'breakpoint-conflict.js', 'breakpoint-conflict-source-url.html', devToolsPage, inspectedPage);
       await addBreakpointForLine(2, devToolsPage);

       // Navigate to page with sourceMappingURL annotation and check that breakpoint did not sync.
       await openSourceCodeEditorForFile(
           'breakpoint-conflict.js', 'breakpoint-conflict-source-map.html', devToolsPage, inspectedPage);
       assert.isFalse(await isBreakpointSet(2, devToolsPage), 'Breakpoint found on line 2 which shouldn\'t be there');
     });

  it('stops at each breakpoint on resume (using F8) on target', async ({inspectedPage, devToolsPage}) => {
    await openSourceCodeEditorForFile(CLICK_BREAKPOINT_SCRIPT, CLICK_BREAKPOINT_HTML, devToolsPage, inspectedPage);

    await addBreakpointForLine(3, devToolsPage);
    await addBreakpointForLine(4, devToolsPage);
    await addBreakpointForLine(9, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('f2();') as Promise<void>;

    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
    const scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
    assert.deepEqual(scriptLocation, `${CLICK_BREAKPOINT_SCRIPT}:3`);

    await inspectedPage.page.keyboard.press('F8');
    await waitForTopCallFrameChanged(`${CLICK_BREAKPOINT_SCRIPT}:3`, `${CLICK_BREAKPOINT_SCRIPT}:4`, devToolsPage);

    await inspectedPage.page.keyboard.press('F8');
    await waitForTopCallFrameChanged(`${CLICK_BREAKPOINT_SCRIPT}:4`, `${CLICK_BREAKPOINT_SCRIPT}:9`, devToolsPage);

    await devToolsPage.pressKey('F8');
    await scriptEvaluation;
  });

  it('shows a tooltip for logpoints', async ({inspectedPage, devToolsPage}) => {
    await openSourceCodeEditorForFile(CLICK_BREAKPOINT_SCRIPT, CLICK_BREAKPOINT_HTML, devToolsPage, inspectedPage);
    await addLogpointForLine(4, '14', devToolsPage);

    const tooltip = await devToolsPage.waitFor('.cm-breakpoint-logpoint devtools-tooltip');
    assert.strictEqual(await tooltip.evaluate(e => e.textContent), '14');
  });

  describe('with instrumenation breackpoints', () => {
    setup({enabledDevToolsExperiments: ['instrumentation-breakpoints']});
    it('can hit a breakpoint on the main thread on a fresh DevTools', async ({devToolsPage, inspectedPage}) => {
      await openSourceCodeEditorForFile(
          'breakpoint-hit-on-first-load.js', 'breakpoint-hit-on-first-load.html', devToolsPage, inspectedPage);

      await addBreakpointForLine(1, devToolsPage);

      await inspectedPage.goTo('about:blank');
      await devToolsPage.reloadWithParams({panel: 'sources'});

      void inspectedPage.goToResource('sources/breakpoint-hit-on-first-load.html');

      await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
      await assertScriptLocation('breakpoint-hit-on-first-load.js:1', devToolsPage);

      await devToolsPage.click(RESUME_BUTTON);
    });

    it('can hit a breakpoint in an inline script on the main thread on a fresh DevTools',
       async ({devToolsPage, inspectedPage}) => {
         await openSourceCodeEditorForFile(
             'breakpoint-hit-on-first-load.html', 'breakpoint-hit-on-first-load.html', devToolsPage, inspectedPage);

         await addBreakpointForLine(9, devToolsPage);

         await inspectedPage.goTo('about:blank');
         await devToolsPage.reloadWithParams({panel: 'sources'});

         void inspectedPage.goToResource('sources/breakpoint-hit-on-first-load.html');

         await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
         await assertScriptLocation('breakpoint-hit-on-first-load.html:9', devToolsPage);

         await devToolsPage.click(RESUME_BUTTON);
       });

    it('can hit a breakpoint in an inline script with sourceURL comment on the main thread on a fresh DevTools',
       async ({devToolsPage, inspectedPage}) => {
         await openSourceCodeEditorForFile(
             'breakpoint-hit-on-first-load.html', 'breakpoint-hit-on-first-load.html', devToolsPage, inspectedPage);

         await openFileQuickOpen(devToolsPage);
         await devToolsPage.page.keyboard.type('hello.js');
         // TODO: it should actually wait for rendering to finish.
         await devToolsPage.drainTaskQueue();

         const firstItemTitle = await getMenuItemTitleAtPosition(0, devToolsPage);
         const firstItem = await getMenuItemAtPosition(0, devToolsPage);
         assert.strictEqual(firstItemTitle, 'hello.js');
         await devToolsPage.clickElement(firstItem);

         await addBreakpointForLine(2, devToolsPage);

         await inspectedPage.goTo('about:blank');
         await devToolsPage.reloadWithParams({panel: 'sources'});

         void inspectedPage.goToResource('sources/breakpoint-hit-on-first-load.html');

         await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
         await assertScriptLocation('hello.js:2', devToolsPage);

         await devToolsPage.click(RESUME_BUTTON);
       });
  });

  describe('The breakpoint edit dialog', () => {
    it('shows up on Ctrl/Meta + click if no breakpoint was set', async ({devToolsPage, inspectedPage}) => {
      await openSourceCodeEditorForFile(CLICK_BREAKPOINT_SCRIPT, CLICK_BREAKPOINT_HTML, devToolsPage, inspectedPage);
      const lineNumberColumn = await devToolsPage.waitFor(CODE_LINE_COLUMN_SELECTOR);
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await devToolsPage.page.keyboard.down(modifier);
      await devToolsPage.click('text/4', {root: lineNumberColumn});
      await devToolsPage.page.keyboard.up(modifier);
      await devToolsPage.waitFor('.sources-edit-breakpoint-dialog');
    });

    it('shows up on Ctrl/Meta + click if breakpoint was already set', async ({devToolsPage, inspectedPage}) => {
      await openSourceCodeEditorForFile(CLICK_BREAKPOINT_SCRIPT, CLICK_BREAKPOINT_HTML, devToolsPage, inspectedPage);
      await addBreakpointForLine(4, devToolsPage);

      const lineNumberColumn = await devToolsPage.waitFor(CODE_LINE_COLUMN_SELECTOR);
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await devToolsPage.page.keyboard.down(modifier);
      await devToolsPage.click('text/4', {root: lineNumberColumn});
      await devToolsPage.page.keyboard.up(modifier);
      await devToolsPage.waitFor('.sources-edit-breakpoint-dialog');
    });
  });
});
