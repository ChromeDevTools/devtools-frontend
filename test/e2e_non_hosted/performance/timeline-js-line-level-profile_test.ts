// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  increaseTimeoutForPerfPanel,
  navigateToPerformanceTab,
  startRecording,
  stopRecording
} from '../helpers/performance-helpers.js';
import {openFileWithQuickOpen} from '../helpers/quick_open-helpers.js';
import {openSourcesPanel} from '../helpers/sources-helpers.js';

// This flakes on Mac bots but fine on Win/Linux and locally on Mac.
// eslint-disable-next-line @devtools/check-test-definitions
describe.skip('The Performance panel', function() {
  setup({
    dockingMode: 'undocked',
    devToolsSettings: {'auto-pretty-print-minified': true},
  });
  increaseTimeoutForPerfPanel(this);

  it('can collect a line-level CPU profile without a url and show it in Sources',
     async ({devToolsPage, inspectedPage}) => {
       await navigateToPerformanceTab(undefined, devToolsPage, inspectedPage);
       await inspectedPage.goToResource('../resources/ai_assistance/index.html');
       await startRecording(devToolsPage);

       await inspectedPage.evaluate(() => {
         const s = document.createElement('script');
         s.src = '../performance/work.js';
         document.head.append(s);
       });

       await stopRecording(devToolsPage);
       await devToolsPage.timeout(100);  // decoration adding is async.
       await openSourcesPanel(devToolsPage);

       await devToolsPage.waitForMany('.navigator-file-tree-item', 2);

       // Quickopen is far more reliable then clicking through the navigator tree. It doesn't play well with evaluated pptr: scripts so we made a proper work.js fixture
       await openFileWithQuickOpen('work.js', 0, devToolsPage);
       // There should be 4+ decorations
       const gutterEls = await devToolsPage.waitForMany('.cm-performanceGutter .cm-gutterElement', 1);
       const gutterTexts = await Promise.all(gutterEls.map(e => e.evaluate(el => el.textContent)));
       assert.include(gutterTexts[0], 'ms');
     });

  it('can collect a column-level CPU profile and show it in Sources', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab(undefined, devToolsPage, inspectedPage);
    await inspectedPage.goToResource('../resources/ai_assistance/index.html');
    await startRecording(devToolsPage);
    // This script looks bizarre, but we need it to hit the TextUtils.isMinified heuristic of average chars/line > 80.
    await inspectedPage.evaluate(() => {
      const s = document.createElement('script');
      s.src = '../performance/minified-work.js';
      document.head.append(s);
    });
    await stopRecording(devToolsPage);
    await devToolsPage.timeout(100);  // decoration adding is async.
    await openSourcesPanel(devToolsPage);

    await devToolsPage.waitForMany('.navigator-file-tree-item', 2);
    // Quicker to use quickopen than click through navigator tree.
    await openFileWithQuickOpen('minified-work.js', 0, devToolsPage);
    const lineNumberText = await (await devToolsPage.waitFor('div.cm-lineNumbers')).evaluate(e => e.innerText);
    // It was pretty-printed.
    assert.strictEqual(lineNumberText, `1
2
-
-
-
-
-
-
-
3`);
    // There should be at least 3 items with gutter decorations (as there are a few semicolons in the costly minified line)
    const gutter = await devToolsPage.waitFor('div.cm-performanceGutter');
    const gutterText = await gutter.evaluate(e => e.innerText);
    const decorations = gutterText?.split('\n').filter(line => line.trim() !== '');
    assert.isAtLeast(decorations ? decorations.length : 0, 3);
    const els = await devToolsPage.waitForMany('.cm-performanceGutter .cm-gutterElement', 3);
    const gutterTexts = await Promise.all(els.map(e => e.evaluate(el => el.textContent)));
    assert.include(gutterTexts[0], 'ms');
  });
});
