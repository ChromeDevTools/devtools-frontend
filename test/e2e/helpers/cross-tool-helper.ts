// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type DevToolsFrontendReloadOptions} from '../../conductor/frontend_tab.js';
import {click, reloadDevTools as baseReloadDevTools, waitFor} from '../../shared/helper.js';

import {
  expectVeImpressions,
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
export const MAIN_PANEL_SELECTOR = 'div[class*="main-tabbed-pane"][slot*="insertion-point-main"]';
export const DRAWER_PANEL_SELECTOR = 'div[class*="drawer-tabbed-pane"][slot*="insertion-point-sidebar"]';
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

/**
 * Reloads DevTools and checks for VE impressions
 */
export async function reloadDevTools(options?: DevToolsFrontendReloadOptions&{expectClosedPanels?: string[]}) {
  await baseReloadDevTools(options);
  const selectedPanel = options?.selectedPanel?.name || options?.queryParams?.panel || 'elements';
  await waitFor(`.panel.${selectedPanel}`);
  const expectClosedPanels = options?.expectClosedPanels;
  const dockable = options?.canDock;
  const panelImpression =
      selectedPanel === 'elements' ? veImpressionForElementsPanel({dockable}) : veImpression('Panel', selectedPanel);
  const expectedVeEvents = [veImpressionForMainToolbar({selectedPanel, expectClosedPanels, dockable}), panelImpression];
  if (options?.drawerShown) {
    expectedVeEvents.push(veImpression('Drawer', undefined, [
      veImpression(
          'Toolbar', 'drawer',
          [
            veImpression('PanelTabHeader', 'console'),
            veImpression('Close'),
          ]),
    ]));
  }
  await expectVeImpressions(expectedVeEvents.flat());
}
