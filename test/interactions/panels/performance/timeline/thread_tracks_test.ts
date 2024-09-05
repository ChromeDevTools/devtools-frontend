// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../../../shared/helper.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

describe('Perf Panel Main Thread', function() {
  itScreenshot('renders some events onto the timeline', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=one-second-interaction');
    await waitFor('.timeline-flamechart');
    const panel = await waitFor('body');
    await assertElementScreenshotUnchanged(panel, 'performance/main-thread-long-task-candy-stripe.png', 3);
  });
});

describe('Main thread by new engine', () => {
  itScreenshot('correctly renders the main thread', async () => {
    const urlForTest =
        'performance_panel/track_example.html?track=Thread&fileName=react-hello-world&trackFilter=Main&windowStart=410167020.225&windowEnd=410167037.286';
    await loadComponentDocExample(`${urlForTest}&expanded=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/main-thread-track.png');
  });
  itScreenshot('correctly renders the main thread with candy stripes on long tasks', async () => {
    const urlForTest =
        'performance_panel/track_example.html?track=Thread&fileName=one-second-interaction&trackFilter=Main';
    await loadComponentDocExample(`${urlForTest}&expanded=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/main-thread-track-candy-stripe.png');
  });
  itScreenshot('correctly renders the main thread for sub frames', async () => {
    const urlForTest =
        'performance_panel/track_example.html?track=Thread&fileName=multiple-navigations-with-iframes&trackFilter=Frame&windowStart=643494141.125&windowEnd=643497093.297';
    await loadComponentDocExample(`${urlForTest}&expanded=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/iframe-main-thread-long-task-candy-stripe.png');
  });
});

describe('Rasterizer', function() {
  itScreenshot('correctly renders the Raster track', async () => {
    const urlForTest =
        'performance_panel/track_example.html?track=Thread&fileName=web-dev&trackFilter=Raster&windowStart=1020034891.352&windowEnd=1020035181.509';
    await loadComponentDocExample(`${urlForTest}&expanded=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/rasterizer-track.png');
  });
});

describe('Workers', function() {
  // TODO(crbug.com/1472155): Improve perf panel trace load speed to
  // prevent timeout bump.
  if (this.timeout() !== 0) {
    this.timeout(20_000);
  }
  itScreenshot('correctly renders the Worker track', async () => {
    const urlForTest =
        'performance_panel/track_example.html?track=Thread&fileName=two-workers&trackFilter=Worker&windowStart=107351290.697&windowEnd=107351401.004';
    await loadComponentDocExample(`${urlForTest}&expanded=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/worker-track.png', undefined, {
      captureBeyondViewport: true,
    });
  });
});

describe('ThreadPool', () => {
  itScreenshot('correctly renders the threadpool track', async () => {
    const urlForTest =
        'performance_panel/track_example.html?track=Thread&fileName=web-dev&trackFilter=Thread&windowStart=1020034891.352&windowEnd=1020035181.509';
    await loadComponentDocExample(`${urlForTest}&expanded=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/threadpool-track.png');
  });
});

describe('Other', () => {
  itScreenshot('correctly renders tracks for generic threads with no specific type', async () => {
    const urlForTest =
        'performance_panel/track_example.html?track=Thread&fileName=web-dev&trackFilter=IOThread&windowStart=1020035010.258&windowEnd=1020035076.320';
    await loadComponentDocExample(`${urlForTest}&expanded=true`);
    const flameChart = await waitFor('.flame-chart-main-pane');
    await assertElementScreenshotUnchanged(flameChart, 'performance/other-thread.png');
  });
});
