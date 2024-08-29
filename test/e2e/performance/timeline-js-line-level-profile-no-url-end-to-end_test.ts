// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages} from '../../conductor/puppeteer-state.js';
import {waitForMany} from '../../shared/helper.js';

import {navigateToPerformanceTab, startRecording, stopRecording} from '../helpers/performance-helpers.js';
import {openSourcesPanel} from '../helpers/sources-helpers.js';

describe('The Performance panel', () => {
  it('can collect a line-level CPU profile and show it in the text editor', async () => {
    const {target} = getBrowserAndPages();
    await navigateToPerformanceTab();
    await startRecording();
    await target.evaluate(() => {
      (function() {
        const endTime = Date.now() + 100;
        let s = 0;
        while (Date.now() < endTime) {
          s += Math.cos(s);
        }
        return s;
      })();
    });
    await stopRecording();
    await openSourcesPanel();
    const elements = await waitForMany('.navigator-file-tree-item', 2);
    // The first one will be `data:text/html,<!DOCTYPE html>`
    // And the second file is the code we evaluated before (Line 16), and it's the one we want to open.
    const button = await elements[1].$('.tree-element-title');
    // Add some offsets so we won't click on the edge of the element
    await button?.click({offset: {x: 3, y: 3}});
    await waitForMany('.cm-performanceGutter .cm-gutterElement', 3);
  });
});
