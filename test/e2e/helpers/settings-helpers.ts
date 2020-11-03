// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, waitFor, waitForAria} from '../../shared/helper.js';

export const openPanelViaMoreTools = async (panelTitle: string) => {

  // Head to the triple dot menu.
  const tripleDotMenu = await waitForAria('Customize and control DevTools');
  await click(tripleDotMenu);

  // Open the “More Tools” option.
  const moreTools = await waitForAria('More tools[role="menuitem"]');
  await moreTools.hover();

  // Click the desired menu item
  const menuItem = await waitForAria(`${panelTitle}[role="menuitem"]`);
  await click(menuItem);

  // Wait for the corresponding panel to appear.
  await waitForAria(`${panelTitle} panel[role="tabpanel"]`);
};

export const openSettingsTab = async (tabTitle: string) => {
  const gearIconSelector = '.toolbar-button[aria-label="Settings"]';
  const settingsMenuSelector = `.tabbed-pane-header-tab[aria-label="${tabTitle}"]`;
  const panelSelector = `.view-container[aria-label="${tabTitle} panel"]`;

  // Click on the Settings Gear toolbar icon.
  await click(gearIconSelector);

  // Click on the Settings tab and wait for the panel to appear.
  await waitFor(settingsMenuSelector);
  await click(settingsMenuSelector);
  await waitFor(panelSelector);
};

export const togglePreferenceInSettingsTab = async (label: string) => {
  await openSettingsTab('Preferences');
  await click(`[aria-label="${label}"`);
  await click('.dialog-close-button');
};
