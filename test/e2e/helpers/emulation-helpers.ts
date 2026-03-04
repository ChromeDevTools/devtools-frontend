// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as puppeteer from 'puppeteer-core';

import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const DEVICE_TOOLBAR_TOGGLER_SELECTOR = '[aria-label="Toggle device toolbar"]';
const DEVICE_TOOLBAR_SELECTOR = '.device-mode-toolbar';
const DEVICE_TOOLBAR_OPTIONS_SELECTOR = '.device-mode-toolbar .device-mode-toolbar-options';
const MEDIA_QUERY_INSPECTOR_SELECTOR = '.media-inspector-view';
const DEVICE_LIST_DROPDOWN_SELECTOR = '.toolbar-button';
const ZOOM_LIST_DROPDOWN_SELECTOR = '[aria-label*="Zoom"]';
const DUAL_SCREEN_BUTTON_SELECTOR = 'devtools-button[title="Toggle dual-screen mode"]';
const DEVICE_POSTURE_DROPDOWN_SELECTOR = '[aria-label="Device posture"]';
const SCREEN_DIM_INPUT_SELECTOR = '[title="Width"]';
const AUTO_AUTO_ADJUST_ZOOM_SELECTOR = '[aria-label*="Auto-adjust zoom"]';

export const deviceModeIsEnabled = async (inspectedPage: InspectedPage) => {
  // Check the userAgent string to see whether emulation is really enabled.
  const userAgent = await inspectedPage.evaluate(() => navigator.userAgent);
  return userAgent.includes('Mobile');
};

export const clickDeviceModeToggler = async (devToolsPage: DevToolsPage) => {
  const deviceToolbarToggler = await devToolsPage.waitFor(DEVICE_TOOLBAR_TOGGLER_SELECTOR);
  await devToolsPage.clickElement(deviceToolbarToggler);
};

export const openDeviceToolbar = async (devToolsPage: DevToolsPage, inspectedPage: InspectedPage) => {
  if (await deviceModeIsEnabled(inspectedPage)) {
    return;
  }
  await clickDeviceModeToggler(devToolsPage);
  await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
};

export const showMediaQueryInspector = async (devToolsPage: DevToolsPage) => {
  const inspector = await devToolsPage.$(MEDIA_QUERY_INSPECTOR_SELECTOR);
  if (inspector) {
    return;
  }
  await devToolsPage.click(DEVICE_TOOLBAR_OPTIONS_SELECTOR);
  await devToolsPage.pressKey('ArrowDown');
  await devToolsPage.pressKey('Enter');
  await devToolsPage.waitFor(MEDIA_QUERY_INSPECTOR_SELECTOR);
};

export const startEmulationWithDualScreenPage = async (devToolsPage: DevToolsPage, inspectedPage: InspectedPage) => {
  await inspectedPage.goToResource('emulation/dual-screen-inspector.html');
  await devToolsPage.waitFor('.tabbed-pane-left-toolbar');
  await openDeviceToolbar(devToolsPage, inspectedPage);
};

export const getButtonDisabled = async (spanButton: puppeteer.ElementHandle<HTMLButtonElement>) => {
  return await spanButton.evaluate(e => {
    return e.disabled;
  });
};

export const clickDevicesDropDown = async (devToolsPage: DevToolsPage) => {
  const toolbar = await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
  await devToolsPage.click(DEVICE_LIST_DROPDOWN_SELECTOR, {root: toolbar});
};

export const clickZoomDropDown = async (devToolsPage: DevToolsPage) => {
  const toolbar = await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
  await devToolsPage.click(ZOOM_LIST_DROPDOWN_SELECTOR, {root: toolbar});
};

const selectOption = async (devToolsPage: DevToolsPage, element: puppeteer.ElementHandle, itemSelector: string) => {
  await element.click();
  await devToolsPage.click(itemSelector);
  await devToolsPage.waitForFunction(async () => {
    const expanded = await element.evaluate(el => el.getAttribute('aria-expanded'));
    return expanded === null;
  });
};

const selectDeviceItem = async (devToolsPage: DevToolsPage, value: string) => {
  const toolbar = await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
  const element = await devToolsPage.waitFor(DEVICE_LIST_DROPDOWN_SELECTOR, toolbar);

  const itemSelector = `[role="menuitem"][aria-label*="${value}"]`;
  await selectOption(devToolsPage, element, itemSelector);
};

export const selectZoomLevel = async (devToolsPage: DevToolsPage, text: string) => {
  const zoomSelect = await devToolsPage.waitFor(ZOOM_LIST_DROPDOWN_SELECTOR);
  await selectOption(devToolsPage, zoomSelect, `[aria-label^="${text}"]`);
};

export const clickWidthInput = async (devToolsPage: DevToolsPage) => {
  const toolbar = await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
  await devToolsPage.click(SCREEN_DIM_INPUT_SELECTOR, {root: toolbar});
};

export const selectToggleButton = async (devToolsPage: DevToolsPage) => {
  // button that toggles between single and double screen.
  const toggleButton = await devToolsPage.$(DUAL_SCREEN_BUTTON_SELECTOR) as puppeteer.ElementHandle<HTMLButtonElement>;
  return toggleButton;
};

export const selectEdit = async (devToolsPage: DevToolsPage) => {
  await selectDeviceItem(devToolsPage, 'Edit');
};

export const selectDevice = async (name: string, devToolsPage: DevToolsPage) => {
  await selectDeviceItem(devToolsPage, name);
};

export const selectTestDevice = async (devToolsPage: DevToolsPage) => {
  await selectDeviceItem(devToolsPage, 'Test device');
};

/** Test if span button works when emulating a dual screen device. **/
export const selectDualScreen = async (devToolsPage: DevToolsPage) => {
  await selectDeviceItem(devToolsPage, 'Surface Duo');
};

export const selectFoldableDevice = async (devToolsPage: DevToolsPage) => {
  await selectDeviceItem(devToolsPage, 'Asus Zenbook Fold');
};
const waitForNotExpanded = async (selector: string, devToolsPage: DevToolsPage) => {
  const toolbar = await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
  const dropdown = await devToolsPage.waitFor(selector, toolbar);
  await devToolsPage.waitForFunction(async () => {
    const expanded = await dropdown.evaluate(el => el.getAttribute('aria-expanded'));
    return expanded === null;
  });
};

export const waitForZoomDropDownNotExpanded = async (devToolsPage: DevToolsPage) => {
  await waitForNotExpanded(ZOOM_LIST_DROPDOWN_SELECTOR, devToolsPage);
};

export const clickDevicePosture = async (name: string, devToolsPage: DevToolsPage) => {
  const toolbar = await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
  const element = await devToolsPage.waitFor(DEVICE_POSTURE_DROPDOWN_SELECTOR, toolbar);
  await selectOption(devToolsPage, element, `[aria-label*="${name}"]`);
};

export const getDevicePostureDropDown = async (devToolsPage: DevToolsPage) => {
  // dropdown menu for the posture selection.
  const dropdown = await devToolsPage.$(DEVICE_POSTURE_DROPDOWN_SELECTOR);
  return dropdown as puppeteer.ElementHandle<HTMLButtonElement>| null;
};

export const clickToggleButton = async (devToolsPage: DevToolsPage) => {
  // make sure the toggle button is clickable.
  await devToolsPage.click(DUAL_SCREEN_BUTTON_SELECTOR);
};

export const getWidthOfDevice = async (devToolsPage: DevToolsPage) => {
  // Read the width of spanned duo to make sure spanning works.
  const widthInput = await devToolsPage.waitFor(SCREEN_DIM_INPUT_SELECTOR);
  return await widthInput.evaluate(e => (e as HTMLInputElement).value);
};

export const getZoom = async (devToolsPage: DevToolsPage) => {
  // Read the width of spanned duo to make sure spanning works.
  const zoomSelect = await devToolsPage.waitFor(ZOOM_LIST_DROPDOWN_SELECTOR);
  return await zoomSelect.evaluate(e => (e as HTMLInputElement).innerText);
};

export const toggleAutoAdjustZoom = async (devToolsPage: DevToolsPage) => {
  const toolbar = await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
  await devToolsPage.click(AUTO_AUTO_ADJUST_ZOOM_SELECTOR, {root: toolbar});
};

export const selectNonDualScreenDevice = async (devToolsPage: DevToolsPage) => {
  await selectDeviceItem(devToolsPage, 'iPad');
};
