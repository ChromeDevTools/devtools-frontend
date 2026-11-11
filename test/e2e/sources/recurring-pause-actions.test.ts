// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  addBreakpointForLine,
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON,
  retrieveTopCallFrameWithoutResuming,
} from '../helpers/sources-helpers.js';

const RECURRING_PAUSE_HTML = 'recurring-pause.html';
const STATUS_ACTIONS_SELECTOR = '.paused-status .status-actions';

async function getActionLabels(devToolsPage: {
  $$: (selector: string) => Promise<Array<{
    evaluate: <T>(fn: (el: Element) => T) => Promise<T>,
    dispose: () => Promise<void>,
  }>>,
}): Promise<string[]> {
  const buttons = await devToolsPage.$$(`${STATUS_ACTIONS_SELECTOR} devtools-button`);
  try {
    return await Promise.all(buttons.map(button => button.evaluate(el => el.textContent?.trim() ?? '')));
  } finally {
    await Promise.all(buttons.map(button => button.dispose()));
  }
}

describe('Recurring debugger pause escape actions', () => {
  it('disables the hit breakpoint and resumes execution when clicking "Disable breakpoint"',
     async ({devToolsPage, inspectedPage}) => {
       await openSourceCodeEditorForFile(devToolsPage, inspectedPage, RECURRING_PAUSE_HTML, RECURRING_PAUSE_HTML);
       await addBreakpointForLine(devToolsPage, 7);

       const loopEvaluation = inspectedPage.evaluate('runLoop(4)');

       assert.strictEqual(await retrieveTopCallFrameWithoutResuming(devToolsPage), `${RECURRING_PAUSE_HTML}:7`);
       await devToolsPage.waitForNone(STATUS_ACTIONS_SELECTOR);

       await devToolsPage.click(RESUME_BUTTON);
       await devToolsPage.waitFor(STATUS_ACTIONS_SELECTOR);
       assert.deepEqual(await getActionLabels(devToolsPage), ['Disable breakpoint', 'Deactivate all']);

       await devToolsPage.click('aria/Disable breakpoint');
       assert.strictEqual(await loopEvaluation, 4);
       await devToolsPage.waitForNone(PAUSE_INDICATOR_SELECTOR);
       await devToolsPage.waitFor('[aria-label="Deactivate breakpoints"]');

       assert.strictEqual(await inspectedPage.evaluate('runLoop(2)'), 2);
     });

  it('skips remaining debugger statements when clicking "Never pause here"', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(devToolsPage, inspectedPage, RECURRING_PAUSE_HTML, RECURRING_PAUSE_HTML);

    const loopEvaluation = inspectedPage.evaluate('runDebuggerLoop(4)');

    assert.strictEqual(await retrieveTopCallFrameWithoutResuming(devToolsPage), `${RECURRING_PAUSE_HTML}:15`);
    await devToolsPage.waitForNone(STATUS_ACTIONS_SELECTOR);

    await devToolsPage.click(RESUME_BUTTON);
    await devToolsPage.waitFor(STATUS_ACTIONS_SELECTOR);
    assert.deepEqual(await getActionLabels(devToolsPage), ['Never pause here', 'Deactivate all']);

    await devToolsPage.click('aria/Never pause here');
    assert.strictEqual(await loopEvaluation, 4);
    await devToolsPage.waitForNone(PAUSE_INDICATOR_SELECTOR);

    assert.strictEqual(await inspectedPage.evaluate('runDebuggerLoop(2)'), 2);
  });

  it('deactivates all breakpoints and resumes execution when clicking "Deactivate all"',
     async ({devToolsPage, inspectedPage}) => {
       await openSourceCodeEditorForFile(devToolsPage, inspectedPage, RECURRING_PAUSE_HTML, RECURRING_PAUSE_HTML);
       await addBreakpointForLine(devToolsPage, 7);

       const loopEvaluation = inspectedPage.evaluate('runLoop(4)');

       assert.strictEqual(await retrieveTopCallFrameWithoutResuming(devToolsPage), `${RECURRING_PAUSE_HTML}:7`);
       await devToolsPage.waitForNone(STATUS_ACTIONS_SELECTOR);

       await devToolsPage.click(RESUME_BUTTON);
       await devToolsPage.waitFor(STATUS_ACTIONS_SELECTOR);

       await devToolsPage.click('aria/Deactivate all');
       assert.strictEqual(await loopEvaluation, 4);
       await devToolsPage.waitForNone(PAUSE_INDICATOR_SELECTOR);
       await devToolsPage.waitFor('[aria-label="Activate breakpoints"]');

       assert.strictEqual(await inspectedPage.evaluate('runLoop(2)'), 2);
     });
});
