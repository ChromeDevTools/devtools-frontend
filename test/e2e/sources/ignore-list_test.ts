// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  click,
  enableExperiment,
  getBrowserAndPages,
  getPendingEvents,
  goToResource,
  installEventListener,
  step,
  waitFor,
  waitForFunction,
  waitForNone,
} from '../../shared/helper.js';

import {setIgnoreListPattern, toggleIgnoreListing} from '../helpers/settings-helpers.js';
import {
  addBreakpointForLine,
  DEBUGGER_PAUSED_EVENT,
  getCallFrameNames,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  PAUSE_INDICATOR_SELECTOR,
  readIgnoreListedSources,
  readSourcesTreeView,
  RESUME_BUTTON,
  setEventListenerBreakpoint,
  stepIn,
  stepOut,
} from '../helpers/sources-helpers.js';

describe('Ignore list', function() {
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
    await setIgnoreListPattern('multi|pptr');
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

  it('skips instrumentation breakpoints', async function() {
    await setIgnoreListPattern('thirdparty');
    const {target, frontend} = getBrowserAndPages();
    installEventListener(frontend, DEBUGGER_PAUSED_EVENT);

    await openSourceCodeEditorForFile('multi-files-mycode.js', 'multi-files.html');
    await setEventListenerBreakpoint('Timer', 'setTimeout');

    const scriptEvaluation = target.evaluate('debugger; timeoutTestCase();');

    await waitFor(RESUME_BUTTON);
    await waitFor(PAUSE_INDICATOR_SELECTOR);
    await waitForFunction(async () => await getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT));
    assert.deepEqual(await getCallFrameNames(), ['(anonymous)']);

    await click(RESUME_BUTTON);
    await waitFor('.call-frame-title-text[title="userTimeout"]');

    await waitFor(RESUME_BUTTON);
    await waitFor(PAUSE_INDICATOR_SELECTOR);
    await waitForFunction(async () => await getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT));
    assert.deepEqual(await getCallFrameNames(), ['userTimeout', 'Promise.then', '(anonymous)']);

    await click(RESUME_BUTTON);

    await scriptEvaluation;
  });

  it('indicates ignored sources in page source tree', async function() {
    await setIgnoreListPattern('/sources/');
    await goToResource('sources/multi-files.html');
    await openSourcesPanel();
    assert.deepEqual(await readIgnoreListedSources(), [
      'test/e2e/resources/sources',
      'multi-files.html',
      'multi-files-mycode.js',
      'multi-files-thirdparty.js',
    ]);
    await toggleIgnoreListing(false);
    assert.deepEqual(await readIgnoreListedSources(), []);
    await toggleIgnoreListing(true);
    assert.deepEqual(await readIgnoreListedSources(), [
      'test/e2e/resources/sources',
      'multi-files.html',
      'multi-files-mycode.js',
      'multi-files-thirdparty.js',
    ]);
  });

  it('removes ignored sources from page source tree', async function() {
    await enableExperiment('just-my-code');
    await setIgnoreListPattern('thirdparty');
    await goToResource('sources/multi-files.html');
    await openSourcesPanel();
    assert.deepEqual(
        await readSourcesTreeView(),
        ['top', 'localhost:XXXX', 'test/e2e/resources/sources', 'multi-files.html', 'multi-files-mycode.js']);
    await toggleIgnoreListing(false);
    assert.deepEqual(await readSourcesTreeView(), [
      'top',
      'localhost:XXXX',
      'test/e2e/resources/sources',
      'multi-files.html',
      'multi-files-mycode.js',
      'multi-files-thirdparty.js',
    ]);
    await toggleIgnoreListing(true);
    assert.deepEqual(
        await readSourcesTreeView(),
        ['top', 'localhost:XXXX', 'test/e2e/resources/sources', 'multi-files.html', 'multi-files-mycode.js']);
  });
});
