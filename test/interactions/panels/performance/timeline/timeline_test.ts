// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, timeout, waitFor, waitForFunction} from '../../../../shared/helper.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

describe('Performance panel', function() {
  if (this.timeout() !== 0) {
    // The Perf Panel is quite heavy to render, especially on CQ bots, so give it a bit more time per test.
    this.timeout(20_000);
  }

  itScreenshot('loads a trace file and renders it in the timeline', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=basic');
    await waitFor('.timeline-flamechart');
    const panel = await waitFor('body');
    await assertElementScreenshotUnchanged(panel, 'performance/timeline.png', 3);
  });

  itScreenshot('renders correctly the Bottom Up datagrid', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=one-second-interaction');
    await waitFor('.timeline-flamechart');
    await waitFor('div.tabbed-pane');
    await click('#tab-bottom-up');
    const datagrid = await waitFor('.timeline-tree-view');
    await waitForFunction(async () => {
      const datagrid = await waitFor('.timeline-tree-view');
      const height = await datagrid.evaluate(elem => elem.clientHeight);
      return height > 150;
    });
    await assertElementScreenshotUnchanged(datagrid, 'performance/bottomUp.png', 3);
  });

  itScreenshot('renders correctly the Call Tree datagrid', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=one-second-interaction');
    await waitFor('.timeline-flamechart');
    await waitFor('div.tabbed-pane');
    await click('#tab-call-tree');
    const datagrid = await waitFor('.timeline-tree-view');
    await waitForFunction(async () => {
      const datagrid = await waitFor('.timeline-tree-view');
      const height = await datagrid.evaluate(elem => elem.clientHeight);
      return height > 150;
    });
    await assertElementScreenshotUnchanged(datagrid, 'performance/callTree.png', 3);
  });

  // Flaky on linux
  itScreenshot.skipOnPlatforms(
      ['linux'], '[crbug.com/327586819]: renders the timeline correctly when scrolling', async () => {
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
        await loadComponentDocExample('performance_panel/basic.html?cpuprofile=node-fibonacci-website&isNode=true');
        await waitFor('.timeline-flamechart');
        const panel = await waitFor('body');
        await assertElementScreenshotUnchanged(panel, 'performance/cpu-profile-node-new-engine.png', 3);
      });

  itScreenshot(
      'loads a cpuprofile and renders it in node mode with default track source set to old engine', async () => {
        await loadComponentDocExample('performance_panel/basic.html?cpuprofile=node-fibonacci-website&isNode=true');
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
    await loadComponentDocExample(
        'performance_panel/basic.html?trace=web-dev-with-commit&flamechart-force-expand=frames');
    const panel = await waitFor('body');
    await waitForFunction(async () => {
      const mainFlameChart = await waitFor('.timeline-flamechart');
      const height = await mainFlameChart.evaluate(elem => elem.clientHeight);
      return height > 500;
    });
    // With some changes made to timeline-details-view it passes with a diff of 1.98 so reduce it to 1.
    await assertElementScreenshotUnchanged(panel, 'performance/timeline-web-dev-screenshot-frames.png', 1);
  });

  // Flaking.
  itScreenshot.skip(
      '[crbug.com/373792008]: supports the network track being expanded and then clicked', async function() {
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
        await assertElementScreenshotUnchanged(
            panel, 'performance/timeline-expand-network-panel-and-select-event.png', 1);
      });

  it('renders the window range bounds correctly when loading multiple profiles', async () => {
    await loadComponentDocExample('performance_panel/basic.html?cpuprofile=basic');
    let timingTitleHandle = await waitFor('.timeline-details-chip-title');
    let timingTitle = await timingTitleHandle.evaluate(element => element.innerHTML);
    assert.isTrue(timingTitle.includes('0&nbsp;ms – 2.38&nbsp;s'), `got: ${timingTitle}`);
    const {frontend} = getBrowserAndPages();

    // load another profile and ensure the time range is updated correctly.
    await frontend.evaluate(`(async () => {
      await loadFromFile('node-fibonacci-website.cpuprofile.gz');
    })()`);
    const didUpdate = await waitForFunction(async () => {
      timingTitleHandle = await waitFor('.timeline-details-chip-title');
      timingTitle = await timingTitleHandle.evaluate(element => element.innerHTML);
      return timingTitle.includes('0&nbsp;ms – 2.66&nbsp;s');
    });
    assert(didUpdate);
  });
});
