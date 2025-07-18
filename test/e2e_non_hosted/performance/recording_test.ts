// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'path';

import {GEN_DIR} from '../../conductor/paths.js';
import {
  getTotalTimeFromSummary,
  increaseTimeoutForPerfPanel,
  navigateToPerformanceTab,
  reloadAndRecord,
  startRecording,
  stopRecording,
} from '../../e2e/helpers/performance-helpers.js';

describe('The Performance panel', function() {
  setup({dockingMode: 'undocked'});
  increaseTimeoutForPerfPanel(this);

  it('supports the user manually starting and stopping a recording', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab('empty', devToolsPage, inspectedPage);

    await startRecording(devToolsPage);
    await stopRecording(devToolsPage);
    await devToolsPage.waitForFunction(async () => {
      const totalTime = await getTotalTimeFromSummary(devToolsPage);
      return totalTime > 0;
    });
  });

  it('can reload and record a trace', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab('fake-website', devToolsPage, inspectedPage);
    await reloadAndRecord(devToolsPage);

    await devToolsPage.waitForFunction(async () => {
      const totalTime = await getTotalTimeFromSummary(devToolsPage);
      return totalTime > 0;
    });
  });

  it('can import a stored trace file', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab('empty', devToolsPage, inspectedPage);
    const uploadProfileHandle = await devToolsPage.waitFor('input[type=file]');
    assert.isNotNull(uploadProfileHandle, 'unable to upload the performance profile');
    const testTrace = path.join(GEN_DIR, 'test/e2e/resources/performance/timeline/web.dev-trace.json.gz');
    await uploadProfileHandle.uploadFile(testTrace);
    const canvas = await devToolsPage.waitFor('canvas.flame-chart-canvas');
    // Check that we have rendered the timeline canvas.
    await devToolsPage.waitForFunction(async () => {
      const height = await canvas.evaluate(elem => elem.clientHeight);
      return height > 200;
    });
  });
});
