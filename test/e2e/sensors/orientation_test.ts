// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {type ElementHandle} from 'puppeteer-core';

import {tabForward, waitFor, waitForNone} from '../../shared/helper.js';

import {
  getInputFieldValue,
  getOrientationInputs,
  getOrientationValues,
  setCustomOrientation,
} from '../helpers/sensors-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

async function assertValidationFails(inputElement: ElementHandle<Element>, value: number) {
  await inputElement.type(value.toString());
  assert.strictEqual(await getInputFieldValue(inputElement), value.toString());
  await tabForward();

  assert.isTrue(await inputElement.evaluate(element => element.classList.contains('error-input')));

  // Clean up so that this function can be called again.
  const resetButton = await waitFor('.orientation-reset-button');
  await resetButton.click();
  await waitForNone('.error-input');
}

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

  it('highlights values outside the allowed ranges', async () => {
    await setCustomOrientation();

    const [alpha, beta, gamma] = await getOrientationInputs();

    // Alpha must be in the range [0, 360).
    await assertValidationFails(alpha, -0.1);
    await assertValidationFails(alpha, 360);

    // Beta must be in the range [-180, 180).
    await assertValidationFails(beta, -180.1);
    await assertValidationFails(beta, 180);

    // Gamma must be in the range [-90, 90).
    await assertValidationFails(gamma, -90.1);
    await assertValidationFails(gamma, 90);
  });
});
