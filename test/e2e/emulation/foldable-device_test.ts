// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {
  clickDevicePosture,
  getDevicePostureDropDown,
  getWidthOfDevice,
  selectFoldableDevice,
  selectNonDualScreenDevice,
  startEmulationWithDualScreenPage,
} from '../helpers/emulation-helpers.js';

const ZENBOOK_VERTICAL_SPANNED_WIDTH = '1706';
const ZENBOOK_VERTICAL_WIDTH = '853';

describe('Test the Device Posture API support', () => {
  beforeEach(async function() {
    await startEmulationWithDualScreenPage();
  });

  it('User can change the posture of a foldable device', async () => {
    await selectFoldableDevice();
    let widthSingle = await getWidthOfDevice();
    assert(widthSingle === ZENBOOK_VERTICAL_WIDTH);

    await clickDevicePosture('Folded');
    const widthDual = await getWidthOfDevice();
    assert(widthDual === ZENBOOK_VERTICAL_SPANNED_WIDTH);

    await clickDevicePosture('Continuous');
    widthSingle = await getWidthOfDevice();
    assert(widthSingle === ZENBOOK_VERTICAL_WIDTH);
  });

  it('User may not change the posture for a non-foldable screen device', async () => {
    await selectNonDualScreenDevice();
    // posture dropdown should not be found
    const dropdown = await getDevicePostureDropDown();
    const element = dropdown.asElement();
    const hidden = element ? element.evaluate(x => (x as Element).classList.contains('hidden')) : false;
    assert(hidden);
  });
});
