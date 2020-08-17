// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import {describe, it} from '../../shared/mocha-extensions.js';

import {clickToggleButton, getWidthOfDevice, selectDualScreen, selectNonDualScreenDevice, startEmulationWithDualScreenFlag} from '../helpers/emulation-helpers.js';
import {getButtonDisabled, selectToggleButton} from '../helpers/emulation-helpers.js';

const DUO_VERTICAL_SPANNED_WIDTH = '1114';
const DUO_VERTICAL_WIDTH = '540';

describe('Dual screen mode', async () => {
  beforeEach(async function() {
    await startEmulationWithDualScreenFlag();
  });

  it('User can toggle between single and dual screenmodes for a dual screen device', async () => {
    await selectDualScreen();
    await clickToggleButton();
    const widthDual = await getWidthOfDevice();
    assert(widthDual === DUO_VERTICAL_SPANNED_WIDTH);

    await clickToggleButton();
    const widthSingle = await getWidthOfDevice();
    assert(widthSingle === DUO_VERTICAL_WIDTH);
  });

  it('User may not click toggle dual screen button for a non-dual screen device', async () => {
    await selectNonDualScreenDevice();
    // toggle button should be disabled.
    const toggleButton = await selectToggleButton();
    const isDisabled = await getButtonDisabled(toggleButton);
    assert(isDisabled);
  });
});
