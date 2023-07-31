// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $$,
  click,
  goToResource,
  step,
  typeText,
  waitFor,
  waitForAria,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  openNetworkTab,
  selectRequestByName,
} from '../helpers/network-helpers.js';
import {
  readQuickOpenResults,
  typeIntoQuickOpen,
} from '../helpers/quick_open-helpers.js';
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
    await click('[aria-label="Overrides"]');
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
    await waitFor('[aria-label="bar, file"]');

    const treeItems = await $$('.navigator-file-tree-item');
    const treeItemNames = await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent)));
    assert.deepEqual(treeItemNames, ['bar', 'foo']);
  });

  it('can save fetch request for overrides via network panel', async () => {
    await step('enable overrides', async () => {
      await goToResource('network/fetch-json.html');
      await openSourcesPanel();
      await enableLocalOverrides();
    });

    await step('can create content overrides via request\'s context menu', async () => {
      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Save for overrides');
      await waitFor('[aria-label="coffees.json, file"]');
    });

    await step('should not show fetch request in the Sources > Page Tree', async () => {
      const pageTree = await waitForAria('Page');
      await pageTree.click();

      const treeItems = await $$('.navigator-file-tree-item');
      const treeItemNames = (await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent))));
      assert.isFalse(treeItemNames?.includes('coffees.json'));
    });

    await step('should show overidden fetch request in Quick Open', async () => {
      await typeIntoQuickOpen('coffees.json');
      const list = await readQuickOpenResults();
      assert.deepEqual(list, ['coffees.json']);
    });
  });

  it('can save XHR request for overrides via network panel', async () => {
    await step('enable overrides', async () => {
      await goToResource('network/xhr-json.html');
      await openSourcesPanel();
      await enableLocalOverrides();
    });

    await step('can create content overrides via request\'s context menu', async () => {
      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Save for overrides');
      await waitFor('[aria-label="coffees.json, file"]');
    });

    await step('should not show xhr request in the Sources > Page Tree', async () => {
      const pageTree = await waitForAria('Page');
      await pageTree.click();

      const treeItems = await $$('.navigator-file-tree-item');
      const treeItemNames = (await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent))));
      assert.isFalse(treeItemNames?.includes('coffees.json'));
    });

    await step('should show overidden xhr request in Quick Open', async () => {
      await typeIntoQuickOpen('coffees.json');
      const list = await readQuickOpenResults();
      assert.deepEqual(list, ['coffees.json']);
    });
  });
});
