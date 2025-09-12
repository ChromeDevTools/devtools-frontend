// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  increaseTimeoutForPerfPanel,
  navigateToPerformanceTab,
  startRecording,
  stopRecording
} from '../../e2e/helpers/performance-helpers.js';
import {openSourcesPanel} from '../../e2e/helpers/sources-helpers.js';

describe('The Performance panel', function() {
  setup({dockingMode: 'undocked'});
  increaseTimeoutForPerfPanel(this);

  it('can collect a line-level CPU profile and show it in the text editor', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab(undefined, devToolsPage, inspectedPage);
    await inspectedPage.goToResource('../resources/ai_assistance/index.html');
    await startRecording(devToolsPage);
    await inspectedPage.evaluate(() => {
      (function() {
        const endTime = Date.now() + 100;
        let s = 0;
        while (Date.now() < endTime) {
          s += Math.cos(s);
        }
        return s;
      })();
    });
    await stopRecording(devToolsPage);
    await openSourcesPanel(devToolsPage);

    const elements = await devToolsPage.waitForMany('.navigator-file-tree-item', 2);
    // The first one will be `data:text/html,<!DOCTYPE html>`
    // And the second file is the code we evaluated before (Line 16), and it's the one we want to open.
    const button = await elements[1].$('.tree-element-title');
    // Add some offsets so we won't click on the edge of the element
    await button?.click({offset: {x: 3, y: 3}});
    await devToolsPage.waitForMany('.cm-performanceGutter .cm-gutterElement', 3);
  });
});
