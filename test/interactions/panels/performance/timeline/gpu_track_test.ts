// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {describe} from '../../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged, itScreenshot} from '../../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../helpers/shared.js';

describe('GPU track', () => {
  preloadForCodeCoverage('performance_panel/track_example.html');

  itScreenshot('renders the expanded GPU track correctly', async () => {
    await loadComponentDocExample('performance_panel/track_example.html?track=GPU&fileName=threejs-gpu&expanded=true');
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/gpu_track_expanded.png', 3);
  });

  itScreenshot('renders the collapsed GPU track correctly', async () => {
    await loadComponentDocExample('performance_panel/track_example.html?track=GPU&fileName=threejs-gpu&expanded=false');
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/gpu_track_collapsed.png', 3);
  });
});
