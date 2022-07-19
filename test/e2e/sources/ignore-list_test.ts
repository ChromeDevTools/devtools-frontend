// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  click,
  getBrowserAndPages,
  getPendingEvents,
  installEventListener,
  step,
  waitFor,
  waitForFunction,
  waitForNone,
} from '../../shared/helper.js';
import {setIgnoreListPattern} from '../helpers/settings-helpers.js';
import {
  addBreakpointForLine,
  DEBUGGER_PAUSED_EVENT,
  getCallFrameNames,
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON,
  stepIn,
  stepOut,
} from '../helpers/sources-helpers.js';

describe('Ignore list', async function() {
  it('can be toggled on and off in call stack', async function() {
    await setIgnoreListPattern('thirdparty');
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('multi-files-mycode.js', 'multi-files.html');
    await addBreakpointForLine(frontend, 4);

    const scriptEvaluation = target.evaluate('f();');
    await waitFor(RESUME_BUTTON);
    await waitFor('.ignore-listed-call-frame.hidden');
    assert.deepEqual(await getCallFrameNames(), ['inner', 'outer', '(anonymous)']);

    // Toggle to show ignore-listed frames
    await click('.ignore-listed-message-label');
    await waitFor('.ignore-listed-call-frame:not(.hidden)');
    assert.deepEqual(await getCallFrameNames(), ['inner', 'innercall', 'callfunc', 'outer', '(anonymous)']);

    // Toggle back off
    await click('.ignore-listed-message-label');
    await waitFor('.ignore-listed-call-frame.hidden');
    assert.deepEqual(await getCallFrameNames(), ['inner', 'outer', '(anonymous)']);

    await click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('shows no toggle when everything is ignore-listed', async function() {
    await setIgnoreListPattern('multi|puppeteer');
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('multi-files-mycode.js', 'multi-files.html');
    await addBreakpointForLine(frontend, 4);

    const scriptEvaluation = target.evaluate('f();');
    await waitFor(RESUME_BUTTON);

    // Toggle is not shown
    await waitFor('.ignore-listed-message.hidden');
    // There are visible ignore-listed frames
    await waitFor('.ignore-listed-call-frame:not(.hidden)');
    // All frames are shown
    assert.deepEqual(await getCallFrameNames(), ['inner', 'innercall', 'callfunc', 'outer', '(anonymous)']);

    await click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('skips frames when stepping in and out', async function() {
    await setIgnoreListPattern('thirdparty');
    const {target, frontend} = getBrowserAndPages();
    installEventListener(frontend, DEBUGGER_PAUSED_EVENT);

    await openSourceCodeEditorForFile('multi-files-mycode.js', 'multi-files.html');
    await addBreakpointForLine(frontend, 8);

    const scriptEvaluation = target.evaluate('f();');
    await waitFor(RESUME_BUTTON);
    await waitFor(PAUSE_INDICATOR_SELECTOR);
    await waitForFunction(async () => await getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT));
    assert.deepEqual(await getCallFrameNames(), ['outer', '(anonymous)']);

    await step('Step in', stepIn);
    await waitFor('.call-frame-title-text[title="inner"]');
    await waitFor('.ignore-listed-call-frame.hidden');
    assert.deepEqual(await getCallFrameNames(), ['inner', 'outer', '(anonymous)']);

    await step('Step out', stepOut);
    await waitForNone('.call-frame-title-text[title="inner"]');
    assert.deepEqual(await getCallFrameNames(), ['outer', '(anonymous)']);

    await click(RESUME_BUTTON);
    await scriptEvaluation;
  });
});
