// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

import {click, waitFor} from '../../shared/helper.js';
import {navigateToConsoleTab, navigateToIssuesPanelViaInfoBar, waitForConsoleMessageAndClickOnLink} from '../helpers/console-helpers.js';
import {prepareForCrossToolScenario} from '../helpers/cross-tool-helper.js';
import {clickOnFirstLinkInStylesPanel, navigateToElementsTab} from '../helpers/elements-helpers.js';
import {navigateToPerformanceSidebarTab, navigateToPerformanceTab, startRecording, stopRecording, waitForSourceLinkAndFollowIt} from '../helpers/performance-helpers.js';

describe('A user can navigate across', async () => {
  beforeEach(async function() {
    await prepareForCrossToolScenario();
  });

  it('Console -> Sources', async () => {
    await navigateToConsoleTab();
    await waitForConsoleMessageAndClickOnLink();
    await waitFor('.panel[aria-label="sources"]');
  });

  it('Console -> Issues', async () => {
    await navigateToConsoleTab();
    await navigateToIssuesPanelViaInfoBar();

    // Expand the first issue
    await click('li.issue.parent');

    // Expand the affected resources
    await click('li.parent', {root: await waitFor('ol.affected-resources')});
  });

  it('Elements -> Sources', async () => {
    await navigateToElementsTab();
    await clickOnFirstLinkInStylesPanel();

    await waitFor('.panel[aria-label="sources"]');
  });

  it('Performance -> Sources', async () => {
    await navigateToPerformanceTab();

    await startRecording();
    await stopRecording();

    await navigateToPerformanceSidebarTab('Bottom-Up');
    await waitForSourceLinkAndFollowIt();
  });
});
