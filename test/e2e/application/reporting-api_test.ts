// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, enableExperiment, getBrowserAndPages, getTestServerPort} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToApplicationTab} from '../helpers/application-helpers.js';
import {getDataGrid, getInnerTextOfDataGridCells} from '../helpers/datagrid-helpers.js';

const REPORTING_API_SELECTOR = '[aria-label="Reporting API"]';

describe('The Reporting API Page', async () => {
  beforeEach(async () => {
    await enableExperiment('reportingApiDebugging');
  });

  it('shows reports', async () => {
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
  });
});
