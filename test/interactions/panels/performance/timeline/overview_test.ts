// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {waitFor, waitForMany} from '../../../../shared/helper.js';
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

  it('renders markers in the minimap correctly', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=web-dev');
    const minimapMarkers = await waitForMany('.resources-event-divider', 4);
    const promises = minimapMarkers.map(handle => {
      return handle.evaluate(marker => {
        const markerElement = marker as HTMLElement;
        return markerElement.style.left;
      });
    });
    const offsets = await Promise.all(promises);
    offsets.forEach(offset => {
      assert.isTrue(Boolean(offset));
    });
  });
});
