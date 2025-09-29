// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {navigateToApplicationTab} from '../../e2e/helpers/application-helpers.js';
import {getDataGrid, getDataGridRows, getInnerTextOfDataGridCells} from '../../e2e/helpers/datagrid-helpers.js';

const REPORTING_API_SELECTOR = '[aria-label="Reporting API"]';

describe('The Reporting API Page', () => {
  // TODO (liviurau): Update navigateToApplicationTab helper to work in docked
  // mode and remove the setup below.
  setup({dockingMode: 'undocked'});

  it('shows reports', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab('empty', devToolsPage, inspectedPage);
    await navigateToApplicationTab('reporting-api', devToolsPage, inspectedPage);
    await devToolsPage.click(REPORTING_API_SELECTOR);
    const dataGrid = await getDataGrid(undefined, devToolsPage);
    const innerText = await getInnerTextOfDataGridCells(dataGrid, 1, false, devToolsPage);
    const reportBody = '{"columnNumber":20,"id":"NavigatorVibrate","lineNumber":9,"message":' +
        '"Blocked call to navigator.vibrate because user hasn\'t tapped on the frame or any ' +
        'embedded frame yet: https://www.chromestatus.com/feature/5644273861001216.","sourceFile":' +
        `"${inspectedPage.getResourcesPath()}/application/reporting-api.html"}`;
    assert.strictEqual(innerText[0][1], `${inspectedPage.getResourcesPath()}/application/reporting-api.html`);
    assert.strictEqual(innerText[0][2], 'intervention');
    assert.strictEqual(innerText[0][3], 'Queued');
    assert.strictEqual(innerText[0][4], 'default');
    assert.strictEqual(innerText[0][6], reportBody);

    const rows = await getDataGridRows(1, dataGrid, false, devToolsPage);
    await rows[rows.length - 1][0].click();

    const jsonView = await devToolsPage.waitFor('.json-view');
    const jsonViewText = await jsonView.evaluate(el => (el as HTMLElement).innerText);
    assert.strictEqual(jsonViewText, '{columnNumber: 20, id: "NavigatorVibrate", lineNumber: 9,…}');
  });

  it('shows endpoints', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab('empty', devToolsPage, inspectedPage);
    await inspectedPage.goToResource('application/reporting-api.rawresponse');
    await devToolsPage.click('#tab-resources');
    await devToolsPage.waitFor('.storage-group-list-item');  // Make sure the application navigation list is shown
    await devToolsPage.click(REPORTING_API_SELECTOR);

    const container = await devToolsPage.waitFor('.endpoints-container');
    const dataGrid = await getDataGrid(container, devToolsPage);
    const innerText = await getInnerTextOfDataGridCells(dataGrid, 2, true, devToolsPage);
    assert.strictEqual(innerText[0][0], inspectedPage.domain());
    assert.strictEqual(innerText[0][1], 'default');
    assert.strictEqual(innerText[0][2], 'https://reports.example/default');
    assert.strictEqual(innerText[1][0], inspectedPage.domain());
    assert.strictEqual(innerText[1][1], 'main-endpoint');
    assert.strictEqual(innerText[1][2], 'https://reports.example/main');
  });
});
