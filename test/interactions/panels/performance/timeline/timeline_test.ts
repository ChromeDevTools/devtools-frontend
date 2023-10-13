// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, timeout, waitFor, waitForFunction} from '../../../../shared/helper.js';
import {describe, itScreenshot} from '../../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../helpers/shared.js';

describe('Performance panel', function() {
  preloadForCodeCoverage('performance_panel/basic.html');
  // TODO(crbug.com/1492405): Improve perf panel trace load speed to
  // prevent timeout bump.
  this.timeout(20_000);

  itScreenshot('loads a trace file and renders it in the timeline', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=basic');
    await waitFor('.timeline-flamechart');
    const panel = await waitFor('body');
    await assertElementScreenshotUnchanged(panel, 'performance/timeline.png', 3);
  });

  // Flaky test
  itScreenshot.skip('[crbug.com/1478133] renders correctly the Bottom Up datagrid', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=one-second-interaction');
    await waitFor('.timeline-flamechart');
    await waitFor('div.tabbed-pane');
    await click('#tab-BottomUp');
    const datagrid = await waitFor('.timeline-tree-view');
    await assertElementScreenshotUnchanged(datagrid, 'performance/bottomUp.png', 3);
  });

  // Flaky test
  itScreenshot.skip('[crbug.com/1478133] renders correctly the Call Tree datagrid', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=one-second-interaction');
    await waitFor('.timeline-flamechart');
    await waitFor('div.tabbed-pane');
    await click('#tab-CallTree');
    const datagrid = await waitFor('.timeline-tree-view');
    await assertElementScreenshotUnchanged(datagrid, 'performance/callTree.png', 3);
  });

  // Flaky test
  itScreenshot.skip('[crbug.com/1478133] renders correctly the Event Log datagrid', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=one-second-interaction');
    await waitFor('.timeline-flamechart');
    await waitFor('div.tabbed-pane');
    await click('#tab-EventLog');
    const datagrid = await waitFor('.timeline-tree-view');
    // This value is obtained by waiting for the scroll of the datagrid to be completed
    const TOP_OFFSET = 2938;
    const scrollableDatagrid = await waitFor('.data-container');
    // Wait for the scroll of the datagrid to be done before taking a screenshot
    await waitForFunction(async () => {
      const scrollablePosition = await scrollableDatagrid.evaluate(el => {
        return el.scrollTop;
      });
      return scrollablePosition === TOP_OFFSET;
    });

    await assertElementScreenshotUnchanged(datagrid, 'performance/eventLog.png', 4);
  });

  // Flaky test
  itScreenshot.skip('[crbug.com/1478133] renders correctly the datagrid in the split widget of Bottom Up', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=one-second-interaction');
    await waitFor('.timeline-flamechart');
    await waitFor('div.tabbed-pane');
    await click('#tab-BottomUp');
    const datagrid = await waitFor('.timeline-tree-view');
    await click('[aria-label="Show Heaviest stack"]');
    const rows = await datagrid.$$('.data-grid-data-grid-node');

    // The trace one-second-interaction contains more than 3 rows in the bottom up tree
    // so it is safe to click the third one
    if (rows.length >= 3) {
      await rows[2].click();
    } else {
      throw new Error('There are less than three rows with the class \'data-grid-data-grid-node\'');
    }

    await assertElementScreenshotUnchanged(datagrid, 'performance/splitWidgetBottomUp.png', 3);
  });

  // Flaky test
  itScreenshot.skip('[crbug.com/1478133] renders correctly the datagrid in the split widget of Call Tree', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=one-second-interaction');
    await waitFor('.timeline-flamechart');
    await waitFor('div.tabbed-pane');
    await click('#tab-CallTree');
    const datagrid = await waitFor('.timeline-tree-view');
    await click('[aria-label="Show Heaviest stack"]');
    const rows = await datagrid.$$('.data-grid-data-grid-node');

    // The trace one-second-interaction contains more than 3 rows in the call tree
    // so it is safe to click the third one
    if (rows.length >= 3) {
      await rows[2].click();
    } else {
      throw new Error('There are less than three rows with the class \'data-grid-data-grid-node\'');
    }

    await assertElementScreenshotUnchanged(datagrid, 'performance/splitWidgetCallTree.png', 3);
  });

  itScreenshot('renders the timeline correctly when scrolling', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=one-second-interaction');
    await waitFor('.timeline-flamechart');
    const panel = await waitFor('body');

    const virtualScrollBar = await waitFor('div.chart-viewport-v-scroll.always-show-scrollbar');

    await virtualScrollBar.evaluate(el => {
      el.scrollTop = 200;
    });
    await assertElementScreenshotUnchanged(panel, 'performance/timeline_canvas_scrolldown.png', 3);
  });

  itScreenshot('loads a cpuprofile and renders it in non-node mode', async () => {
    await loadComponentDocExample('performance_panel/basic.html?cpuprofile=node-fibonacci-website');
    await waitFor('.timeline-flamechart');
    const panel = await waitFor('body');
    await assertElementScreenshotUnchanged(panel, 'performance/cpu-profile.png', 3);
  });

  itScreenshot(
      'loads a cpuprofile and renders it in node mode with default track source set to new engine', async () => {
        await loadComponentDocExample(
            'performance_panel/basic.html?cpuprofile=node-fibonacci-website&isNode=true&threadTracksSource=new');
        await waitFor('.timeline-flamechart');
        const panel = await waitFor('body');
        await assertElementScreenshotUnchanged(panel, 'performance/cpu-profile-node-new-engine.png', 3);
      });

  itScreenshot(
      'loads a cpuprofile and renders it in node mode with default track source set to old engine', async () => {
        await loadComponentDocExample(
            'performance_panel/basic.html?cpuprofile=node-fibonacci-website&isNode=true&threadTracksSource=old');
        await waitFor('.timeline-flamechart');
        const panel = await waitFor('body');
        await assertElementScreenshotUnchanged(panel, 'performance/cpu-profile-node-old-engine.png', 3);
      });

  itScreenshot('candy stripes long tasks', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=one-second-interaction');
    await waitFor('.timeline-flamechart');
    const panel = await waitFor('body');
    await assertElementScreenshotUnchanged(panel, 'performance/timeline-long-task-candystripe.png', 2);
  });

  itScreenshot('renders screenshots in the frames track', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=web-dev&flamechart-force-expand=frames');
    await waitFor('.timeline-flamechart');
    const panel = await waitFor('body');
    // With some changes made to timeline-details-view it passes with a diff of 1.98 so reduce it to 1.
    await assertElementScreenshotUnchanged(panel, 'performance/timeline-web-dev-screenshot-frames.png', 1);
  });

  itScreenshot('renders correctly with the OLD_ENGINE ThreadTracksSource', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=web-dev&threadTracksSource=old');
    await waitFor('.timeline-flamechart');
    const panel = await waitFor('body');
    await assertElementScreenshotUnchanged(panel, 'performance/timeline-web-dev-old-engine.png', 1);
  });

  itScreenshot('renders correctly with the NEW_ENGINE ThreadTracksSource', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=web-dev&threadTracksSource=new');
    await waitFor('.timeline-flamechart');
    const panel = await waitFor('body');
    await assertElementScreenshotUnchanged(panel, 'performance/timeline-web-dev-new-engine.png', 1);
  });

  itScreenshot('supports the network track being expanded and then clicked', async function() {
    await loadComponentDocExample('performance_panel/basic.html?trace=web-dev');
    await waitFor('.timeline-flamechart');
    const panel = await waitFor('body');

    const {frontend} = getBrowserAndPages();
    // Click to expand the network track.
    await frontend.mouse.click(27, 131);
    await timeout(100);  // cannot await for DOM as this is a purely canvas change.
    await assertElementScreenshotUnchanged(panel, 'performance/timeline-expand-network-panel.png', 1);
    // Click to select a network event.
    await frontend.mouse.click(104, 144);
    await timeout(100);  // cannot await for DOM as this is a purely canvas change.
    await assertElementScreenshotUnchanged(panel, 'performance/timeline-expand-network-panel-and-select-event.png', 1);
  });
});
