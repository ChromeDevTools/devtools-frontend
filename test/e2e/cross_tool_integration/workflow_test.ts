// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, closeAllCloseableTabs, goToResource, timeout, waitFor} from '../../shared/helper.js';

import {navigateToConsoleTab, waitForConsoleInfoMessageAndClickOnLink} from '../helpers/console-helpers.js';
import {
  clickOnContextMenuItemFromTab,
  MOVE_TO_DRAWER_SELECTOR,
  MOVE_TO_MAIN_PANEL_SELECTOR,
  reloadDevTools,
  tabExistsInDrawer,
  tabExistsInMainPanel,
} from '../helpers/cross-tool-helper.js';
import {clickOnFirstLinkInStylesPanel, navigateToElementsTab} from '../helpers/elements-helpers.js';
import {LAYERS_TAB_SELECTOR} from '../helpers/layers-helpers.js';
import {MEMORY_TAB_ID, navigateToMemoryTab} from '../helpers/memory-helpers.js';
import {
  navigateToBottomUpTab,
  navigateToPerformanceTab,
  startRecording,
  stopRecording,
} from '../helpers/performance-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('A user can navigate across', function() {
  // These tests move between panels, which takes time.
  if (this.timeout() !== 0) {
    this.timeout(10000);
  }

  beforeEach(async function() {
    await goToResource('cross_tool/default.html');
    await closeAllCloseableTabs();
  });

  it('Console -> Sources', async () => {
    await navigateToConsoleTab();
    await waitForConsoleInfoMessageAndClickOnLink();
    await waitFor('.panel[aria-label="sources"]');
  });

  it('Console -> Issues', async () => {
    await navigateToConsoleTab();
    await click('#console-issues-counter');
    await waitFor('[aria-label="Issues panel"]');
  });

  it('Elements -> Sources', async () => {
    await navigateToElementsTab();
    await clickOnFirstLinkInStylesPanel();
    await waitFor('.panel[aria-label="sources"]');
  });

  // Flaky test.
  it.skip('[crbug.com/327072692] Performance -> Sources', async () => {
    await navigateToPerformanceTab();

    await startRecording();

    // Wait until we have collected a bit of trace data (indicated by the progress bar
    // changing at least twice), to ensure that there's at least a single tick within
    // `default.html` below.
    const statusIndicator = await waitFor('.timeline-status-dialog .progress .indicator');
    const statusIndicatorValues = new Set<Number>();
    do {
      const indicatorValue = await statusIndicator.evaluate(n => Number(n.getAttribute('aria-valuenow')));
      if (statusIndicatorValues.has(indicatorValue)) {
        await timeout(50);
      } else {
        statusIndicatorValues.add(indicatorValue);
      }
    } while (statusIndicatorValues.size <= 2);

    await stopRecording();

    await navigateToBottomUpTab();

    await click('.devtools-link[title*="default.html"]');
    await waitFor('.panel[aria-label="sources"]');
  });
});

describe('A user can move tabs', function() {
  this.timeout(10000);

  it('Move Memory to drawer', async () => {
    await navigateToMemoryTab();
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

describe('A user can open panels via the "panel" query param', function() {
  // Flaky on windows
  it.skipOnPlatforms(['win32'], '[crbug.com/377280477] Layers is shown', async () => {
    await reloadDevTools({queryParams: {panel: 'layers'}});
    await tabExistsInMainPanel(LAYERS_TAB_SELECTOR);
  });
});
