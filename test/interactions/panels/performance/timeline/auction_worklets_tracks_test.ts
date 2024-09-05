// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

describe('Auction Worklet tracks', function() {
  const urlForTest =
      'performance_panel/track_example.html?track=Thread_AuctionWorklet&fileName=fenced-frame-fledge&windowStart=220391498.289&windowEnd=220391697.601';

  itScreenshot('correctly renders all the worklet threads', async () => {
    await loadComponentDocExample(`${urlForTest}&expanded=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/auction_worklets_expanded.png', 3);
  });
});
