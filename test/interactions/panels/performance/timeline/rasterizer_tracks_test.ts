// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

describe('Rasterizer tracks', function() {
  // TODO(crbug.com/1472155): Improve perf panel trace load speed to
  // prevent timeout bump.
  if (this.timeout() !== 0) {
    this.timeout(20_000);
  }
  // Times here are so that we zoom into the panel a bit rather than have a screenshot with loads of whitespace.
  const urlForTest =
      'performance_panel/track_example.html?track=Thread&trackFilter=Raster&fileName=web-dev&windowStart=1020034883.047&windowEnd=1020035150.961';

  itScreenshot('renders all the tracks correctly expanded', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/rasterizer_tracks_expanded.png', 4);
  });

  itScreenshot('renders all the tracks correctly in collapsed mode', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=false`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/rasterizer_tracks_collapsed.png', 4);
  });
});
