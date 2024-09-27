// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  $,
  click,
  clickElement,
  getBrowserAndPages,
  hover,
  scrollElementIntoView,
  waitFor,
  waitForAria,
  waitForFunction,
} from '../../shared/helper.js';

export const openPanelViaMoreTools = async (panelTitle: string) => {
  const {frontend} = getBrowserAndPages();

  await frontend.bringToFront();

  // Head to the triple dot menu.
  await click('aria/Customize and control DevTools');

  await waitForFunction(async () => {
    // Open the “More Tools” option.
    await hover('aria/More tools[role="menuitem"]');
    return $(`${panelTitle}[role="menuitem"]`, undefined, 'aria');
  });

  // Click the desired menu item
  await click(`aria/${panelTitle}[role="menuitem"]`);

  // Wait for the corresponding panel to appear.
  await waitForAria(`${panelTitle} panel[role="tabpanel"]`);
};

export const openSettingsTab = async (tabTitle: string) => {
  const gearIconSelector = 'devtools-button[aria-label="Settings"]';
  const settingsMenuSelector = `.tabbed-pane-header-tab[aria-label="${tabTitle}"]`;
  const panelSelector = `.view-container[aria-label="${tabTitle} panel"]`;

  // Click on the Settings Gear toolbar icon.
  await click(gearIconSelector);

  // Click on the Settings tab and wait for the panel to appear.
  await click(settingsMenuSelector);
  await waitFor(panelSelector);
};

export const closeSettings = async () => {
  await click('.dialog-close-button');
};

export const togglePreferenceInSettingsTab = async (label: string, shouldBeChecked?: boolean) => {
  await openSettingsTab('Preferences');

  const selector = `[aria-label="${label}"]`;
  await scrollElementIntoView(selector);
  const preference = await waitFor(selector);

  const value = await preference.evaluate(checkbox => (checkbox as HTMLInputElement).checked);

  if (value !== shouldBeChecked) {
    await clickElement(preference);

    await waitForFunction(async () => {
      const newValue = await preference.evaluate(checkbox => (checkbox as HTMLInputElement).checked);
      return newValue !== value;
    });
  }

  await closeSettings();
};

export const setIgnoreListPattern = async (pattern: string) => {
  await openSettingsTab('Ignore list');
  await click('[aria-label="Add a regular expression rule for the script\'s URL"]');
  const textBox = await waitFor('[aria-label="Add a regular expression rule for the script\'s URL"]');
  await clickElement(textBox);
  await textBox.type(pattern);
  await textBox.type('\n');
  await waitFor(`[title="Ignore scripts whose names match '${pattern}'"]`);
  await closeSettings();
};

export const toggleIgnoreListing = async (enable: boolean) => {
  await openSettingsTab('Ignore list');
  const enabledPattern = '.ignore-list-options:not(.ignore-listing-disabled)';
  const disabledPattern = '.ignore-list-options.ignore-listing-disabled';
  await waitFor(enable ? disabledPattern : enabledPattern);
  await click('[title="Enable ignore listing"]');
  await waitFor(enable ? enabledPattern : disabledPattern);
  await closeSettings();
};
