// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $,
  click,
  getBrowserAndPages,
  getTestServerPort,
  goToResource,
  waitFor,
} from '../../shared/helper.js';

import {navigateToApplicationTab} from '../helpers/application-helpers.js';
import {getDataGrid, getDataGridRows, getInnerTextOfDataGridCells} from '../helpers/datagrid-helpers.js';

const REPORTING_API_SELECTOR = '[aria-label="Reporting API"]';

describe('The Reporting API Page', () => {
  beforeEach(async () => {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'empty');
  });

  // Flaky on mac
  it.skipOnPlatforms(['mac'], '[crbug.com/1482688] shows reports', async () => {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'reporting-api');
    await click(REPORTING_API_SELECTOR);
    const dataGrid = await getDataGrid();
    const innerText = await getInnerTextOfDataGridCells(dataGrid, 1, false);
    const reportBody = '{"columnNumber":20,"id":"NavigatorVibrate","lineNumber":9,"message":' +
        '"Blocked call to navigator.vibrate because user hasn\'t tapped on the frame or any ' +
        'embedded frame yet: https://www.chromestatus.com/feature/5644273861001216.","sourceFile":' +
        `"https://localhost:${getTestServerPort()}/test/e2e/resources/application/reporting-api.html"}`;

    assert.strictEqual(
        innerText[0][0], `https://localhost:${getTestServerPort()}/test/e2e/resources/application/reporting-api.html`);
    assert.strictEqual(innerText[0][1], 'intervention');
    assert.strictEqual(innerText[0][2], 'Queued');
    assert.strictEqual(innerText[0][3], 'default');
    assert.strictEqual(innerText[0][5], reportBody);

    const rows = await getDataGridRows(1, dataGrid, false);
    await rows[rows.length - 1][0].click();

    const jsonView = await waitFor('.json-view');
    const jsonViewText = await jsonView.evaluate(el => (el as HTMLElement).innerText);
    assert.strictEqual(jsonViewText, '{columnNumber: 20, id: "NavigatorVibrate", lineNumber: 9,…}');
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
