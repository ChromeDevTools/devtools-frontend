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
  deviceModeIsEnabled,
  deviceModeIsToggled,
  reloadDockableFrontEnd,
} from '../helpers/emulation-helpers.js';

describe('Disable device mode for chrome:// pages', () => {
  beforeEach(async function() {
    await reloadDockableFrontEnd();
    await waitFor('.tabbed-pane-left-toolbar');
  });

  it('chrome:// pages disable device mode', async () => {
    // Button is untoggled and device mode is off for chrome://version.
    await goTo('chrome://version');
    assert.isFalse(await deviceModeIsToggled());
    assert.isFalse(await deviceModeIsEnabled());
    // Clicking on the button toggles the button but does not enable device mode.
    await clickDeviceModeToggler();
    assert.isTrue(await deviceModeIsToggled());
    assert.isFalse(await deviceModeIsEnabled());
    // Button is is toggled and device mode is on for about://blank.
    await goTo('about://blank');
    assert.isTrue(await deviceModeIsToggled());
    assert.isTrue(await deviceModeIsEnabled());
    // Navigating back to chrome://version turns device mode off but leaves the button toggled.
    await goTo('chrome://version');
    assert.isTrue(await deviceModeIsToggled());
    assert.isFalse(await deviceModeIsEnabled());
    // Clicking on the button untoggles the button and disables device mode.
    await clickDeviceModeToggler();
    assert.isFalse(await deviceModeIsToggled());
    assert.isFalse(await deviceModeIsEnabled());
  });
});
