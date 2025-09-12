// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {setIgnoreListPattern, toggleIgnoreListing} from '../../e2e/helpers/settings-helpers.js';
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
} from '../../e2e/helpers/sources-helpers.js';

describe('Ignore list', function() {
  it('can be toggled on and off in call stack', async ({devToolsPage, inspectedPage}) => {
    await setIgnoreListPattern('thirdparty', devToolsPage);

    await openSourceCodeEditorForFile('multi-files-mycode.js', 'multi-files.html', devToolsPage, inspectedPage);
    await addBreakpointForLine(4, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('f();');
    await devToolsPage.waitFor(RESUME_BUTTON);
    await devToolsPage.waitFor('.ignore-listed-call-frame.hidden');
    assert.deepEqual(await getCallFrameNames(devToolsPage), ['inner', 'outer', '(anonymous)']);

    // Toggle to show ignore-listed frames
    await devToolsPage.click('.ignore-listed-message-label');
    await devToolsPage.waitFor('.ignore-listed-call-frame:not(.hidden)');
    assert.deepEqual(await getCallFrameNames(devToolsPage), ['inner', 'innercall', 'callfunc', 'outer', '(anonymous)']);

    // Toggle back off
    await devToolsPage.click('.ignore-listed-message-label');
    await devToolsPage.waitFor('.ignore-listed-call-frame.hidden');
    assert.deepEqual(await getCallFrameNames(devToolsPage), ['inner', 'outer', '(anonymous)']);

    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('shows no toggle when everything is ignore-listed', async ({devToolsPage, inspectedPage}) => {
    await setIgnoreListPattern('multi|pptr', devToolsPage);

    await openSourceCodeEditorForFile('multi-files-mycode.js', 'multi-files.html', devToolsPage, inspectedPage);
    await addBreakpointForLine(4, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('f();');
    await devToolsPage.waitFor(RESUME_BUTTON);

    // Toggle is not shown
    await devToolsPage.waitFor('.ignore-listed-message.hidden');
    // There are visible ignore-listed frames
    await devToolsPage.waitFor('.ignore-listed-call-frame:not(.hidden)');
    // All frames are shown
    assert.deepEqual(await getCallFrameNames(devToolsPage), ['inner', 'innercall', 'callfunc', 'outer', '(anonymous)']);

    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('skips frames when stepping in and out', async ({devToolsPage, inspectedPage}) => {
    await setIgnoreListPattern('thirdparty', devToolsPage);
    await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);

    await openSourceCodeEditorForFile('multi-files-mycode.js', 'multi-files.html', devToolsPage, inspectedPage);
    await addBreakpointForLine(8, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('f();');
    await devToolsPage.waitFor(RESUME_BUTTON);
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
    await devToolsPage.waitForFunction(async () => await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT));
    assert.deepEqual(await getCallFrameNames(devToolsPage), ['outer', '(anonymous)']);

    await stepIn(devToolsPage);
    await devToolsPage.waitFor('.call-frame-title-text[title="inner"]');
    await devToolsPage.waitFor('.ignore-listed-call-frame.hidden');
    assert.deepEqual(await getCallFrameNames(devToolsPage), ['inner', 'outer', '(anonymous)']);

    await stepOut(devToolsPage);
    await devToolsPage.waitForNone('.call-frame-title-text[title="inner"]');
    assert.deepEqual(await getCallFrameNames(devToolsPage), ['outer', '(anonymous)']);

    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('skips instrumentation breakpoints', async ({devToolsPage, inspectedPage}) => {
    await setIgnoreListPattern('thirdparty', devToolsPage);
    await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);

    await openSourceCodeEditorForFile('multi-files-mycode.js', 'multi-files.html', devToolsPage, inspectedPage);
    await setEventListenerBreakpoint('Timer', 'setTimeout', devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('debugger; timeoutTestCase();');

    await devToolsPage.waitFor(RESUME_BUTTON);
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
    await devToolsPage.waitForFunction(async () => await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT));
    assert.deepEqual(await getCallFrameNames(devToolsPage), ['(anonymous)']);

    await devToolsPage.click(RESUME_BUTTON);
    await devToolsPage.waitFor('.call-frame-title-text[title="userTimeout"]');

    await devToolsPage.waitFor(RESUME_BUTTON);
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
    await devToolsPage.waitForFunction(async () => await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT));
    assert.deepEqual(await getCallFrameNames(devToolsPage), ['userTimeout', 'Promise.then', '(anonymous)']);

    await devToolsPage.click(RESUME_BUTTON);

    await scriptEvaluation;
  });

  it('indicates ignored sources in page source tree', async ({devToolsPage, inspectedPage}) => {
    await setIgnoreListPattern('/sources/', devToolsPage);
    await inspectedPage.goToResource('sources/multi-files.html');
    await openSourcesPanel(devToolsPage);
    assert.deepEqual(await readIgnoreListedSources(devToolsPage), [
      'test/e2e/resources/sources',
      'multi-files.html',
      'multi-files-mycode.js',
      'multi-files-thirdparty.js',
    ]);
    await toggleIgnoreListing(false, devToolsPage);
    assert.deepEqual(await readIgnoreListedSources(devToolsPage), []);
    await toggleIgnoreListing(true, devToolsPage);
    assert.deepEqual(await readIgnoreListedSources(devToolsPage), [
      'test/e2e/resources/sources',
      'multi-files.html',
      'multi-files-mycode.js',
      'multi-files-thirdparty.js',
    ]);
  });

  describe('with just-my-code experiment', () => {
    setup({enabledDevToolsExperiments: ['just-my-code']});
    it('removes ignored sources from page source tree', async ({devToolsPage, inspectedPage}) => {
      await setIgnoreListPattern('thirdparty', devToolsPage);
      await inspectedPage.goToResource('sources/multi-files.html');
      await openSourcesPanel(devToolsPage);
      assert.deepEqual(
          await readSourcesTreeView(devToolsPage),
          ['top', 'localhost:XXXX', 'test/e2e/resources/sources', 'multi-files.html', 'multi-files-mycode.js']);
      await toggleIgnoreListing(false, devToolsPage);
      assert.deepEqual(await readSourcesTreeView(devToolsPage), [
        'top',
        'localhost:XXXX',
        'test/e2e/resources/sources',
        'multi-files.html',
        'multi-files-mycode.js',
        'multi-files-thirdparty.js',
      ]);
      await toggleIgnoreListing(true, devToolsPage);
      assert.deepEqual(
          await readSourcesTreeView(devToolsPage),
          ['top', 'localhost:XXXX', 'test/e2e/resources/sources', 'multi-files.html', 'multi-files-mycode.js']);
    });
  });
});
