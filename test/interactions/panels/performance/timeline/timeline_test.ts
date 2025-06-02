// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {click, getBrowserAndPages, waitFor, waitForFunction} from '../../../../shared/helper.js';
import {assertElementScreenshotUnchanged} from '../../../../shared/screenshots.js';

import {loadTimelineDocExample} from './helpers.js';

describe('Performance panel', function() {
  if (this.timeout() !== 0) {
    // The Perf Panel is quite heavy to render, especially on CQ bots, so give it a bit more time per test.
    this.timeout(20_000);
  }

  itScreenshot('renders the window range bounds correctly when loading multiple profiles', async () => {
    await loadTimelineDocExample('performance_panel/basic.html?cpuprofile=basic');
    let timingTitleHandle = await waitFor('.summary-range');
    let timingTitle = await timingTitleHandle.evaluate(element => element.innerHTML);
    assert.isTrue(timingTitle.includes('0&nbsp;ms – 2.38&nbsp;s'), `got: ${timingTitle}`);
    const {frontend} = getBrowserAndPages();

    // load another profile and ensure the time range is updated correctly.
    await frontend.evaluate(`(async () => {
      await loadFromFile('node-fibonacci-website.cpuprofile.gz');
    })()`);
    const didUpdate = await waitForFunction(async () => {
      timingTitleHandle = await waitFor('.summary-range');
      timingTitle = await timingTitleHandle.evaluate(element => element.innerHTML);
      return timingTitle.includes('0&nbsp;ms – 2.66&nbsp;s');
    });
    assert(didUpdate);
  });

  itScreenshot('renders the flamechart correctly when toggling the custom data setting', async () => {
    const {frontend} = getBrowserAndPages();
    await loadTimelineDocExample('performance_panel/basic.html?trace=extension-tracks-and-marks');
    // expand the network track to ensure it's unaffected when toggling the custom data setting.
    await frontend.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const panel = (window as any).UI.panels.timeline as Timeline.TimelinePanel.TimelinePanel;
      const mainFlameChart = panel.getFlameChart().getNetworkDataProvider();
      const data = mainFlameChart.timelineData();
      if (!data) {
        throw new Error('Timeline data was not found');
      }
      const networkTrackIndex = data.groups.findIndex(f => f.name === 'Network');
      if (networkTrackIndex === -1) {
        throw new Error('Could not find network track');
      }

      panel.getFlameChart().getNetworkFlameChart().toggleGroupExpand(networkTrackIndex);
    });
    const timeline = await waitFor('.widget.vbox[slot="main"]');
    await assertElementScreenshotUnchanged(timeline, 'performance/timeline-before-extension-toggle.png');
    await click('[aria-label="Capture settings"]');
    await click('input[title="Show data added by extensions of the Performance panel"]');
    await assertElementScreenshotUnchanged(timeline, 'performance/timeline-after-extension-toggle.png');
  });
});
