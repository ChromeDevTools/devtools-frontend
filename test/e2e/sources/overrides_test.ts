// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $$,
  click,
  goToResource,
  typeText,
  waitFor,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  clickOnContextMenu,
  ENABLE_OVERRIDES_SELECTOR,
  enableLocalOverrides,
  openSourcesPanel,
} from '../helpers/sources-helpers.js';

const OVERRIDES_FILESYSTEM_SELECTOR = '[aria-label="overrides, fs"]';

describe('The Overrides Panel', async function() {
  afterEach(async () => {
    await openSourcesPanel();
    await click('[aria-label="Clear configuration"]');
    await waitFor(ENABLE_OVERRIDES_SELECTOR);
  });

  it('can create multiple new files', async () => {
    await goToResource('empty.html');
    await openSourcesPanel();
    await enableLocalOverrides();
    await clickOnContextMenu(OVERRIDES_FILESYSTEM_SELECTOR, 'New file');
    await waitFor('[aria-label="NewFile, file"]');
    await typeText('foo\n');

    await clickOnContextMenu(OVERRIDES_FILESYSTEM_SELECTOR, 'New file');
    await waitFor('[aria-label="NewFile, file"]');
    await typeText('bar\n');

    const treeItems = await $$('.navigator-file-tree-item');
    const treeItemNames = await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent)));
    assert.deepEqual(treeItemNames, ['bar', 'foo']);
  });
});
