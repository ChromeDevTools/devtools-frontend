// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {navigateToElementsTab} from '../../e2e/helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../../e2e/helpers/settings-helpers.js';
import {
  addBreakpointForLine,
  DEBUGGER_PAUSED_EVENT,
  openSourceCodeEditorForFile
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function breakAndCheckFocusedPanel(
    expectedPanel: string, devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  await openSourceCodeEditorForFile('click-breakpoint.js', 'click-breakpoint.html', devToolsPage, inspectedPage);

  await addBreakpointForLine(4, devToolsPage);

  await navigateToElementsTab(devToolsPage);

  void inspectedPage.evaluate('f2();');

  await devToolsPage.waitForFunction(() => devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT));

  await devToolsPage.waitFor(`.panel[aria-label="${expectedPanel}"]`);
}

describe('Sources Panel', () => {
  // Flaky VE events
  it.skip(
      '[crbug.com/416405487] is not opened on Debugger.paused if autoFocusOnDebuggerPausedEnabled is false',
      async ({devToolsPage, inspectedPage}) => {
        await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);
        await togglePreferenceInSettingsTab(
            'Focus Sources panel when triggering a breakpoint', undefined, devToolsPage);

        // Note: This test checks if we *do not* switch panels after receiving
        // a Debugger.paused event. If this functionality that we are testing is not
        // working anymore, then this test may become flaky (sometimes we check before switching,
        // sometimes after switching to the sources panel).
        await breakAndCheckFocusedPanel('elements', devToolsPage, inspectedPage);
      });

  // Flaky VE events
  it.skip(
      '[crbug.com/416405487] is opened on Debugger.pause if autoFocusOnDebuggerPausedEnabled is true (default)',
      async ({devToolsPage, inspectedPage}) => {
        await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);
        await breakAndCheckFocusedPanel('sources', devToolsPage, inspectedPage);
      });
});
