// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {describe} from '../../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged, itScreenshot} from '../../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../helpers/shared.js';

describe('Interactions track', () => {
  preloadForCodeCoverage('performance_panel/track_example.html');

  itScreenshot('renders the interactions track correctly', async () => {
    await loadComponentDocExample(
        // The start and end times come from the timestamps of the first and last
        // interaction in the given trace file, and then subtracting/adding a
        // small amount to make them appear on screen nicely for the screenshot.
        'performance_panel/track_example.html?track=Interactions&fileName=slow-interaction-button-click&windowStart=337944700&windowEnd=337945100');
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/interactions_track.png', 3);
  });
});
