// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {waitFor, waitForFunction} from '../../../../shared/helper.js';
import {describe, itScreenshot} from '../../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../helpers/shared.js';

describe('FlameChart', function() {

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

  itScreenshot('can add decorations to events', async () => {
    await loadComponentDocExample('performance_panel/flamechart.html');
    const flameChart = await getFlameChartContainerWhenReady('#container2');
    await assertElementScreenshotUnchanged(flameChart, 'performance/flame_chart_candystripe.png', 0.5);
  });

  itScreenshot('can add initiators to events', async () => {
    await loadComponentDocExample('performance_panel/flamechart.html');
    const flameChart = await getFlameChartContainerWhenReady('#container5');
    await assertElementScreenshotUnchanged(flameChart, 'performance/multiple_initiators.png', 0.5);
  });
});
