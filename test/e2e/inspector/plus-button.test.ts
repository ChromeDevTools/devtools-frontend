// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  DRAWER_PANEL_SELECTOR,
  MAIN_PANEL_SELECTOR,
  tabExistsInDrawer,
  tabExistsInMainPanel,
} from '../helpers/cross-tool-helper.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

const PANEL_PLUS_BUTTON_SELECTOR = 'devtools-menu-button[jslog*="context: plus-button-panel"]';
const DRAWER_PLUS_BUTTON_SELECTOR = 'devtools-menu-button[jslog*="context: plus-button-drawer"]';
const SOFT_MENU_SELECTOR = '.soft-context-menu';
const SOFT_MENU_ITEM_SELECTOR = '.soft-context-menu-item';

async function enablePlusButton(devToolsPage: DevToolsPage): Promise<void> {
  await devToolsPage.setupMockHostConfigAndReload({devToolsPlusButton: {enabled: true}});
  // E2e tests must opt in to the soft (in-page) context menu; without
  // this the OS-native menu is used and `.soft-context-menu` never
  // appears in the DOM. Must be called AFTER the reload so the static
  // flag survives the new document load.
  await devToolsPage.useSoftMenu();
}

async function openPlusButtonMenu(devToolsPage: DevToolsPage, root: puppeteer.ElementHandle<Element>,
                                  selector: string): Promise<puppeteer.ElementHandle<Element>> {
  // `MenuButton.#triggerContextMenu` uses a 50ms `setTimeout` before
  // showing the menu (Windows double-click guard, crbug/339560549) so
  // the menu does NOT appear synchronously after the click resolves;
  // `waitFor` polls until it is in the DOM. Do NOT wrap this in a retry
  // loop: a second click while the menu is open toggles it closed.
  await devToolsPage.click(selector, {root});
  return await devToolsPage.waitFor(SOFT_MENU_SELECTOR);
}

async function softMenuItemLabels(devToolsPage: DevToolsPage,
                                  menu: puppeteer.ElementHandle<Element>): Promise<string[]> {
  const items = await devToolsPage.$$(SOFT_MENU_ITEM_SELECTOR, menu);
  return await Promise.all(items.map(item => item.evaluate(el => el.getAttribute('aria-label') ?? '')));
}

describe('Plus button', () => {
  it('is installed in the main panel when the feature is enabled', async ({devToolsPage}) => {
    await enablePlusButton(devToolsPage);
    const mainPanel = await devToolsPage.waitFor(MAIN_PANEL_SELECTOR);
    await devToolsPage.waitFor(PANEL_PLUS_BUTTON_SELECTOR, mainPanel);
  });

  it('is installed in the drawer when the feature is enabled', async ({devToolsPage}) => {
    await enablePlusButton(devToolsPage);
    await devToolsPage.evaluate(`
      (async () => {
        const UI = await import('./ui/legacy/legacy.js');
        UI.InspectorView.InspectorView.instance().showDrawer({focus: false, hasTargetDrawer: false});
      })()
    `);
    const drawer = await devToolsPage.waitFor(DRAWER_PANEL_SELECTOR);
    await devToolsPage.waitFor(DRAWER_PLUS_BUTTON_SELECTOR, drawer);
  });

  it('uses distinct jslog contexts for the panel and drawer plus buttons', async ({devToolsPage}) => {
    // Telemetry must be able to distinguish clicks on the panel plus
    // button from clicks on the drawer plus button.
    await enablePlusButton(devToolsPage);
    await devToolsPage.evaluate(`
      (async () => {
        const UI = await import('./ui/legacy/legacy.js');
        UI.InspectorView.InspectorView.instance().showDrawer({focus: false, hasTargetDrawer: false});
      })()
    `);
    const mainPanel = await devToolsPage.waitFor(MAIN_PANEL_SELECTOR);
    const drawer = await devToolsPage.waitFor(DRAWER_PANEL_SELECTOR);
    await devToolsPage.waitFor(PANEL_PLUS_BUTTON_SELECTOR, mainPanel);
    await devToolsPage.waitForNone(DRAWER_PLUS_BUTTON_SELECTOR, mainPanel);
    await devToolsPage.waitFor(DRAWER_PLUS_BUTTON_SELECTOR, drawer);
    await devToolsPage.waitForNone(PANEL_PLUS_BUTTON_SELECTOR, drawer);
  });

  it('is not installed when the feature is disabled', async ({devToolsPage}) => {
    // No setupMockHostConfigAndReload — `devToolsPlusButton.enabled` is
    // absent, so the gate in ViewManager skips installation.
    const mainPanel = await devToolsPage.waitFor(MAIN_PANEL_SELECTOR);
    await devToolsPage.waitForNone(PANEL_PLUS_BUTTON_SELECTOR, mainPanel);
  });

  it('opens a menu listing tools that are not currently visible', async ({devToolsPage}) => {
    await enablePlusButton(devToolsPage);
    const mainPanel = await devToolsPage.waitFor(MAIN_PANEL_SELECTOR);
    const menu = await openPlusButtonMenu(devToolsPage, mainPanel, PANEL_PLUS_BUTTON_SELECTOR);

    const labels = await softMenuItemLabels(devToolsPage, menu);
    assert.isNotEmpty(labels, 'plus-button menu should list at least one addable tool');
    // The menu should NOT include tabs that are already pinned in the main
    // tab strip (e.g. Elements is always visible by default).
    assert.notInclude(labels, 'Elements');
  });

  it('adds a tool to the main panel when an entry is selected', async ({devToolsPage}) => {
    await enablePlusButton(devToolsPage);
    const mainPanel = await devToolsPage.waitFor(MAIN_PANEL_SELECTOR);
    const menu = await openPlusButtonMenu(devToolsPage, mainPanel, PANEL_PLUS_BUTTON_SELECTOR);

    const labels = await softMenuItemLabels(devToolsPage, menu);
    // `Animations` is a closeable drawer-resident view (see
    // `animation-meta.ts`); the panel plus button must advertise it as
    // a cross-location candidate so the user can pull it into the main
    // tab strip.
    assert.include(labels, 'Animations');
    await devToolsPage.click(`${SOFT_MENU_ITEM_SELECTOR}[aria-label="Animations"]`, {root: menu});
    await tabExistsInMainPanel('#tab-animations', devToolsPage);
  });

  it('drawer plus button moves a panel tool into the drawer', async ({devToolsPage}) => {
    await enablePlusButton(devToolsPage);
    await devToolsPage.evaluate(`
      (async () => {
        const UI = await import('./ui/legacy/legacy.js');
        UI.InspectorView.InspectorView.instance().showDrawer({focus: false, hasTargetDrawer: false});
      })()
    `);
    const drawer = await devToolsPage.waitFor(DRAWER_PANEL_SELECTOR);
    const menu = await openPlusButtonMenu(devToolsPage, drawer, DRAWER_PLUS_BUTTON_SELECTOR);
    const labels = await softMenuItemLabels(devToolsPage, menu);
    // `Recorder` is a closeable panel-resident view (see
    // `recorder-meta.ts`); the drawer plus button must advertise it as
    // a cross-location candidate so the user can move it into the drawer.
    assert.include(labels, 'Recorder');
    await devToolsPage.click(`${SOFT_MENU_ITEM_SELECTOR}[aria-label="Recorder"]`, {root: menu});
    await tabExistsInDrawer('#tab-chrome-recorder', devToolsPage);
  });
});
