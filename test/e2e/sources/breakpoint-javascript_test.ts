// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $,
  click,
  enableExperiment,
  getBrowserAndPages,
  getPendingEvents,
  goToResource,
  step,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  addBreakpointForLine,
  DEBUGGER_PAUSED_EVENT,
  isEqualOrAbbreviation,
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  refreshDevToolsAndRemoveBackendState,
  RESUME_BUTTON,
  retrieveTopCallFrameWithoutResuming,
} from '../helpers/sources-helpers.js';

async function waitForTopCallFrameChanged(previousCallFrame: string, updatedCallFrame: string) {
  await waitForFunction(async () => {
    const actualTopCallFrame = await retrieveTopCallFrameWithoutResuming();
    assert.isTrue(actualTopCallFrame === previousCallFrame || actualTopCallFrame === updatedCallFrame);
    return actualTopCallFrame === updatedCallFrame;
  });
}

async function assertScriptLocation(expectedLocation: string) {
  const scriptLocation = await retrieveTopCallFrameWithoutResuming();
  if (!scriptLocation) {
    assert.fail('Unable to retrieve script location for call frame');
  }
  assert.isTrue(isEqualOrAbbreviation(scriptLocation, expectedLocation));
}

describe('The Sources Tab', async function() {
  // Some of these tests that use instrumentation breakpoints
  // can be slower on mac and windows. Increaese the timeout for them.
  if (this.timeout() !== 0) {
    this.timeout(10000);
  }

  it('sets and hits breakpoints in JavaScript', async () => {
    const {target, frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('click-breakpoint.js', 'click-breakpoint.html');
    await addBreakpointForLine(frontend, 4);

    const scriptEvaluation = target.evaluate('f2();');

    const scriptLocation = await retrieveTopCallFrameWithoutResuming();
    assert.deepEqual(scriptLocation, 'click-breakpoint.js:4');

    const breakpointHandle = await $('label', await waitFor('.breakpoint-hit'));
    const breakpointLocation = await breakpointHandle?.evaluate(label => label.textContent);
    assert.deepEqual(breakpointLocation, scriptLocation);

    await click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('stops at each breakpoint on resume (using F8) on target', async () => {
    const {target, frontend} = getBrowserAndPages();
    await step('navigate to page', async () => {
      await openSourceCodeEditorForFile('click-breakpoint.js', 'click-breakpoint.html');
    });

    await step('add a breakpoint to line No.3, 4, and 9', async () => {
      await addBreakpointForLine(frontend, 3);
      await addBreakpointForLine(frontend, 4);
      await addBreakpointForLine(frontend, 9);
    });

    let scriptEvaluation: Promise<void>;
    await step('trigger evaluation of script', async () => {
      scriptEvaluation = target.evaluate('f2();');
    });

    await step('wait for pause and check if we stopped at line 3', async () => {
      await waitForFunction(() => getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT));
      await waitFor(PAUSE_INDICATOR_SELECTOR);
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'click-breakpoint.js:3');
    });

    await step('resume and wait until we have hit the next breakpoint (3->4)', async () => {
      await target.keyboard.press('F8');
      await waitForTopCallFrameChanged('click-breakpoint.js:3', 'click-breakpoint.js:4');
    });

    await step('resume and wait until we have hit the next breakpoint (4->9)', async () => {
      await target.keyboard.press('F8');
      await waitForTopCallFrameChanged('click-breakpoint.js:4', 'click-breakpoint.js:9');
    });

    await step('resume and wait until script finishes execution', async () => {
      await frontend.keyboard.press('F8');
      await scriptEvaluation;
    });
  });

  it('can hit a breakpoint on the main thread on a fresh DevTools', async () => {
    await enableExperiment('instrumentationBreakpoints');
    const {frontend, target} = getBrowserAndPages();

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile('breakpoint-hit-on-first-load.js', 'breakpoint-hit-on-first-load.html');
    });

    await step('add a breakpoint to the beginning of the script', async () => {
      await addBreakpointForLine(frontend, 1);
    });

    await step('Navigate to a different site to refresh devtools and remove back-end state', async () => {
      await refreshDevToolsAndRemoveBackendState(target);
    });

    await step('Navigate back to test page', () => {
      void goToResource('sources/breakpoint-hit-on-first-load.html');
    });

    await step('wait for pause and check if we stopped at line 1', async () => {
      await waitForFunction(() => getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT));
      await waitFor(PAUSE_INDICATOR_SELECTOR);
      await assertScriptLocation('breakpoint-hit-on-first-load.js:1');
    });

    await step('Resume', async () => {
      await click(RESUME_BUTTON);
    });
  });

  it('can hit a breakpoint in an inline script on the main thread on a fresh DevTools', async () => {
    await enableExperiment('instrumentationBreakpoints');
    const {frontend, target} = getBrowserAndPages();

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile('breakpoint-hit-on-first-load.html', 'breakpoint-hit-on-first-load.html');
    });

    await step('add a breakpoint to the beginning of the inline script', async () => {
      await addBreakpointForLine(frontend, 9);
    });

    await step('Navigate to a different site to refresh devtools and remove back-end state', async () => {
      await refreshDevToolsAndRemoveBackendState(target);
    });

    await step('Navigate back to test page', () => {
      void goToResource('sources/breakpoint-hit-on-first-load.html');
    });

    await step('wait for pause and check if we stopped at line 9', async () => {
      await waitForFunction(() => getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT));
      await waitFor(PAUSE_INDICATOR_SELECTOR);
      await assertScriptLocation('breakpoint-hit-on-first-load.html:9');
    });

    await step('Resume', async () => {
      await click(RESUME_BUTTON);
    });
  });

  it('can hit a breakpoint in an inline script with sourceURL comment on the main thread on a fresh DevTools',
     async () => {
       await enableExperiment('instrumentationBreakpoints');
       const {frontend, target} = getBrowserAndPages();

       await step('navigate to a page and open the Sources tab', async () => {
         await openSourceCodeEditorForFile('breakpoint-hit-on-first-load.html', 'breakpoint-hit-on-first-load.html');
       });

       await step('add a breakpoint to the beginning of the inline script with sourceURL', async () => {
         await addBreakpointForLine(frontend, 15);
       });

       await step('Navigate to a different site to refresh devtools and remove back-end state', async () => {
         await refreshDevToolsAndRemoveBackendState(target);
       });

       await step('Navigate back to test page', () => {
         void goToResource('sources/breakpoint-hit-on-first-load.html');
       });

       await step('wait for pause and check if we stopped at line 15', async () => {
         await waitForFunction(() => getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT));
         await waitFor(PAUSE_INDICATOR_SELECTOR);
         await assertScriptLocation('breakpoint-hit-on-first-load.html:15');
       });

       await step('Resume', async () => {
         await click(RESUME_BUTTON);
       });
     });
});
