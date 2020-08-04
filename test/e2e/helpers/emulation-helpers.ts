// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as puppeteer from 'puppeteer';

import {$, click, enableExperiment, getBrowserAndPages, goToResource, reloadDevTools, waitFor} from '../../shared/helper.js';

const DEVICE_TOOLBAR_TOGGLER_SELECTOR = '[aria-label="Toggle device toolbar"]';
const DEVICE_TOOLBAR_SELECTOR = '.device-mode-toolbar';
const DEVICE_TOOLBAR_OPTIONS_SELECTOR = '.device-mode-toolbar .device-mode-toolbar-options';
const MEDIA_QUERY_INSPECTOR_SELECTOR = '.media-inspector-view';
const DEVICE_LIST_DROPDOWN_SELECTOR = '.toolbar-button';
const SURFACE_DUO_MENU_ITEM_SELECTOR = '[aria-label*="Surface Duo"]';
const DUAL_SCREEN_BUTTON_SELECTOR = '[aria-label="Toggle dual-screen mode"]';
const SCREEN_DIM_INPUT_SELECTOR = '.device-mode-size-input';

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
  await click(deviceToolbarToggler);
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

export const startEmulationWithDualScreenFlag = async () => {
  await enableExperiment('dualScreenSupport', {canDock: true});
  await goToResource('emulation/dual-screen-inspector.html');
  await waitFor('.tabbed-pane-left-toolbar');
  await openDeviceToolbar();
};

export const getButtonDisabled = async (spanButton: puppeteer.JSHandle<HTMLButtonElement>) => {
  return await spanButton.evaluate((e: HTMLButtonElement) => {
    return e.disabled;
  });
};

const clickDevicesDropDown = async () => {
  const toolbar = await waitFor(DEVICE_TOOLBAR_SELECTOR);
  const button = await waitFor(DEVICE_LIST_DROPDOWN_SELECTOR, toolbar);
  await click(button);
};

export const selectToggleButton = async () => {
  // button that toggles between single and double screen.
  const toggleButton = await $(DUAL_SCREEN_BUTTON_SELECTOR) as puppeteer.JSHandle<HTMLButtonElement>;
  return toggleButton;
};

// Test if span button works when emulating a dual screen device.
export const selectDualScreen = async () => {
  await clickDevicesDropDown();
  const duo = await waitFor(SURFACE_DUO_MENU_ITEM_SELECTOR);
  await click(duo);
};

export const clickToggleButton = async () => {
  // make sure the toggle button is clickable.
  const toggleButton = await selectToggleButton();
  await click(toggleButton);
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
  const nonDual = await waitFor(IPAD_MENU_ITEM_SELECTOR);
  await click(nonDual);
};
