// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $$,
  click,
  clickMoreTabsButton,
  goToResource,
  typeText,
} from '../../shared/helper.js';

import {openSoftContextMenuAndClickOnItem} from '../helpers/context-menu-helpers.js';
import {openSourcesPanel} from '../helpers/sources-helpers.js';

const SNIPPETS_TAB_SELECTOR = '[aria-label="Snippets"]';

describe('Snippets', function() {
  it('with special characters in their name can be deleted', async () => {
    await goToResource('empty.html');
    await openSourcesPanel();
    await clickMoreTabsButton();
    await click(SNIPPETS_TAB_SELECTOR);

    await click('[aria-label="New snippet"]');
    await typeText('file@name\n');

    let treeItems = await $$('.navigator-file-tree-item');
    const treeItemNames = await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent)));
    assert.deepEqual(treeItemNames, ['file@name']);

    await openSoftContextMenuAndClickOnItem('[aria-label="file@name, file"]', 'Remove');

    treeItems = await $$('.navigator-file-tree-item');
    assert.strictEqual(treeItems.length, 0);
  });
});
