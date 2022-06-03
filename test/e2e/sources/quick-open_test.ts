// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $$,
  click,
  goToResource,
  waitFor,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  openSourcesPanel,
} from '../helpers/sources-helpers.js';

describe('Source Panel Quick Open', async () => {
  const targetPage = 'sources/multi-workers-sourcemap.html';

  async function typeIntoQuickOpen(query: string, expectEmptyResults?: boolean) {
    await click('[aria-label="More options"]');
    await click('[aria-label^="Open file, Ctrl"]');
    const prompt = await waitFor('[aria-label="Quick open prompt"]');
    await prompt.type(query);
    if (expectEmptyResults) {
      await waitFor('.filtered-list-widget :not(.hidden).not-found-text');
    } else {
      // Because each highlighted character is in its own div, we can count the highlighted
      // characters in one item to see that the list reflects the full query.
      const highlightSelector = new Array(query.length).fill('.highlight').join(' ~ ');
      await waitFor('.filtered-list-widget-title ' + highlightSelector);
    }
  }

  async function readQuickOpenResults(): Promise<string[]> {
    const items = await $$('.filtered-list-widget-title');
    return await Promise.all(items.map(element => element.evaluate(el => el.textContent as string)));
  }

  it('sorts authored above deployed', async () => {
    await goToResource(targetPage);
    await openSourcesPanel();

    await typeIntoQuickOpen('mult');
    const list = await readQuickOpenResults();
    assert.deepEqual(list, ['multi-workers.js', 'multi-workers.min.js', 'multi-workers-sourcemap.html']);
  });
});
