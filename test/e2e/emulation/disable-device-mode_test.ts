// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {
  goTo,
  waitFor,
} from '../../shared/helper.js';
import {
  clickDeviceModeToggler,
  deviceModeButtonCanEnable,
  deviceModeIsEnabled,
  openDeviceToolbar,
  reloadDockableFrontEnd,
} from '../helpers/emulation-helpers.js';

describe('Disable device mode for chrome:// pages', () => {
  beforeEach(async function() {
    await reloadDockableFrontEnd();
    await waitFor('.tabbed-pane-left-toolbar');
  });

  it('chrome:// pages disable device mode', async () => {
    // Button is untoggled and enabled initially.
    assert.isFalse(await deviceModeIsEnabled());
    assert.isTrue(await deviceModeButtonCanEnable());
    // Button is untoggled and enabled for about://blank.
    await goTo('about://blank');
    assert.isFalse(await deviceModeIsEnabled());
    assert.isTrue(await deviceModeButtonCanEnable());
    // Button is untoggled and enabled for chrome://version.
    await goTo('chrome://version');
    assert.isFalse(await deviceModeIsEnabled());
    assert.isFalse(await deviceModeButtonCanEnable());
    // Clicking on the button does not enable device mode.
    await clickDeviceModeToggler();
    assert.isFalse(await deviceModeIsEnabled());
    assert.isFalse(await deviceModeButtonCanEnable());
    // Button is untoggled and enabled for about://blank.
    await goTo('about://blank');
    assert.isFalse(await deviceModeIsEnabled());
    assert.isTrue(await deviceModeButtonCanEnable());
    // Clicking on the button enables device mode.
    await openDeviceToolbar();
    assert.isTrue(await deviceModeIsEnabled());
    assert.isTrue(await deviceModeButtonCanEnable());
  });

  it('device mode turns back on automatically', async () => {
    // Button is untoggled and enabled initially.
    assert.isFalse(await deviceModeIsEnabled());
    assert.isTrue(await deviceModeButtonCanEnable());
    // Button is untoggled and enabled for about://blank.
    await goTo('about://blank');
    assert.isFalse(await deviceModeIsEnabled());
    assert.isTrue(await deviceModeButtonCanEnable());
    // Clicking on the button enables device mode.
    await openDeviceToolbar();
    assert.isTrue(await deviceModeIsEnabled());
    assert.isTrue(await deviceModeButtonCanEnable());
    // Navigating to chrome://version disables device mode.
    await goTo('chrome://version');
    assert.isFalse(await deviceModeIsEnabled());
    assert.isFalse(await deviceModeButtonCanEnable());
    // Navigating back to about://blank re-enables device mode.
    await goTo('about://blank');
    assert.isTrue(await deviceModeIsEnabled());
    assert.isTrue(await deviceModeButtonCanEnable());
  });
});
