// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {DevToolsPage} from '../shared/frontend-helper.js';

export async function clickOnContextMenuItemFromTab(
    tabId: string, menuItemSelector: string, devToolsPage: DevToolsPage) {
  // Find the selected node, right click.
  await devToolsPage.click(tabId, {clickOptions: {button: 'right'}});

  // Click on the context menu option
  await devToolsPage.click(menuItemSelector);
}

export const MOVE_TO_DRAWER_SELECTOR = '[aria-label="Move to drawer"]';
export const MOVE_TO_MAIN_TAB_BAR_SELECTOR = '[aria-label="Move to main tab bar"]';
export const MAIN_PANEL_SELECTOR = 'div[class*="main-tabbed-pane"][slot*="main"]';
export const DRAWER_PANEL_SELECTOR = 'div[class*="drawer-tabbed-pane"][slot*="sidebar"]';
export const TAB_HEADER_SELECTOR = 'div[class*="tabbed-pane-header"]';

export async function tabExistsInMainPanel(tabId: string, devToolsPage: DevToolsPage) {
  const mainPanel = await devToolsPage.waitFor(MAIN_PANEL_SELECTOR);
  await devToolsPage.waitFor(tabId, mainPanel);
}

export async function tabExistsInDrawer(tabId: string, devToolsPage: DevToolsPage) {
  const drawer = await devToolsPage.waitFor(DRAWER_PANEL_SELECTOR);
  await devToolsPage.waitFor(tabId, drawer);
}

export const checkIfTabExistsInDrawer = async (tabId: string, devToolsPage: DevToolsPage) => {
  const drawer = await devToolsPage.waitFor(DRAWER_PANEL_SELECTOR);
  const header = await devToolsPage.waitFor(TAB_HEADER_SELECTOR, drawer);
  const tab = await devToolsPage.waitFor(tabId, header);
  return Boolean(tab);
};
