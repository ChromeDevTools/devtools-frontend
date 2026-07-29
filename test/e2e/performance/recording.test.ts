// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  getTotalTimeFromSummary,
  increaseTimeoutForPerfPanel,
  navigateToPerformanceTab,
  reloadAndRecord,
  startRecording,
  stopRecording,
  uploadTraceFile,
} from '../helpers/performance-helpers.js';

describe('The Performance panel', function() {
  setup({dockingMode: 'undocked'});
  increaseTimeoutForPerfPanel(this);

  it('supports the user manually starting and stopping a recording', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab(devToolsPage, inspectedPage, 'empty');

    await startRecording(devToolsPage);
    await stopRecording(devToolsPage);
    await devToolsPage.waitForFunction(async () => {
      const totalTime = await getTotalTimeFromSummary(devToolsPage);
      return totalTime > 0;
    });
  });

  it('can reload and record a trace', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab(devToolsPage, inspectedPage, 'fake-website');
    await reloadAndRecord(devToolsPage);

    await devToolsPage.waitForFunction(async () => {
      const totalTime = await getTotalTimeFromSummary(devToolsPage);
      return totalTime > 0;
    });
  });

  it('can import a stored trace file', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab(devToolsPage, inspectedPage, 'empty');
    await uploadTraceFile(devToolsPage, 'test/e2e/resources/performance/timeline/web.dev-trace.json.gz');
    const canvas = await devToolsPage.waitFor('canvas.flame-chart-canvas');
    // Check that we have rendered the timeline canvas.
    await devToolsPage.waitForFunction(async () => {
      const height = await canvas.evaluate(elem => elem.clientHeight);
      return height > 200;
    });
  });
});
