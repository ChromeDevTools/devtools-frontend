// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

export async function openPanelViaMoreTools(panelTitle: string, frontend?: DevToolsPage) {
  frontend = frontend || getBrowserAndPagesWrappers().devToolsPage;
  await frontend.bringToFront();

  // Head to the triple dot menu.
  await frontend.click('aria/Customize and control DevTools');

  await frontend.waitForFunction(async () => {
    // Open the “More Tools” option.
    await frontend.hover('aria/More tools[role="menuitem"]');
    return await frontend.$(`${panelTitle}[role="menuitem"]`, undefined, 'aria');
  });

  // Click the desired menu item
  await frontend.click(`aria/${panelTitle}[role="menuitem"]`);

  // Wait for the triple dot menu to be collapsed.
  const button = await frontend.waitForAria('Customize and control DevTools');
  await frontend.waitForFunction(async () => {
    const expanded = await button.evaluate(el => el.getAttribute('aria-expanded'));
    return expanded === null;
  });

  // Wait for the corresponding panel to appear.
  await frontend.waitForAria(`${panelTitle} panel[role="tabpanel"]`);
}

export const openSettingsTab = async (tabTitle: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const gearIconSelector = 'devtools-button[aria-label="Settings"]';
  const settingsMenuSelector = `.tabbed-pane-header-tab[aria-label="${tabTitle}"]`;
  const panelSelector = `.view-container[aria-label="${tabTitle} panel"]`;

  // Click on the Settings Gear toolbar icon.
  await devToolsPage.click(gearIconSelector);

  // Click on the Settings tab and wait for the panel to appear.
  await devToolsPage.click(settingsMenuSelector);
  await devToolsPage.waitFor(panelSelector);
};

export const closeSettings = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.click('.dialog-close-button');
};

export const togglePreferenceInSettingsTab =
    async (label: string, shouldBeChecked?: boolean, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await openSettingsTab('Preferences', devToolsPage);

  const selector = `[aria-label="${label}"]`;
  await devToolsPage.scrollElementIntoView(selector);
  const preference = await devToolsPage.waitFor(selector);

  const value = await preference.evaluate(checkbox => (checkbox as HTMLInputElement).checked);

  if (value !== shouldBeChecked) {
    await devToolsPage.clickElement(preference);

    await devToolsPage.waitForFunction(async () => {
      const newValue = await preference.evaluate(checkbox => (checkbox as HTMLInputElement).checked);
      return newValue !== value;
    });
  }

  await closeSettings(devToolsPage);
};

export const setIgnoreListPattern =
    async (pattern: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await openSettingsTab('Ignore list', devToolsPage);
  await devToolsPage.click('[aria-label="Add a regular expression rule for the script\'s URL"]');
  const textBox = await devToolsPage.waitFor('[aria-label="Add a regular expression rule for the script\'s URL"]');
  await devToolsPage.clickElement(textBox);
  await textBox.type(pattern);
  await textBox.type('\n');
  await devToolsPage.waitFor(`[title="Ignore scripts whose names match '${pattern}'"]`);
  await closeSettings(devToolsPage);
};

export const toggleIgnoreListing =
    async (enable: boolean, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await openSettingsTab('Ignore list', devToolsPage);
  await devToolsPage.setCheckBox('[title="Enable ignore listing"]', enable);
  await closeSettings(devToolsPage);
};
