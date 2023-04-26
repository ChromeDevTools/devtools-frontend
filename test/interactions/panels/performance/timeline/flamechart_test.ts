// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor, waitForFunction} from '../../../../shared/helper.js';
import {describe} from '../../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged, itScreenshot} from '../../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../helpers/shared.js';

describe('FlameChart', () => {
  preloadForCodeCoverage('performance_panel/flamechart.html');
  itScreenshot('renders some events onto the timeline', async () => {
    await loadComponentDocExample('performance_panel/flamechart.html');
    await waitForFunction(async () => {
      const container = await waitFor<HTMLDivElement>('#container1');
      const hasHeight = await container.evaluate(elem => elem.offsetHeight > 300);
      return hasHeight;
    });
    const flameChart = await waitFor('#container1');
    await assertElementScreenshotUnchanged(flameChart, 'performance/flame_chart_1.png', 3);
  });
});
