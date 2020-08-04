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

const MAIN_PANEL_SELECTOR = 'div[class*="main-tabbed-pane"][slot*="insertion-point-main"]';
const DRAWER_PANEL_SELECTOR = 'div[class*="drawer-tabbed-pane"][slot*="insertion-point-sidebar"]';

export async function tabExistsInMainPanel(tabId: string) {
  const mainPanel = await waitFor(MAIN_PANEL_SELECTOR);
  await waitFor(tabId, mainPanel);
}

export async function tabExistsInDrawer(tabId: string) {
  const drawer = await waitFor(DRAWER_PANEL_SELECTOR);
  await waitFor(tabId, drawer);
}
