// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, step} from '../../shared/helper.js';

import {
  deleteSelectedStorageItem,
  getStorageItemsData,
  navigateToApplicationTab,
  navigateToSessionStorageForTopDomain,
  selectStorageItemAtIndex,
} from '../helpers/application-helpers.js';

describe('The Application Tab', () => {
  it('shows Session Storage keys and values', async () => {
    const {target} = getBrowserAndPages();

    await step('navigate to session-storage resource and open Application tab', async () => {
      await navigateToApplicationTab(target, 'session-storage');
    });

    await step('open the domain storage', async () => {
      await navigateToSessionStorageForTopDomain();
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

    await navigateToSessionStorageForTopDomain();

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
