// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it, setup} from '../conductor/mocha-interface.js';
import {
  deleteSelectedStorageItem,
  getStorageItemsData,
  navigateToApplicationTab,
  navigateToSessionStorageForTopDomain,
  selectStorageItemAtIndex,
} from '../helpers/application-helpers.js';
import {openCommandMenu} from '../helpers/quick_open-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';
import type {InspectedPage} from '../shared/InspectedPage.js';

async function setupOopifApplicationPage(
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
    ): Promise<string[]> {
  await devToolsPage.bringToFront();
  await openCommandMenu(devToolsPage);
  await devToolsPage.typeText('Application');
  await devToolsPage.pressKey('Enter');
  await devToolsPage.waitFor('#tab-resources');
  await devToolsPage.waitFor('.storage-group-list-item');

  await inspectedPage.bringToFront();
  await inspectedPage.goToResourceWithCustomHost('devtools.test', 'host/page-with-oopif.html');
  await devToolsPage.bringToFront();

  return [
    inspectedPage.domain('devtools.oopif.test'),
    inspectedPage.domain('devtools.test'),
  ].sort();
}

async function getStorageOrigins(
    devToolsPage: DevToolsPage,
    storageName: string,
    expectedOriginCount: number,
    ): Promise<string[]> {
  const storageSelector = `[aria-label="${storageName}"].parent`;
  const storageElement = await devToolsPage.waitFor(storageSelector);
  await storageElement.evaluate(el => el.scrollIntoView(true));
  const isExpanded = await storageElement.evaluate(el => el.getAttribute('aria-expanded') === 'true');
  if (!isExpanded) {
    await devToolsPage.click(storageSelector);
  }
  await devToolsPage.waitFor(`${storageSelector}[aria-expanded="true"]`);
  return await devToolsPage.waitForFunction(async () => {
    const childItems = await devToolsPage.$$(`${storageSelector} + ol > li[role="treeitem"]`);
    if (childItems.length < expectedOriginCount) {
      return undefined;
    }
    const labels = await Promise.all(childItems.map(item => item.evaluate(el => el.getAttribute('aria-label') || '')));
    return labels.sort();
  });
}

describe('The Application Tab', () => {
  // TODO (liviurau): Update navigateToApplicationTab helper to work in docked
  // mode and remove the setup below.
  setup({dockingMode: 'undocked'});

  it('shows Session Storage keys and values', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab(devToolsPage, inspectedPage, 'session-storage');
    await navigateToSessionStorageForTopDomain(devToolsPage, inspectedPage);
    const dataGridRowValues = await devToolsPage.waitForFunction(async () => {
      const values = await getStorageItemsData(devToolsPage, ['key', 'value'], 2);
      if (values.length >= 2 && values.every(item => Boolean(item.key && item.value))) {
        return values;
      }
      return undefined;
    });
    dataGridRowValues.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
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

    const dataGridRowValues =
        await getStorageItemsData(devToolsPage, ['key', 'value'], 1, /* matchExactNumberOfRows= */ true);
    assert.deepEqual(dataGridRowValues, [
      {
        key: 'secondKey',
        value: '{"field":"complexValue","primitive":2}',
      },
    ]);
  });

  it('lists main frame and OOPIF origins under Local storage', async ({devToolsPage, inspectedPage}) => {
    const expectedOrigins = await setupOopifApplicationPage(devToolsPage, inspectedPage);
    assert.deepEqual(await getStorageOrigins(devToolsPage, 'Local storage', expectedOrigins.length), expectedOrigins);
  });

  it('lists main frame and OOPIF origins under Session storage', async ({devToolsPage, inspectedPage}) => {
    const expectedOrigins = await setupOopifApplicationPage(devToolsPage, inspectedPage);
    assert.deepEqual(await getStorageOrigins(devToolsPage, 'Session storage', expectedOrigins.length), expectedOrigins);
  });
});
