// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {$, click, getBrowserAndPages, getPendingEvents, step, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {addBreakpointForLine, DEBUGGER_PAUSED_EVENT, openSourceCodeEditorForFile, PAUSE_INDICATOR_SELECTOR, RESUME_BUTTON, retrieveTopCallFrameWithoutResuming} from '../helpers/sources-helpers.js';

async function waitForTopCallFrameChanged(previousCallFrame: string, updatedCallFrame: string) {
  await waitForFunction(async () => {
    const actualTopCallFrame = await retrieveTopCallFrameWithoutResuming();
    assert.isTrue(actualTopCallFrame === previousCallFrame || actualTopCallFrame === updatedCallFrame);
    return actualTopCallFrame === updatedCallFrame;
  });
}

describe('The Sources Tab', async () => {
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
});
