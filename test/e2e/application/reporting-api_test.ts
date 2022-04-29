// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$, click, enableExperiment, getBrowserAndPages, getTestServerPort, goToResource, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToApplicationTab} from '../helpers/application-helpers.js';
import {getDataGrid, getDataGridRows, getInnerTextOfDataGridCells} from '../helpers/datagrid-helpers.js';

const REPORTING_API_SELECTOR = '[aria-label="Reporting API"]';

describe('The Reporting API Page', async () => {
  beforeEach(async () => {
    await enableExperiment('reportingApiDebugging');
  });
  // Flacky test block roll CL: https://crrev.com/c/3615685.
  it.skip('[crbug.com/1321131]: shows reports', async () => {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'reporting-api');
    await click(REPORTING_API_SELECTOR);
    const dataGrid = await getDataGrid();
    const innerText = await getInnerTextOfDataGridCells(dataGrid, 1, false);
    const reportBody = '{"columnNumber":10,"id":"PrefixedStorageInfo","lineNumber":9,"message":"' +
        '\'window.webkitStorageInfo\' is deprecated. Please use \'navigator.webkitTemporaryStorage\' or ' +
        '\'navigator.webkitPersistentStorage\' instead.","sourceFile":' +
        `"https://localhost:${getTestServerPort()}/test/e2e/resources/application/reporting-api.html"}`;

    assert.strictEqual(
        innerText[0][0], `https://localhost:${getTestServerPort()}/test/e2e/resources/application/reporting-api.html`);
    assert.strictEqual(innerText[0][1], 'deprecation');
    assert.strictEqual(innerText[0][2], 'Queued');
    assert.strictEqual(innerText[0][3], 'default');
    assert.strictEqual(innerText[0][5], reportBody);

    const rows = await getDataGridRows(1, dataGrid, false);
    await click(rows[rows.length - 1][0]);

    const jsonView = await waitFor('.json-view');
    const jsonViewText = await jsonView.evaluate(el => (el as HTMLElement).innerText);
    assert.strictEqual(jsonViewText, '{columnNumber: 10, id: "PrefixedStorageInfo", lineNumber: 9,…}');
  });

  it('shows endpoints', async () => {
    await goToResource('application/reporting-api.rawresponse');
    await click('#tab-resources');
    await waitFor('.storage-group-list-item');  // Make sure the application navigation list is shown
    await click(REPORTING_API_SELECTOR);
    const endpointsGrid = await $('devtools-resources-endpoints-grid');
    if (!endpointsGrid) {
      assert.fail('Could not find data-grid');
    }
    const dataGrid = await getDataGrid(endpointsGrid);
    const innerText = await getInnerTextOfDataGridCells(dataGrid, 2, true);
    assert.strictEqual(innerText[0][0], `https://localhost:${getTestServerPort()}`);
    assert.strictEqual(innerText[0][1], 'default');
    assert.strictEqual(innerText[0][2], 'https://reports.example/default');
    assert.strictEqual(innerText[1][0], `https://localhost:${getTestServerPort()}`);
    assert.strictEqual(innerText[1][1], 'main-endpoint');
    assert.strictEqual(innerText[1][2], 'https://reports.example/main');
  });
});
