// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

describe('Layout shifts track', function() {
  const urlForTest = 'performance_panel/track_example.html?track=LayoutShifts&fileName=cls-single-frame';

  itScreenshot('renders the layout shifts track correctly', async () => {
    await loadComponentDocExample(`${urlForTest}`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/layout_shifts_track.png', 2);
  });

  itScreenshot('renders the track (dark mode)', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=true&darkMode=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/layout_shifts_track_dark_mode.png', 2);
  });
});
