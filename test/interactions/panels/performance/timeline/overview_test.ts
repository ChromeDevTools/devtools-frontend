// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {waitFor} from '../../../../shared/helper.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

describe('Performance panel overview/minimap', function() {
  itScreenshot('renders the overview', async () => {
    await loadComponentDocExample('performance_panel/overview.html?trace=web-dev');
    const pane = await waitFor('.container #timeline-overview-pane');
    await assertElementScreenshotUnchanged(pane, 'performance/timeline-overview.png', 3);
  });

  itScreenshot('shows a red bar for a long task', async () => {
    await loadComponentDocExample('performance_panel/overview.html?trace=one-second-interaction');
    const pane = await waitFor('.container #timeline-overview-pane');
    await assertElementScreenshotUnchanged(pane, 'performance/timeline-overview-long-task-red-bar.png', 3);
  });

  itScreenshot('[shows network requests in the overview', async () => {
    await loadComponentDocExample('performance_panel/overview.html?trace=many-requests');
    const pane = await waitFor('.container #timeline-overview-pane');
    await assertElementScreenshotUnchanged(pane, 'performance/timeline-overview-busy-network.png', 3);
  });

  itScreenshot('shows the resizers in the overview', async () => {
    await loadComponentDocExample(
        'performance_panel/overview.html?trace=one-second-interaction&windowStart=141251500&windowEnd=141253500');
    const pane = await waitFor('.container #timeline-overview-pane');
    await assertElementScreenshotUnchanged(pane, 'performance/timeline-overview-resizers.png', 3);
  });

  itScreenshot('shows the memory usage', async () => {
    await loadComponentDocExample('performance_panel/overview.html?trace=web-dev');
    const pane = await waitFor('.container-with-memory #timeline-overview-pane');
    await assertElementScreenshotUnchanged(pane, 'performance/timeline-overview-memory.png', 3);
  });

  it('renders markers in the minimap correctly (just nav)', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=web-dev');
    const handle = await waitFor('.resources-event-divider');
    const promise = handle.evaluate(marker => {
      const markerElement = marker as HTMLElement;
      return [markerElement.title, markerElement.style.left];
    });
    const marker = await promise;
    assert.strictEqual(marker[0], 'navigationStart at 12\xA0ms');
    assert.isTrue(Boolean(marker[1]));
  });
});
