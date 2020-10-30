// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, closeAllCloseableTabs, goToResource, waitFor} from '../../shared/helper.js';

export async function prepareForCrossToolScenario() {
  await navigateToCrossToolIntegrationSite();
  await closeAllCloseableTabs();
}

export async function navigateToCrossToolIntegrationSite() {
  await goToResource('cross_tool/default.html');
}

export async function clickOnContextMenuItemFromTab(tabId: string, menuItemSelector: string) {
  // Find the selected node, right click.
  const selectedNode = await waitFor(tabId);
  await click(selectedNode, {clickOptions: {button: 'right'}});

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

export const checkIfTabExistsInMainPanel = async (tabId: string) => {
  const mainPanel = await waitFor(MAIN_PANEL_SELECTOR);
  const header = await waitFor(TAB_HEADER_SELECTOR, mainPanel);
  const tab = await header.$(tabId);
  return !!tab;
};

export const checkIfTabExistsInDrawer = async (tabId: string) => {
  const drawer = await waitFor(DRAWER_PANEL_SELECTOR);
  const header = await waitFor(TAB_HEADER_SELECTOR, drawer);
  const tab = await header.$(tabId);
  return !!tab;
};

export const moveTabToDrawer = async (tabId: string) => {
  if (!checkIfTabExistsInMainPanel(tabId)) {
    return;
  }
  await clickOnContextMenuItemFromTab(tabId, MOVE_TO_DRAWER_SELECTOR);
};

export const moveTabToMainPanel = async (tabId: string) => {
  if (!checkIfTabExistsInDrawer(tabId)) {
    return;
  }
  await clickOnContextMenuItemFromTab(tabId, MOVE_TO_MAIN_PANEL_SELECTOR);
};
