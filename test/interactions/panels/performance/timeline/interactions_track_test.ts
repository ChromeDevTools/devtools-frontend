// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

describe('Interactions track', function() {
  const urlForTest =
      'performance_panel/track_example.html?track=Interactions&fileName=slow-interaction-button-click&windowStart=337944700&windowEnd=337945100';

  itScreenshot('renders the interactions track correctly', async () => {
    await loadComponentDocExample(
        // The start and end times come from the timestamps of the first and last
        // interaction in the given trace file, and then subtracting/adding a
        // small amount to make them appear on screen nicely for the screenshot.
        `${urlForTest}`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/interactions_track.png', 3);
  });

  itScreenshot('renders the interactions track collapsed correctly', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=false`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/interactions_track_collapsed.png', 3);
  });

  itScreenshot('candy stripes events over 200ms', async () => {
    await loadComponentDocExample(
        // The start and end times come from the timestamps of the first and last
        // interaction in the given trace file, and then subtracting/adding a
        // small amount to make them appear on screen nicely for the screenshot.
        'performance_panel/track_example.html?track=Interactions&fileName=one-second-interaction&windowStart=141251500&windowEnd=141253000');
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/interactions_track_long_interactions.png', 3);
  });

  itScreenshot('renders the track (dark mode and expanded)', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=true&darkMode=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/interactions_track_expanded_dark_mode.png', 3);
  });

  itScreenshot('renders the track (dark mode and collapsed)', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=false&darkMode=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/interactions_track_collapsed_dark_mode.png', 3);
  });
});
