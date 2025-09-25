// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  navigateToConsoleTab,
  waitForLastConsoleMessageToHaveContent,
} from '../../e2e/helpers/console-helpers.js';
import {
  executionLineHighlighted,
  getOpenSources,
  openSourcesPanel,
  PAUSE_BUTTON,
  PAUSE_INDICATOR_SELECTOR,
} from '../../e2e/helpers/sources-helpers.js';
import {
  step,
} from '../../shared/helper.js';

describe('Sources Tab', () => {
  it('pauses the script when clicking the "Pause" button', async ({devToolsPage, inspectedPage}) => {
    await step('navigate to page', async () => {
      await inspectedPage.goToResource('sources/infinity-loop.html');
    });

    await step('kick off the infinity loop', async () => {
      await inspectedPage.evaluate('setTimeout(loop, 0)');
    });

    await step('wait for the marker console message to show up', async () => {
      await navigateToConsoleTab(devToolsPage);
      await waitForLastConsoleMessageToHaveContent('Console marker the test can wait for', devToolsPage);
    });

    await step('click the pause button', async () => {
      await openSourcesPanel(devToolsPage);
      await devToolsPage.click(PAUSE_BUTTON);
    });

    await step('wait for the pause in the loop function', async () => {
      await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
      await executionLineHighlighted(devToolsPage);

      await devToolsPage.waitForFunction(async () => {
        const sources = await getOpenSources(devToolsPage);
        return sources.length === 1 && sources[0] === 'infinity-loop.html';
      });
    });
  });
});
