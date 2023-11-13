// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {tabForward, waitForNone} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getOrientationInputs, getOrientationValues, setCustomOrientation} from '../helpers/sensors-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('Orientation emulation on Sensors panel', () => {
  beforeEach(async () => {
    await openPanelViaMoreTools('Sensors');
  });

  it('presets correct default values on Custom orientation selected', async () => {
    await setCustomOrientation();

    const actualOrientations = await getOrientationValues();

    const expectedOrientations = [0, 90, 0];

    assert.deepEqual(actualOrientations, expectedOrientations);
  });

  it('allows negative alpha values', async () => {
    await setCustomOrientation();

    const alpha = (await getOrientationInputs())[0];
    await alpha.type('-1');

    const actualValue = (await getOrientationValues())[0];
    const expectedValue = -1;
    assert.deepEqual(actualValue, expectedValue);

    await tabForward();
    await waitForNone('.error-input');
  });
});
