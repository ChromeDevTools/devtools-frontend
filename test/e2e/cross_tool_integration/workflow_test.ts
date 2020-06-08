// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

import {click, enableExperiment, getBrowserAndPages, waitFor} from '../../shared/helper.js';
import {navigateToConsoleTab, navigateToIssuesPanelViaInfoBar, waitForConsoleMessageAndClickOnLink} from '../helpers/console-helpers.js';
import {clickOnContextMenuItemFromTab, prepareForCrossToolScenario, tabExistsInDrawer, tabExistsInMainPanel} from '../helpers/cross-tool-helper.js';
import {clickOnFirstLinkInStylesPanel, navigateToElementsTab} from '../helpers/elements-helpers.js';
import {MEMORY_TAB_ID, navigateToMemoryTab} from '../helpers/memory-helpers.js';
import {navigateToPerformanceSidebarTab, navigateToPerformanceTab, startRecording, stopRecording, waitForSourceLinkAndFollowIt} from '../helpers/performance-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('A user can navigate across', async function() {
  // These tests move between panels, which takes time.
  this.timeout(10000);

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

const MOVE_TO_DRAWER_SELECTOR = '[aria-label="Move to bottom"]';
const MOVE_TO_MAIN_PANEL_SELECTOR = '[aria-label="Move to top"]';

describe('A user can move tabs', async function() {
  this.timeout(10000);

  beforeEach(async function() {
    this.timeout(10000);
    await enableExperiment('movableTabs');
  });

  it('Move Memory to drawer', async () => {
    const {target} = getBrowserAndPages();
    await navigateToMemoryTab(target);
    await tabExistsInMainPanel(MEMORY_TAB_ID);
    await clickOnContextMenuItemFromTab(MEMORY_TAB_ID, MOVE_TO_DRAWER_SELECTOR);
    await tabExistsInDrawer(MEMORY_TAB_ID);
  });

  it('Move Animations to main panel', async () => {
    const ANIMATIONS_TAB_ID = '#tab-animations';
    await openPanelViaMoreTools('Animations');
    await tabExistsInDrawer(ANIMATIONS_TAB_ID);
    await clickOnContextMenuItemFromTab(ANIMATIONS_TAB_ID, MOVE_TO_MAIN_PANEL_SELECTOR);
    await tabExistsInMainPanel(ANIMATIONS_TAB_ID);
  });
});
