// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, scrollElementIntoView, waitFor, waitForAria, waitForFunction} from '../../shared/helper.js';

export const openPanelViaMoreTools = async (panelTitle: string, isLocalized = false) => {
  // Head to the triple dot menu.
  const tripleDotMenuText = isLocalized ? 'Ĉúŝt́ôḿîźê án̂d́ ĉón̂t́r̂ól̂ D́êv́T̂óôĺŝ' : 'Customize and control DevTools';
  const tripleDotMenu = await waitForAria(tripleDotMenuText);
  await click(tripleDotMenu);

  const moreToolsText = isLocalized ? 'M̂ór̂é t̂óôĺŝ' : 'More tools';
  // Open the “More Tools” option.
  const moreTools = await waitForAria(`${moreToolsText}[role="menuitem"]`);
  await moreTools.hover();

  // Click the desired menu item
  const menuItem = await waitForAria(`${panelTitle}[role="menuitem"]`);
  await click(menuItem);

  const panelText = isLocalized ? 'p̂án̂él̂' : 'panel';

  // Wait for the corresponding panel to appear.
  await waitForAria(`${panelTitle} ${panelText}[role="tabpanel"]`);
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

export const closeSettings = async () => {
  await click('.dialog-close-button');
};

export const togglePreferenceInSettingsTab = async (label: string) => {
  await openSettingsTab('Preferences');

  const selector = `[aria-label="${label}"`;
  await scrollElementIntoView(selector);
  const preference = await waitFor(selector);

  const value = await preference.evaluate(checkbox => (checkbox as HTMLInputElement).checked);

  await click(preference);

  await waitForFunction(async () => {
    const newValue = await preference.evaluate(checkbox => (checkbox as HTMLInputElement).checked);
    return newValue !== value;
  });

  await closeSettings();
};

export const setIgnoreListPattern = async (pattern: string) => {
  await openSettingsTab('Ignore List');
  await click('[aria-label="Add filename pattern"]');
  const textBox = await waitFor('[aria-label="Pattern"]');
  await click(textBox);
  await textBox.type(pattern);
  await textBox.type('\n');
  await waitFor(`[title="Ignore scripts whose names match '${pattern}'"]`);
  await closeSettings();
};
