// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

import {
  getInputFieldValue,
  getOrientationInputs,
  getOrientationValues,
  setCustomOrientation,
} from './helpers.js';

async function assertValidationFails(
    inputElement: ElementHandle<Element>,
    value: number,
    devtoolsPage: DevToolsPage,
) {
  await inputElement.type(value.toString());
  assert.strictEqual(await getInputFieldValue(inputElement), value.toString());
  await devtoolsPage.tabForward();

  assert.isTrue(await inputElement.evaluate(element => element.classList.contains('error-input')));

  // Clean up so that this function can be called again.
  const resetButton = await devtoolsPage.waitFor('.orientation-reset-button');
  await resetButton.click();
  await devtoolsPage.waitForNone('.error-input');
}

describe('Orientation emulation on Sensors panel', () => {
  it('presets correct default values on Custom orientation selected', async ({devToolsPage}) => {
    await openPanelViaMoreTools('Sensors', devToolsPage);
    await setCustomOrientation(devToolsPage);

    const actualOrientations = await getOrientationValues(devToolsPage);

    const expectedOrientations = [0, 90, 0];

    assert.deepEqual(actualOrientations, expectedOrientations);
  });

  it('highlights values outside the allowed ranges', async ({devToolsPage}) => {
    await openPanelViaMoreTools('Sensors', devToolsPage);
    await setCustomOrientation(devToolsPage);

    const [alpha, beta, gamma] = await getOrientationInputs(devToolsPage);

    // Alpha must be in the range [0, 360).
    await assertValidationFails(alpha, -0.1, devToolsPage);
    await assertValidationFails(alpha, 360, devToolsPage);

    // Beta must be in the range [-180, 180).
    await assertValidationFails(beta, -180.1, devToolsPage);
    await assertValidationFails(beta, 180, devToolsPage);

    // Gamma must be in the range [-90, 90).
    await assertValidationFails(gamma, -90.1, devToolsPage);
    await assertValidationFails(gamma, 90, devToolsPage);
  });
});
