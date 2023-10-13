// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {describe, itScreenshot} from '../../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../helpers/shared.js';

describe('Auction Worklet tracks', function() {
  // TODO(crbug.com/1492405): Improve perf panel trace load speed to
  // prevent timeout bump.
  this.timeout(20_000);
  preloadForCodeCoverage('performance_panel/track_example.html');

  const urlForTest =
      'performance_panel/track_example.html?track=Other&fileName=fenced-frame-fledge&trackFilter=Worklet&windowStart=220391498.289&windowEnd=220391697.601';

  itScreenshot('correctly renders all the worklet threads', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/auction_worklets_expanded.png', 3);
  });
});
