// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it, setup} from '../conductor/mocha-interface.js';
import {getDataGridData, navigateToApplicationTab} from '../helpers/application-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';
import type {InspectedPage} from '../shared/InspectedPage.js';

async function navigateToLocalStorageForTopDomain(
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
    ): Promise<void> {
  const localStorageSelector = '[aria-label="Local storage"].parent';
  const domainSelector = `${localStorageSelector} + ol > [aria-label="${inspectedPage.domain()}"]`;
  const element = await devToolsPage.waitFor(localStorageSelector);
  await element.evaluate(el => el.scrollIntoView(true));
  await devToolsPage.click(localStorageSelector);
  await devToolsPage.waitFor(`${domainSelector}.selected`);
}

async function waitForLocalStorageRows(
    devToolsPage: DevToolsPage,
    expectedRows: Array<{key: string, value: string}>,
    ): Promise<void> {
  const actualRows = await devToolsPage.waitForFunction(async () => {
    const rows = await getDataGridData(devToolsPage, '.data-grid table', ['key', 'value']);
    const sorted =
        rows.map(row => ({key: row.key ?? '', value: row.value ?? ''})).sort((a, b) => a.key.localeCompare(b.key));
    if (sorted.length !== expectedRows.length) {
      return undefined;
    }
    const matches =
        sorted.every((row, index) => row.key === expectedRows[index].key && row.value === expectedRows[index].value);
    return matches ? sorted : undefined;
  });
  assert.deepEqual(actualRows, expectedRows);
}

describe('The Local Storage Page', () => {
  // TODO (crbug.com/416264654): Update navigateToApplicationTab helper to work in docked mode.
  setup({dockingMode: 'undocked'});

  it('updates Local Storage items when localStorage is modified', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab(devToolsPage, inspectedPage, 'iframe');

    await inspectedPage.evaluate(() => {
      localStorage.clear();
    });

    await navigateToLocalStorageForTopDomain(devToolsPage, inspectedPage);
    await waitForLocalStorageRows(devToolsPage, []);

    await inspectedPage.evaluate(() => {
      localStorage.setItem('key1', 'value1');
    });
    await waitForLocalStorageRows(devToolsPage, [
      {key: 'key1', value: 'value1'},
    ]);

    await inspectedPage.evaluate(() => {
      localStorage.setItem('key2', 'value2');
    });
    await waitForLocalStorageRows(devToolsPage, [
      {key: 'key1', value: 'value1'},
      {key: 'key2', value: 'value2'},
    ]);

    await inspectedPage.evaluate(() => {
      localStorage.setItem('key3', 'value3');
    });
    await waitForLocalStorageRows(devToolsPage, [
      {key: 'key1', value: 'value1'},
      {key: 'key2', value: 'value2'},
      {key: 'key3', value: 'value3'},
    ]);

    await inspectedPage.evaluate(() => {
      localStorage.setItem('key4', 'value4');
    });
    await waitForLocalStorageRows(devToolsPage, [
      {key: 'key1', value: 'value1'},
      {key: 'key2', value: 'value2'},
      {key: 'key3', value: 'value3'},
      {key: 'key4', value: 'value4'},
    ]);

    await inspectedPage.evaluate(() => {
      localStorage.setItem('key5', 'value5');
    });
    await waitForLocalStorageRows(devToolsPage, [
      {key: 'key1', value: 'value1'},
      {key: 'key2', value: 'value2'},
      {key: 'key3', value: 'value3'},
      {key: 'key4', value: 'value4'},
      {key: 'key5', value: 'value5'},
    ]);

    await inspectedPage.evaluate(() => {
      localStorage.setItem('key6', 'value6');
    });
    await waitForLocalStorageRows(devToolsPage, [
      {key: 'key1', value: 'value1'},
      {key: 'key2', value: 'value2'},
      {key: 'key3', value: 'value3'},
      {key: 'key4', value: 'value4'},
      {key: 'key5', value: 'value5'},
      {key: 'key6', value: 'value6'},
    ]);

    await inspectedPage.evaluate(() => {
      localStorage.removeItem('key1');
    });
    await waitForLocalStorageRows(devToolsPage, [
      {key: 'key2', value: 'value2'},
      {key: 'key3', value: 'value3'},
      {key: 'key4', value: 'value4'},
      {key: 'key5', value: 'value5'},
      {key: 'key6', value: 'value6'},
    ]);

    await inspectedPage.evaluate(() => {
      localStorage.removeItem('key3');
    });
    await waitForLocalStorageRows(devToolsPage, [
      {key: 'key2', value: 'value2'},
      {key: 'key4', value: 'value4'},
      {key: 'key5', value: 'value5'},
      {key: 'key6', value: 'value6'},
    ]);

    await inspectedPage.evaluate(() => {
      localStorage.removeItem('key5');
    });
    await waitForLocalStorageRows(devToolsPage, [
      {key: 'key2', value: 'value2'},
      {key: 'key4', value: 'value4'},
      {key: 'key6', value: 'value6'},
    ]);

    await inspectedPage.evaluate(() => {
      localStorage.setItem('key2', 'VALUE2');
    });
    await waitForLocalStorageRows(devToolsPage, [
      {key: 'key2', value: 'VALUE2'},
      {key: 'key4', value: 'value4'},
      {key: 'key6', value: 'value6'},
    ]);

    await inspectedPage.evaluate(() => {
      localStorage.clear();
    });
    await waitForLocalStorageRows(devToolsPage, []);
  });
});
