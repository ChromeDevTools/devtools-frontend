// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  getStorageItemsData,
  getTrimmedTextContent,
  navigateToApplicationTab,
  navigateToSharedStorage,
  navigateToSharedStorageForTopDomain,
} from '../../e2e/helpers/application-helpers.js';
import {
  getDataGrid,
  getDataGridRows,
  getInnerTextOfDataGridCells,
} from '../../e2e/helpers/datagrid-helpers.js';

const SITE = 'https://localhost';

describe('The Application Tab', () => {
  it('shows Shared Storage events', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab('shared-storage', devToolsPage, inspectedPage);

    await navigateToSharedStorage(devToolsPage);

    await inspectedPage.goToResource('application/shared-storage.html');

    const dataGrid = await getDataGrid(undefined, devToolsPage);
    const innerText = await getInnerTextOfDataGridCells(dataGrid, 3, false, devToolsPage);

    assert.strictEqual(innerText[0][1], 'window');
    assert.strictEqual(innerText[0][2], 'clear');
    assert.strictEqual(innerText[0][3], inspectedPage.domain());
    assert.strictEqual(innerText[0][4], SITE);
    assert.strictEqual(innerText[0][5], '{}');
    assert.strictEqual(innerText[1][1], 'window');
    assert.strictEqual(innerText[1][2], 'set');
    assert.strictEqual(innerText[1][3], inspectedPage.domain());
    assert.strictEqual(innerText[1][4], SITE);
    assert.strictEqual(innerText[1][5], '{"key":"firstKey","value":"firstValue","ignoreIfPresent":false}');
    assert.strictEqual(innerText[2][1], 'window');
    assert.strictEqual(innerText[2][2], 'append');
    assert.strictEqual(innerText[2][3], inspectedPage.domain());
    assert.strictEqual(innerText[2][4], SITE);
    assert.strictEqual(
        innerText[2][5], '{"key":"secondKey","value":"{\\"field\\":\\"complexValue\\",\\"primitive\\":2}"}');

    const rows = await getDataGridRows(3, dataGrid, false, devToolsPage);
    await devToolsPage.clickElement(rows[rows.length - 1][0]);

    const jsonView = await devToolsPage.waitFor('.json-view');
    const jsonViewText = await jsonView.evaluate(el => (el as HTMLElement).innerText);
    const accessTimeString = jsonViewText.substring('{accessTime: '.length, jsonViewText.indexOf(', scope:'));
    assert.strictEqual(jsonViewText, `{accessTime: ${accessTimeString}, scope: "window", method: "append",…}`);
  });

  it('shows Shared Storage metadata', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab('shared-storage', devToolsPage, inspectedPage);

    await navigateToSharedStorageForTopDomain(devToolsPage, inspectedPage);

    const fieldValues = await getTrimmedTextContent('devtools-report-value', devToolsPage);
    const timeString = fieldValues[0];  // Creation time is the first field for main frame
    // Origin is no longer displayed for main frame contexts.
    assert.deepEqual(fieldValues, [timeString, '2', '130', '12']);
  });

  it('shows Shared Storage keys and values', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab('shared-storage', devToolsPage, inspectedPage);

    await navigateToSharedStorageForTopDomain(devToolsPage, inspectedPage);

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

    const dataGrid = await getDataGrid(undefined, devToolsPage);
    const rows = await getDataGridRows(3, dataGrid, false, devToolsPage);
    await devToolsPage.clickElement(rows[1][0]);

    const jsonView = await devToolsPage.waitFor('.json-view');
    const jsonViewText = await jsonView.evaluate(el => (el as HTMLElement).innerText);
    assert.strictEqual(jsonViewText, '{key: "secondKey", value: "{"field":"complexValue","primitive":2}"}');
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
  });
});
