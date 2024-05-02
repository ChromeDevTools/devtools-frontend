// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {describe, itScreenshot} from '../../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../helpers/shared.js';

describe('Animations track', function() {
  if (this.timeout() !== 0) {
    this.timeout(20000);
  }
  preloadForCodeCoverage('performance_panel/track_example.html');

  const urlForTest = 'performance_panel/track_example.html?track=Animations&fileName=animation';

  itScreenshot('renders the expanded animations track correctly', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/animations_track_expanded.png', 3);
  });

  itScreenshot('renders the collapsed animations track correctly', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=false`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/animations_track_collapsed.png', 3);
  });

  itScreenshot('renders the track (dark mode and expanded)', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=true&darkMode=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/animations_track_expanded_dark_mode.png', 3);
  });

  itScreenshot('renders the track (dark mode and collapsed)', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=false&darkMode=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/animations_track_collapsed_dark_mode.png', 3);
  });
});
