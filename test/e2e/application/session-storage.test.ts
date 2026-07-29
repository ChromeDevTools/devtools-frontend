// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  deleteSelectedStorageItem,
  getStorageItemsData,
  navigateToApplicationTab,
  navigateToSessionStorageForTopDomain,
  selectStorageItemAtIndex,
} from '../helpers/application-helpers.js';

describe('The Application Tab', () => {
  // TODO (liviurau): Update navigateToApplicationTab helper to work in docked
  // mode and remove the setup below.
  setup({dockingMode: 'undocked'});

  it('shows Session Storage keys and values', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab(devToolsPage, inspectedPage, 'session-storage');
    await navigateToSessionStorageForTopDomain(devToolsPage, inspectedPage);
    const dataGridRowValues = await getStorageItemsData(devToolsPage, ['key', 'value'], 2);
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

  it('can delete selected items', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab(devToolsPage, inspectedPage, 'session-storage');

    await navigateToSessionStorageForTopDomain(devToolsPage, inspectedPage);

    await selectStorageItemAtIndex(devToolsPage, 0);
    await deleteSelectedStorageItem(devToolsPage);

    const dataGridRowValues = await getStorageItemsData(devToolsPage, ['key', 'value'], 1);
    assert.deepEqual(dataGridRowValues, [
      {
        key: 'secondKey',
        value: '{"field":"complexValue","primitive":2}',
      },
    ]);
  });
});
