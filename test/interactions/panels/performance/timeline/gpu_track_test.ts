// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

describe('GPU track', function() {
  const urlForTest = 'performance_panel/track_example.html?track=GPU&fileName=threejs-gpu';

  itScreenshot('renders the GPU track correctly (expanded)', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/gpu_track_expanded.png', 4);
  });

  itScreenshot('renders the GPU track correctly (collapsed)', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=false`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/gpu_track_collapsed.png', 4);
  });
});
