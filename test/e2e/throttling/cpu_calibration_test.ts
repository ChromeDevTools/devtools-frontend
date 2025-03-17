// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  click,
  getAllTextContents,
  waitForElementWithTextContent,
} from '../../shared/helper.js';
import {openSettingsTab} from '../helpers/settings-helpers.js';

describe('CPU Calibration', () => {
  it('works', async () => {
    await openSettingsTab('Throttling');

    assert.deepEqual(await getAllTextContents('.cpu-preset-result'), ['Needs calibration', 'Needs calibration']);

    await waitForElementWithTextContent(
        'To use the CPU throttling presets, run the calibration process to determine the ideal throttling rate for your device.');
    await click('.calibrate-button');
    await waitForElementWithTextContent(
        'Calibration will take ~5 seconds, and temporarily navigate away from your current page. Do you wish to continue?');
    await click('.calibrate-button');
    await waitForElementWithTextContent('Recalibrate');

    // Verify that at least the low-tier device was able to be calibrated (CI may be to slow for mid-tier calibration).
    const results = await getAllTextContents('.cpu-preset-result');
    assert.include(results[0], 'slowdown');
    assert.match(results[1] ?? '', /slowdown|not powerful enough/);
  });
});
