// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {
  pressKey,
  waitFor,
} from '../../shared/helper.js';

import {
  clickWidthInput,
  clickZoomDropDown,
  getZoom,
  openDeviceToolbar,
  reloadDockableFrontEnd,
  toggleAutoAdjustZoom,
} from '../helpers/emulation-helpers.js';

describe('Custom devices', () => {
  beforeEach(async function() {
    await reloadDockableFrontEnd();
    await waitFor('.tabbed-pane-left-toolbar');
    await openDeviceToolbar();
  });

  it('can preserved zoom', async () => {
    await clickZoomDropDown();
    await pressKey('ArrowDown');
    await pressKey('Enter');
    assert.strictEqual(await getZoom(), '50%');

    await clickWidthInput();
    await pressKey('ArrowDown');
    assert.strictEqual(await getZoom(), '100%');

    await clickZoomDropDown();
    await pressKey('ArrowDown');
    await pressKey('Enter');
    assert.strictEqual(await getZoom(), '50%');

    await toggleAutoAdjustZoom();

    await clickWidthInput();
    await pressKey('ArrowDown');
    assert.strictEqual(await getZoom(), '50%');
  });
});
