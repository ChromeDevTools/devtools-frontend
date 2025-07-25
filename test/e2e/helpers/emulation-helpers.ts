// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as puppeteer from 'puppeteer-core';

import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

import {
  reloadDevTools,
} from './cross-tool-helper.js';

const DEVICE_TOOLBAR_TOGGLER_SELECTOR = '[aria-label="Toggle device toolbar"]';
const DEVICE_TOOLBAR_SELECTOR = '.device-mode-toolbar';
const DEVICE_TOOLBAR_OPTIONS_SELECTOR = '.device-mode-toolbar .device-mode-toolbar-options';
const MEDIA_QUERY_INSPECTOR_SELECTOR = '.media-inspector-view';
const DEVICE_LIST_DROPDOWN_SELECTOR = '.toolbar-button';
const ZOOM_LIST_DROPDOWN_SELECTOR = '[aria-label*="Zoom"]';
const SURFACE_DUO_MENU_ITEM_SELECTOR = '[aria-label*="Surface Duo"]';
const FOLDABLE_DEVICE_MENU_ITEM_SELECTOR = '[aria-label*="Asus Zenbook Fold"]';
const EDIT_MENU_ITEM_SELECTOR = '[aria-label*="Edit"]';
const TEST_DEVICE_MENU_ITEM_SELECTOR = '[aria-label*="Test device, unchecked"]';
const DUAL_SCREEN_BUTTON_SELECTOR = '[aria-label="Toggle dual-screen mode"]';
const DEVICE_POSTURE_DROPDOWN_SELECTOR = '[aria-label="Device posture"]';
const SCREEN_DIM_INPUT_SELECTOR = '[title="Width"]';
const AUTO_AUTO_ADJUST_ZOOM_SELECTOR = '[aria-label*="Auto-adjust zoom"]';

export const reloadDockableFrontEnd = async () => {
  await reloadDevTools({canDock: true});
};

export const deviceModeIsEnabled =
    async (inspectedPage: InspectedPage = getBrowserAndPagesWrappers().inspectedPage) => {
  // Check the userAgent string to see whether emulation is really enabled.
  const userAgent = await inspectedPage.evaluate(() => navigator.userAgent);
  return userAgent.includes('Mobile');
};

export const clickDeviceModeToggler =
    async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const deviceToolbarToggler = await devToolsPage.waitFor(DEVICE_TOOLBAR_TOGGLER_SELECTOR);
  await devToolsPage.clickElement(deviceToolbarToggler);
};

export const openDeviceToolbar = async (
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage: InspectedPage = getBrowserAndPagesWrappers().inspectedPage) => {
  if (await deviceModeIsEnabled(inspectedPage)) {
    return;
  }
  await clickDeviceModeToggler(devToolsPage);
  await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
};

export const showMediaQueryInspector =
    async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const inspector = await devToolsPage.$(MEDIA_QUERY_INSPECTOR_SELECTOR);
  if (inspector) {
    return;
  }
  await devToolsPage.click(DEVICE_TOOLBAR_OPTIONS_SELECTOR);
  await devToolsPage.page.keyboard.press('ArrowDown');
  await devToolsPage.page.keyboard.press('Enter');
  await devToolsPage.waitFor(MEDIA_QUERY_INSPECTOR_SELECTOR);
};

export const startEmulationWithDualScreenPage = async (
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage: InspectedPage = getBrowserAndPagesWrappers().inspectedPage) => {
  await inspectedPage.goToResource('emulation/dual-screen-inspector.html');
  await devToolsPage.waitFor('.tabbed-pane-left-toolbar');
  await openDeviceToolbar(devToolsPage, inspectedPage);
};

export const getButtonDisabled = async (spanButton: puppeteer.ElementHandle<HTMLButtonElement>) => {
  return await spanButton.evaluate(e => {
    return e.disabled;
  });
};

export const clickDevicesDropDown = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const toolbar = await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
  await devToolsPage.click(DEVICE_LIST_DROPDOWN_SELECTOR, {root: toolbar});
};

export const clickDevicePostureDropDown =
    async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const toolbar = await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
  await devToolsPage.click(DEVICE_POSTURE_DROPDOWN_SELECTOR, {root: toolbar});
};

export const clickZoomDropDown = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const toolbar = await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
  await devToolsPage.click(ZOOM_LIST_DROPDOWN_SELECTOR, {root: toolbar});
};

export const clickWidthInput = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const toolbar = await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
  await devToolsPage.click(SCREEN_DIM_INPUT_SELECTOR, {root: toolbar});
};

export const selectToggleButton = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  // button that toggles between single and double screen.
  const toggleButton = await devToolsPage.$(DUAL_SCREEN_BUTTON_SELECTOR) as puppeteer.ElementHandle<HTMLButtonElement>;
  return toggleButton;
};

export const selectEdit = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await clickDevicesDropDown(devToolsPage);
  await devToolsPage.click(EDIT_MENU_ITEM_SELECTOR);
  await waitForNotExpanded(DEVICE_LIST_DROPDOWN_SELECTOR, devToolsPage);
};

export const selectDevice =
    async (name: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await clickDevicesDropDown(devToolsPage);
  await devToolsPage.click(`[aria-label*="${name}, unchecked"]`);
  await waitForNotExpanded(DEVICE_LIST_DROPDOWN_SELECTOR, devToolsPage);
};

export const selectTestDevice = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await clickDevicesDropDown(devToolsPage);
  await devToolsPage.click(TEST_DEVICE_MENU_ITEM_SELECTOR);
  await waitForNotExpanded(DEVICE_LIST_DROPDOWN_SELECTOR, devToolsPage);
};

// Test if span button works when emulating a dual screen device.
export const selectDualScreen = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await clickDevicesDropDown(devToolsPage);
  await devToolsPage.click(SURFACE_DUO_MENU_ITEM_SELECTOR);
  await waitForNotExpanded(DEVICE_LIST_DROPDOWN_SELECTOR, devToolsPage);
};

export const selectFoldableDevice = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await clickDevicesDropDown(devToolsPage);
  await devToolsPage.click(FOLDABLE_DEVICE_MENU_ITEM_SELECTOR);
  await waitForNotExpanded(DEVICE_LIST_DROPDOWN_SELECTOR, devToolsPage);
};

const waitForNotExpanded = async (selector: string, devToolsPage: DevToolsPage) => {
  const toolbar = await devToolsPage.waitFor(DEVICE_TOOLBAR_SELECTOR);
  const dropdown = await devToolsPage.waitFor(selector, toolbar);
  await devToolsPage.waitForFunction(async () => {
    const expanded = await dropdown.evaluate(el => el.getAttribute('aria-expanded'));
    return expanded === null;
  });
};

export const waitForZoomDropDownNotExpanded =
    async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await waitForNotExpanded(ZOOM_LIST_DROPDOWN_SELECTOR, devToolsPage);
};

export const clickDevicePosture =
    async (name: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await clickDevicePostureDropDown(devToolsPage);
  await devToolsPage.click(`[aria-label*="${name}, unchecked"]`);
  await waitForNotExpanded(DEVICE_POSTURE_DROPDOWN_SELECTOR, devToolsPage);
};

export const getDevicePostureDropDown =
    async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  // dropdown menu for the posture selection.
  const dropdown = await devToolsPage.$(DEVICE_POSTURE_DROPDOWN_SELECTOR);
  return dropdown as puppeteer.ElementHandle<HTMLButtonElement>| null;
};

export const clickToggleButton = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  // make sure the toggle button is clickable.
  await devToolsPage.click(DUAL_SCREEN_BUTTON_SELECTOR);
};

export const getWidthOfDevice = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  // Read the width of spanned duo to make sure spanning works.
  const widthInput = await devToolsPage.waitFor(SCREEN_DIM_INPUT_SELECTOR);
  return await widthInput.evaluate(e => (e as HTMLInputElement).value);
};

export const getZoom = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  // Read the width of spanned duo to make sure spanning works.
  const widthInput = await devToolsPage.waitFor(ZOOM_LIST_DROPDOWN_SELECTOR);
  return await widthInput.evaluate(e => (e as HTMLInputElement).innerText);
};

export const toggleAutoAdjustZoom = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await clickZoomDropDown(devToolsPage);
  await devToolsPage.click(AUTO_AUTO_ADJUST_ZOOM_SELECTOR);
  await waitForZoomDropDownNotExpanded(devToolsPage);
};

const IPAD_MENU_ITEM_SELECTOR = '[aria-label*="iPad"]';

export const selectNonDualScreenDevice =
    async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await clickDevicesDropDown(devToolsPage);
  await devToolsPage.click(IPAD_MENU_ITEM_SELECTOR);
  await waitForNotExpanded(DEVICE_LIST_DROPDOWN_SELECTOR, devToolsPage);
};
