// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  click,
  getBrowserAndPages,
  goToResource,
  step,
  waitFor,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  navigateToConsoleTab,
  waitForLastConsoleMessageToHaveContent,
} from '../helpers/console-helpers.js';
import {
  executionLineHighlighted,
  getOpenSources,
  openSourcesPanel,
  PAUSE_BUTTON,
  PAUSE_INDICATOR_SELECTOR,
} from '../helpers/sources-helpers.js';

describe('Sources Tab', () => {
  it('pauses the script when clicking the "Pause" button', async () => {
    const {target} = getBrowserAndPages();
    await step('navigate to page', async () => {
      await goToResource('sources/infinity-loop.html');
    });

    await step('kick off the infinity loop', async () => {
      await target.evaluate('setTimeout(loop, 0)');
    });

    await step('wait for the marker console message to show up', async () => {
      await navigateToConsoleTab();
      await waitForLastConsoleMessageToHaveContent('Console marker the test can wait for');
    });

    await step('click the pause button', async () => {
      await openSourcesPanel();
      await click(PAUSE_BUTTON);
    });

    await step('wait for the pause in the loop function', async () => {
      await waitFor(PAUSE_INDICATOR_SELECTOR);
      await executionLineHighlighted();

      assert.deepStrictEqual(await getOpenSources(), ['infinity-loop.html']);
    });
  });
});
