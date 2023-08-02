// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, getTestServerPort, step} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  deleteSelectedStorageItem,
  doubleClickSourceTreeItem,
  getStorageItemsData,
  navigateToApplicationTab,
  selectStorageItemAtIndex,
} from '../helpers/application-helpers.js';

const SESSION_STORAGE_SELECTOR = '[aria-label="Session storage"].parent';
let DOMAIN_SELECTOR: string;

describe('The Application Tab', async () => {
  before(async () => {
    DOMAIN_SELECTOR = `${SESSION_STORAGE_SELECTOR} + ol > [aria-label="https://localhost:${getTestServerPort()}"]`;
  });

  it('shows Session Storage keys and values', async () => {
    const {target} = getBrowserAndPages();

    await step('navigate to session-storage resource and open Application tab', async () => {
      await navigateToApplicationTab(target, 'session-storage');
    });

    await step('open the domain storage', async () => {
      await doubleClickSourceTreeItem(SESSION_STORAGE_SELECTOR);
      await doubleClickSourceTreeItem(DOMAIN_SELECTOR);
    });

    await step('check that storage data values are correct', async () => {
      const dataGridRowValues = await getStorageItemsData(['key', 'value'], 2);
      assert.deepEqual(dataGridRowValues, [
        {
          key: 'firstKey',
          value: 'firstValue',
        },
        {
          key: 'secondKey',
          value: '{"field":"complexValue","primitive":2}',
        },
      ]);
    });
  });

  it('can delete selected items', async () => {
    const {target} = getBrowserAndPages();

    await navigateToApplicationTab(target, 'session-storage');

    await doubleClickSourceTreeItem(SESSION_STORAGE_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    await selectStorageItemAtIndex(0);
    await deleteSelectedStorageItem();

    const dataGridRowValues = await getStorageItemsData(['key', 'value'], 1);
    assert.deepEqual(dataGridRowValues, [
      {
        key: 'secondKey',
        value: '{"field":"complexValue","primitive":2}',
      },
    ]);
  });
});
