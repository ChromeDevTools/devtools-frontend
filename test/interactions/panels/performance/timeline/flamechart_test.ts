// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {waitFor, waitForFunction} from '../../../../shared/helper.js';
import {describe, itScreenshot} from '../../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../helpers/shared.js';

describe('FlameChart', function() {
  // TODO(crbug.com/1492405): Improve perf panel trace load speed to
  // prevent timeout bump.
  this.timeout(20_000);
  preloadForCodeCoverage('performance_panel/flamechart.html');

  async function getFlameChartContainerWhenReady(selector: string): Promise<puppeteer.ElementHandle<HTMLDivElement>> {
    // The container element exists immediately, but we want to wait for the
    // flamechart widget to expand and fill the space.
    await waitForFunction(async () => {
      const container = await waitFor<HTMLDivElement>(`${selector} > .vbox`);
      const hasHeight = await container.evaluate(elem => elem.offsetHeight > 150);
      return hasHeight;
    });
    const flameChart = await waitFor<HTMLDivElement>(selector);
    return flameChart;
  }

  itScreenshot('renders some events onto the timeline', async () => {
    await loadComponentDocExample('performance_panel/flamechart.html');
    const flameChart = await getFlameChartContainerWhenReady('#container1');
    await assertElementScreenshotUnchanged(flameChart, 'performance/flame_chart_1.png', 1);
  });

  itScreenshot('can add candy striping to events', async () => {
    await loadComponentDocExample('performance_panel/flamechart.html');
    const flameChart = await getFlameChartContainerWhenReady('#container2');
    await assertElementScreenshotUnchanged(flameChart, 'performance/flame_chart_candystripe.png', 0.5);
  });
});
