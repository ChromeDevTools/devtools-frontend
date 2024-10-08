// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type DevToolsFrontendReloadOptions} from '../../conductor/frontend_tab.js';
import {getBrowserAndPages} from '../../conductor/puppeteer-state.js';
import {click, reloadDevTools as baseReloadDevTools, waitFor} from '../../shared/helper.js';

import {veImpressionForAnimationsPanel} from './animations-helpers.js';
import {veImpressionForApplicationPanel} from './application-helpers.js';
import {veImpressionForChangesPanel} from './changes-helpers.js';
import {veImpressionForConsolePanel} from './console-helpers.js';
import {veImpressionForLayersPanel} from './layers-helpers.js';
import {veImpressionForNetworkPanel} from './network-helpers.js';
import {veImpressionForPerformancePanel} from './performance-helpers.js';
import {veImpressionForSecurityPanel} from './security-helpers.js';
import {veImpressionForSourcesPanel} from './sources-helpers.js';
import {
  expectVeEvents,
  veImpression,
  veImpressionForElementsPanel,
  veImpressionForMainToolbar,
} from './visual-logging-helpers.js';

export async function clickOnContextMenuItemFromTab(tabId: string, menuItemSelector: string) {
  // Find the selected node, right click.
  await click(tabId, {clickOptions: {button: 'right'}});

  // Click on the context menu option
  await click(menuItemSelector);
}

export const MOVE_TO_DRAWER_SELECTOR = '[aria-label="Move to bottom"]';
export const MOVE_TO_MAIN_PANEL_SELECTOR = '[aria-label="Move to top"]';
export const MAIN_PANEL_SELECTOR = 'div[class*="main-tabbed-pane"][slot*="main"]';
export const DRAWER_PANEL_SELECTOR = 'div[class*="drawer-tabbed-pane"][slot*="sidebar"]';
export const TAB_HEADER_SELECTOR = 'div[class*="tabbed-pane-header"]';

export async function tabExistsInMainPanel(tabId: string) {
  const mainPanel = await waitFor(MAIN_PANEL_SELECTOR);
  await waitFor(tabId, mainPanel);
}

export async function tabExistsInDrawer(tabId: string) {
  const drawer = await waitFor(DRAWER_PANEL_SELECTOR);
  await waitFor(tabId, drawer);
}

export const checkIfTabExistsInDrawer = async (tabId: string) => {
  const drawer = await waitFor(DRAWER_PANEL_SELECTOR);
  const header = await waitFor(TAB_HEADER_SELECTOR, drawer);
  const tab = await waitFor(tabId, header);
  return Boolean(tab);
};

export async function reloadDevTools(options?: DevToolsFrontendReloadOptions&{
  expectClosedPanels?: string[],
  enableExperiments?: string[],
  disableExperiments?: string[],
  removeBackendState?: boolean,
}) {
  const {frontend, target} = getBrowserAndPages();
  const enableExperiments = options?.enableExperiments || [];
  const disableExperiments = options?.disableExperiments || [];
  if (enableExperiments.length || disableExperiments.length) {
    await frontend.evaluate(`(async () => {
      const Root = await import('./core/root/root.js');
      for (const experiment of ${JSON.stringify(enableExperiments)}) {
        Root.Runtime.experiments.setEnabled(experiment, true);
      }
      for (const experiment of ${JSON.stringify(disableExperiments)}) {
        Root.Runtime.experiments.setEnabled(experiment, false);
      }
    })()`);
  }
  if (options?.removeBackendState) {
    // Navigate to a different site to make sure that back-end state will be removed.
    await target.goto('about:blank');
  }
  await baseReloadDevTools(options);
  const selectedPanel = options?.selectedPanel?.name || options?.queryParams?.panel || 'elements';
  await waitFor(`.panel.${selectedPanel}`);
  const expectClosedPanels = options?.expectClosedPanels;
  const newFilterBar = enableExperiments.includes('network-panel-filter-bar-redesign');
  const timelineLegacyLandingPage = disableExperiments.includes('timeline-observations');
  const dockable = options?.canDock;
  const panelImpression = selectedPanel === 'elements' ? veImpressionForElementsPanel({dockable}) :
      selectedPanel === 'animations'                   ? veImpressionForAnimationsPanel() :
      selectedPanel === 'security'                     ? veImpressionForSecurityPanel() :
      selectedPanel === 'layers'                       ? veImpressionForLayersPanel() :
      selectedPanel === 'network'                      ? veImpressionForNetworkPanel({newFilterBar}) :
      selectedPanel === 'console'                      ? veImpressionForConsolePanel() :
      selectedPanel === 'timeline'                     ? veImpressionForPerformancePanel({timelineLegacyLandingPage}) :
      selectedPanel === 'sources'                      ? veImpressionForSourcesPanel() :
      selectedPanel === 'animations'                   ? veImpressionForSourcesPanel() :
      selectedPanel === 'changes'                      ? veImpressionForChangesPanel() :
      selectedPanel === 'resources'                    ? veImpressionForApplicationPanel() :
                                                         veImpression('Panel', selectedPanel);
  const expectedVeEvents = [veImpressionForMainToolbar({selectedPanel, expectClosedPanels, dockable}), panelImpression];
  if (options?.drawerShown) {
    expectedVeEvents.push(veImpression('Drawer', undefined, [
      veImpression(
          'Toolbar', 'drawer',
          [
            veImpression('DropDown', 'more-tabs'),
            veImpression('PanelTabHeader', 'console'),
            veImpression('Close'),
          ]),
      veImpressionForConsolePanel(),
    ]));
  }
  await expectVeEvents(expectedVeEvents);
}
