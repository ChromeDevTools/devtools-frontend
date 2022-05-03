// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  getBrowserAndPages,
  getPendingEvents,
  installEventListener,
  step,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';
import {navigateToElementsTab} from '../helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';
import {addBreakpointForLine, DEBUGGER_PAUSED_EVENT, openSourceCodeEditorForFile} from '../helpers/sources-helpers.js';

async function breakAndCheckFocusedPanel(expectedPanel: string) {
  const {frontend, target} = getBrowserAndPages();

  await step('navigate to a page and open the Sources tab', async () => {
    await openSourceCodeEditorForFile('click-breakpoint.js', 'click-breakpoint.html');
  });

  await step('add a breakpoint to line No.4', async () => {
    await addBreakpointForLine(frontend, 4);
  });

  await step('navigate to the elements tab', async () => {
    await navigateToElementsTab();
  });

  await step('trigger a Debugger.paused event', async () => {
    target.evaluate('f2();');
  });

  await step('wait for Debugger.paused event', async () => {
    await waitForFunction(() => getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT));
  });

  await step(`check that we are in the ${expectedPanel} tab`, async () => {
    await waitFor(`.panel[aria-label="${expectedPanel}"]`);
  });
}

describe('Sources Panel', async () => {
  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();
    installEventListener(frontend, DEBUGGER_PAUSED_EVENT);
  });

  it('is not opened on Debugger.paused if autoFocusOnDebuggerPausedEnabled is false', async () => {
    await step('toggle preference in settings tab', async () => {
      await togglePreferenceInSettingsTab('Focus Sources panel when triggering a breakpoint');
    });

    // Note: This test checks if we *do not* switch panels after receiving
    // a Debugger.paused event. If this functionality that we are testing is not
    // working anymore, then this test may become flaky (sometimes we check before switching,
    // sometimes after switching to the sources panel).
    await breakAndCheckFocusedPanel('elements');
  });

  it('is opened on Debugger.pause if autoFocusOnDebuggerPausedEnabled is true (default)', async () => {
    await breakAndCheckFocusedPanel('sources');
  });
});
