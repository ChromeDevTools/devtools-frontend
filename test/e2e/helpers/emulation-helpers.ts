// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {$, click, getBrowserAndPages, reloadDevTools, waitFor} from '../../shared/helper.js';

const DEVICE_TOOLBAR_TOGGLER_SELECTOR = '[aria-label="Toggle device toolbar"]';
const DEVICE_TOOLBAR_SELECTOR = '.device-mode-toolbar';
const DEVICE_TOOLBAR_OPTIONS_SELECTOR = '.device-mode-toolbar .device-mode-toolbar-options';
const MEDIA_QUERY_INSPECTOR_SELECTOR = '.media-inspector-view';

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
  const isOpen = await inspector.evaluate(element => Boolean(element));
  if (isOpen) {
    return;
  }

  await click(DEVICE_TOOLBAR_OPTIONS_SELECTOR);
  const {frontend} = getBrowserAndPages();
  await frontend.keyboard.press('ArrowDown');
  await frontend.keyboard.press('Enter');
  await waitFor(MEDIA_QUERY_INSPECTOR_SELECTOR);
};
