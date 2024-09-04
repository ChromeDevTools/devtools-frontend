// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  $$,
  clickElement,
  getBrowserAndPages,
  getTestServerPort,
  goToResource,
  step,
  waitFor,
} from '../../shared/helper.js';
import {
  getStorageItemsData,
  getTrimmedTextContent,
  navigateToApplicationTab,
  navigateToSharedStorage,
  navigateToSharedStorageForTopDomain,
} from '../helpers/application-helpers.js';
import {
  getDataGrid,
  getDataGridRows,
  getInnerTextOfDataGridCells,
} from '../helpers/datagrid-helpers.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
let DOMAIN: string;

describe('The Application Tab', () => {
  before(async () => {
    DOMAIN = `https://localhost:${getTestServerPort()}`;
  });

  afterEach(async () => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
  });

  // Failing test.
  it.skip('[crbug.com/1485830]: shows Shared Storage events', async () => {
    const {target} = getBrowserAndPages();

    await step('navigate to shared-storage resource and open Application tab', async () => {
      // Events are not recorded because tracking is not yet enabled.
      await navigateToApplicationTab(target, 'shared-storage');
    });

    await step('open the events view', async () => {
      await navigateToSharedStorage();
    });

    await step('navigate to shared-storage resource so that events will be recorded', async () => {
      // Events are recorded because tracking is enabled.
      await goToResource('application/shared-storage.html');
    });

    await step('check that event values are correct and preview loads', async () => {
      const dataGrid = await getDataGrid();
      const innerText = await getInnerTextOfDataGridCells(dataGrid, 3, false);

      assert.strictEqual(innerText[0][1], 'documentClear');
      assert.strictEqual(innerText[0][2], DOMAIN);
      assert.strictEqual(innerText[0][3], '{}');
      assert.strictEqual(innerText[1][1], 'documentSet');
      assert.strictEqual(innerText[1][2], DOMAIN);
      assert.strictEqual(innerText[1][3], '{"key":"firstKey","value":"firstValue"}');
      assert.strictEqual(innerText[2][1], 'documentAppend');
      assert.strictEqual(innerText[2][2], DOMAIN);
      assert.strictEqual(
          innerText[2][3], '{"key":"secondKey","value":"{\\"field\\":\\"complexValue\\",\\"primitive\\":2}"}');

      const rows = await getDataGridRows(3, dataGrid, false);
      await clickElement(rows[rows.length - 1][0]);

      const jsonView = await waitFor('.json-view');
      const jsonViewText = await jsonView.evaluate(el => (el as HTMLElement).innerText);
      const accessTimeString = jsonViewText.substring('{accessTime: '.length, jsonViewText.indexOf(', accessType:'));
      assert.strictEqual(
          jsonViewText, `{accessTime: ${accessTimeString}, accessType: "documentAppend", ownerOrigin: "${DOMAIN}",…}`);
    });
  });

  // Failing test.
  it.skip('[crbug.com/1485830]: shows Shared Storage metadata', async () => {
    const {target} = getBrowserAndPages();

    await step('navigate to shared-storage resource and open Application tab', async () => {
      await navigateToApplicationTab(target, 'shared-storage');
    });

    await step('open the domain storage', async () => {
      await navigateToSharedStorageForTopDomain();
    });

    await step('verify that metadata is correct', async () => {
      const fieldValues = await getTrimmedTextContent('devtools-report-value');
      const timeString = fieldValues[1];
      assert.deepEqual(fieldValues, [DOMAIN, timeString, '2', '12']);
    });
  });

  // Failing test.
  it.skip('[crbug.com/1485830]: shows Shared Storage keys and values', async () => {
    const {target} = getBrowserAndPages();

    await step('navigate to shared-storage resource and open Application tab', async () => {
      await navigateToApplicationTab(target, 'shared-storage');
    });

    await step('open the domain storage', async () => {
      await navigateToSharedStorageForTopDomain();
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

    await step('verify that preview loads', async () => {
      const dataGridNodes = await $$('.data-grid-data-grid-node:not(.creation-node)');
      await clickElement(dataGridNodes[dataGridNodes.length - 1]);

      const jsonView = await waitFor('.json-view');
      const jsonViewText = await jsonView.evaluate(el => (el as HTMLElement).innerText);
      assert.strictEqual(jsonViewText, '{key: "secondKey", value: "{"field":"complexValue","primitive":2}"}');
    });
  });
});
