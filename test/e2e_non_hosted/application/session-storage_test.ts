// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  deleteSelectedStorageItem,
  getStorageItemsData,
  navigateToApplicationTab,
  navigateToSessionStorageForTopDomain,
  selectStorageItemAtIndex,
} from '../../e2e/helpers/application-helpers.js';

describe('The Application Tab', () => {
  // TODO (liviurau): Update navigateToApplicationTab helper to work in docked
  // mode and remove the setup below.
  setup({dockingMode: 'undocked'});

  it('shows Session Storage keys and values', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab('session-storage', devToolsPage, inspectedPage);
    await navigateToSessionStorageForTopDomain(devToolsPage, inspectedPage);
    const dataGridRowValues = await getStorageItemsData(['key', 'value'], 2, devToolsPage);
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
    await navigateToApplicationTab('session-storage', devToolsPage, inspectedPage);

    await navigateToSessionStorageForTopDomain(devToolsPage, inspectedPage);

    await selectStorageItemAtIndex(0, devToolsPage);
    await deleteSelectedStorageItem(devToolsPage);

    const dataGridRowValues = await getStorageItemsData(['key', 'value'], 1, devToolsPage);
    assert.deepEqual(dataGridRowValues, [
      {
        key: 'secondKey',
        value: '{"field":"complexValue","primitive":2}',
      },
    ]);
  });
});
