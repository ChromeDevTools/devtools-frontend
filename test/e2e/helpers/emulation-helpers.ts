// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as puppeteer from 'puppeteer-core';

import {
  $,
  click,
  getBrowserAndPages,
  goToResource,
  reloadDevTools,
  waitFor,
  clickElement,
} from '../../shared/helper.js';

const DEVICE_TOOLBAR_TOGGLER_SELECTOR = '[aria-label="Toggle device toolbar"]';
const DEVICE_TOOLBAR_SELECTOR = '.device-mode-toolbar';
const DEVICE_TOOLBAR_OPTIONS_SELECTOR = '.device-mode-toolbar .device-mode-toolbar-options';
const MEDIA_QUERY_INSPECTOR_SELECTOR = '.media-inspector-view';
const DEVICE_LIST_DROPDOWN_SELECTOR = '.toolbar-button';
const ZOOM_LIST_DROPDOWN_SELECTOR = '[aria-label*="Zoom"]';
const SURFACE_DUO_MENU_ITEM_SELECTOR = '[aria-label*="Surface Duo"]';
const EDIT_MENU_ITEM_SELECTOR = '[aria-label*="Edit"]';
const TEST_DEVICE_MENU_ITEM_SELECTOR = '[aria-label*="Test device, unchecked"]';
const DUAL_SCREEN_BUTTON_SELECTOR = '[aria-label="Toggle dual-screen mode"]';
const SCREEN_DIM_INPUT_SELECTOR = '[title="Width"]';

export const reloadDockableFrontEnd = async () => {
  await reloadDevTools({canDock: true});
};

export const openDeviceToolbar = async () => {
  const deviceToolbarToggler = await waitFor(DEVICE_TOOLBAR_TOGGLER_SELECTOR);
  const togglerARIAPressed = await deviceToolbarToggler.evaluate(element => element.getAttribute('aria-pressed'));
  const isOpen = togglerARIAPressed === 'true';
  if (isOpen) {
    return;
  }
  await clickElement(deviceToolbarToggler);
  await waitFor(DEVICE_TOOLBAR_SELECTOR);
};

export const showMediaQueryInspector = async () => {
  const inspector = await $(MEDIA_QUERY_INSPECTOR_SELECTOR);
  if (inspector) {
    return;
  }
  await click(DEVICE_TOOLBAR_OPTIONS_SELECTOR);
  const {frontend} = getBrowserAndPages();
  await frontend.keyboard.press('ArrowDown');
  await frontend.keyboard.press('Enter');
  await waitFor(MEDIA_QUERY_INSPECTOR_SELECTOR);
};

export const startEmulationWithDualScreenPage = async () => {
  await reloadDockableFrontEnd();
  await goToResource('emulation/dual-screen-inspector.html');
  await waitFor('.tabbed-pane-left-toolbar');
  await openDeviceToolbar();
};

export const getButtonDisabled = async (spanButton: puppeteer.ElementHandle<HTMLButtonElement>) => {
  return await spanButton.evaluate((e: HTMLButtonElement) => {
    return e.disabled;
  });
};

export const clickDevicesDropDown = async () => {
  // TODO(crbug.com/1411196): the dropdown might be clickable but not handling the events properly.
  await new Promise(resolve => setTimeout(resolve, 100));
  const toolbar = await waitFor(DEVICE_TOOLBAR_SELECTOR);
  await click(DEVICE_LIST_DROPDOWN_SELECTOR, {root: toolbar});
};

export const clickZoomDropDown = async () => {
  const toolbar = await waitFor(DEVICE_TOOLBAR_SELECTOR);
  await click(ZOOM_LIST_DROPDOWN_SELECTOR, {root: toolbar});
};

export const selectToggleButton = async () => {
  // button that toggles between single and double screen.
  const toggleButton = await $(DUAL_SCREEN_BUTTON_SELECTOR) as puppeteer.ElementHandle<HTMLButtonElement>;
  return toggleButton;
};

export const selectEdit = async () => {
  await clickDevicesDropDown();
  await click(EDIT_MENU_ITEM_SELECTOR);
};

export const selectDevice = async (name: string) => {
  await clickDevicesDropDown();
  await click(`[aria-label*="${name}, unchecked"]`);
};

export const selectTestDevice = async () => {
  await clickDevicesDropDown();
  await click(TEST_DEVICE_MENU_ITEM_SELECTOR);
};

// Test if span button works when emulating a dual screen device.
export const selectDualScreen = async () => {
  await clickDevicesDropDown();
  await click(SURFACE_DUO_MENU_ITEM_SELECTOR);
};

export const clickToggleButton = async () => {
  // make sure the toggle button is clickable.
  const toggleButton = await selectToggleButton();
  await clickElement(toggleButton);
};

export const getWidthOfDevice = async () => {
  // Read the width of spanned duo to make sure spanning works.
  const widthInput = await waitFor(SCREEN_DIM_INPUT_SELECTOR);
  return widthInput.evaluate(e => (e as HTMLInputElement).value);
};

const IPAD_MENU_ITEM_SELECTOR = '[aria-label*="iPad"]';

// Test if span button is clickable when emulating a non-dual-screen device.
export const selectNonDualScreenDevice = async () => {
  await clickDevicesDropDown();
  await click(IPAD_MENU_ITEM_SELECTOR);
};
