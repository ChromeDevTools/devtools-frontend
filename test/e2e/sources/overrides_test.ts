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
      await click('aria/Override content');
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
      await click('aria/Override content');
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

  it('can always override content via the Network panel', async () => {
    await step('can override without local overrides folder set up', async () => {
      await goToResource('network/fetch-json.html');
      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Override content');

      // File permission pop up
      const infoBar = await waitForAria('Select a folder to store override files in.');
      await click('.infobar-main-row .infobar-button', {root: infoBar});

      // Open & clsoe the file in the Sources panel
      const fileTab = await waitFor('[aria-label="coffees.json, file"]');
      assert.isNotNull(fileTab);

      await click('aria/Close coffees.json');
    });

    await step('can open the overridden file in the Sources panel if it exists', async () => {
      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Override content');

      // No file permission pop up
      const popups = await $$('aria/Select a folder to store override files in.', undefined, 'aria');
      assert.strictEqual(popups.length, 0);

      // Open & close the file in the Sources panel
      const fileTab = await waitFor('[aria-label="coffees.json, file"]');
      assert.isNotNull(fileTab);

      await click('aria/Close coffees.json');
    });

    await step('can enable the local overrides setting and override content', async () => {
      // Disable Local overrides
      await click('aria/Enable Local Overrides');

      // Navigate to files
      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Override content');

      // No file permission pop up
      const popups = await $$('aria/Select a folder to store override files in.', undefined, 'aria');
      assert.strictEqual(popups.length, 0);

      // Open & close the file in the Sources panel
      const fileTab = await waitFor('[aria-label="coffees.json, file"]');
      assert.isNotNull(fileTab);

      await click('aria/Close coffees.json');
    });
  });
});
