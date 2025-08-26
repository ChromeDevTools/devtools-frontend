// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {navigateToConsoleTab, waitForConsoleInfoMessageAndClickOnLink} from '../../e2e/helpers/console-helpers.js';
import {
  clickOnContextMenuItemFromTab,
  MOVE_TO_DRAWER_SELECTOR,
  MOVE_TO_MAIN_TAB_BAR_SELECTOR,
  tabExistsInDrawer,
  tabExistsInMainPanel,
} from '../../e2e/helpers/cross-tool-helper.js';
import {clickOnFirstLinkInStylesPanel, navigateToElementsTab} from '../../e2e/helpers/elements-helpers.js';
import {LAYERS_TAB_SELECTOR} from '../../e2e/helpers/layers-helpers.js';
import {MEMORY_TAB_ID, navigateToMemoryTab} from '../../e2e/helpers/memory-helpers.js';
import {
  navigateToBottomUpTab,
  navigateToPerformanceTab,
  startRecording,
  stopRecording,
} from '../../e2e/helpers/performance-helpers.js';
import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('A user can navigate across', function() {
  async function setupForTests(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource('cross_tool/default.html');
    await devToolsPage.closeAllCloseableTabs();
  }

  it('Console -> Sources', async ({devToolsPage, inspectedPage}) => {
    await setupForTests(devToolsPage, inspectedPage);
    await navigateToConsoleTab(devToolsPage);
    await waitForConsoleInfoMessageAndClickOnLink(devToolsPage);
    await devToolsPage.waitFor('.panel[aria-label="sources"]');
  });

  it('Console -> Issues', async ({devToolsPage, inspectedPage}) => {
    await setupForTests(devToolsPage, inspectedPage);
    await navigateToConsoleTab(devToolsPage);
    await devToolsPage.click('#console-issues-counter');
    await devToolsPage.waitFor('[aria-label="Issues panel"]');
  });

  it('Elements -> Sources', async ({devToolsPage, inspectedPage}) => {
    await setupForTests(devToolsPage, inspectedPage);
    await navigateToElementsTab(devToolsPage);
    await clickOnFirstLinkInStylesPanel(devToolsPage);
    await devToolsPage.waitFor('.panel[aria-label="sources"]');
  });

  it('Performance -> Sources', async ({devToolsPage, inspectedPage}) => {
    await setupForTests(devToolsPage, inspectedPage);
    await navigateToPerformanceTab(undefined, devToolsPage, inspectedPage);

    await startRecording(devToolsPage);

    // Wait until we have collected a bit of trace data (indicated by the progress bar
    // changing at least twice), to ensure that there's at least a single tick within
    // `default.html` below.
    const statusIndicator = await devToolsPage.waitFor('.timeline-status-dialog .progress .indicator');
    const statusIndicatorValues = new Set<number>();
    await devToolsPage.waitForFunction(async () => {
      const indicatorValue = await statusIndicator.evaluate(n => Number(n.getAttribute('aria-valuenow')));
      if (statusIndicatorValues.has(indicatorValue)) {
        await devToolsPage.timeout(50);
      } else {
        statusIndicatorValues.add(indicatorValue);
      }
      return statusIndicatorValues.size > 1;
    });

    await stopRecording(devToolsPage);

    await navigateToBottomUpTab(devToolsPage, 'script-location');

    await devToolsPage.click('.devtools-link[title*="default.html"]');
    await devToolsPage.waitFor('.panel[aria-label="sources"]');
  });
});

describe('A user can move tabs', function() {
  // TODO: Memory panel is not show in the toolbar in docked mode
  setup({dockingMode: 'undocked'});

  it('Move Memory to drawer', async ({devToolsPage}) => {
    await navigateToMemoryTab(devToolsPage);
    await tabExistsInMainPanel(MEMORY_TAB_ID, devToolsPage);
    await clickOnContextMenuItemFromTab(MEMORY_TAB_ID, MOVE_TO_DRAWER_SELECTOR, devToolsPage);
    await tabExistsInDrawer(MEMORY_TAB_ID, devToolsPage);
  });

  it('Move Animations to main panel', async ({devToolsPage}) => {
    const ANIMATIONS_TAB_ID = '#tab-animations';
    await openPanelViaMoreTools('Animations', devToolsPage);
    await tabExistsInDrawer(ANIMATIONS_TAB_ID, devToolsPage);
    await clickOnContextMenuItemFromTab(ANIMATIONS_TAB_ID, MOVE_TO_MAIN_TAB_BAR_SELECTOR, devToolsPage);
    await tabExistsInMainPanel(ANIMATIONS_TAB_ID, devToolsPage);
  });
});

describe('A user can open panels via the "panel" query param', function() {
  it('Layers is shown', async ({devToolsPage}) => {
    await devToolsPage.reloadWithParams({panel: 'layers'});
    await tabExistsInMainPanel(LAYERS_TAB_SELECTOR, devToolsPage);
  });
});
