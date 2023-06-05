// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {describe} from '../../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged, itScreenshot} from '../../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../helpers/shared.js';

describe('Network track', () => {
  preloadForCodeCoverage('performance_panel/track_example.html');

  itScreenshot('renders the expanded Network track correctly', async () => {
    await loadComponentDocExample(
        'performance_panel/track_example.html?track=Network&fileName=cls-cluster-max-timeout&expanded=true');
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/network_track_expanded.png', 4);
  });

  itScreenshot('renders the collapsed Network track correctly', async () => {
    await loadComponentDocExample(
        'performance_panel/track_example.html?track=Network&fileName=cls-cluster-max-timeout&expanded=false');
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/network_track_collapsed.png', 4);
  });
});
