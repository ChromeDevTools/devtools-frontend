// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {navigateToApplicationTab} from '../helpers/application-helpers.js';
import {getDataGrid, getDataGridRows, getInnerTextOfDataGridCells} from '../helpers/datagrid-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const REPORTING_API_SELECTOR = '[aria-label="Reporting API"]';
const CRASH_REPORT_CONTEXT_SELECTOR = '[aria-label="Crash Report Context"]';
const TOOLBAR_SELECTOR = '.crash-report-context-toolbar';
const FILTER_INPUT_SELECTOR = '.toolbar-input-prompt';
const EMPTY_STATE_HEADER_SELECTOR = '.empty-state-header';
const REFRESH_BUTTON_SELECTOR = '[title="Refresh"]';

interface CrashReportContext {
  initialize(size: number): Promise<void>;
  set(key: string, value: string): void;
  delete(key: string): void;
}

declare global {
  interface Window {
    crashReport: CrashReportContext;
  }
}

describe('The Crash Report Context Page', function() {
  setup({dockingMode: 'undocked'});

  async function setupTest(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await navigateToApplicationTab('reporting-api', devToolsPage, inspectedPage);
    await inspectedPage.evaluate(async () => {
      await window.crashReport.initialize(1024);
    });
  }

  async function clickCrashReportContext(devToolsPage: DevToolsPage) {
    const reportingApiNode = await devToolsPage.waitFor(REPORTING_API_SELECTOR);
    const isExpanded = await reportingApiNode.evaluate(el => el.getAttribute('aria-expanded') === 'true');
    if (!isExpanded) {
      await devToolsPage.click(REPORTING_API_SELECTOR, {clickOptions: {count: 2}});
    }
    await devToolsPage.click(CRASH_REPORT_CONTEXT_SELECTOR);
  }

  function assertRowDetails(cells: string[], expectedKey: string, expectedValue: string) {
    assert.strictEqual(cells[0], expectedKey);
    assert.strictEqual(cells[1], expectedValue);
  }

  it('shows empty state when no crash report context is available', async ({devToolsPage, inspectedPage}) => {
    await setupTest(devToolsPage, inspectedPage);
    await clickCrashReportContext(devToolsPage);
    const emptyHeader = await devToolsPage.waitFor(EMPTY_STATE_HEADER_SELECTOR);
    const text = await emptyHeader.evaluate(el => el.textContent);
    assert.strictEqual(text, 'No context entries detected across frames.');
  });

  it('shows crash report context entries', async ({devToolsPage, inspectedPage}) => {
    await setupTest(devToolsPage, inspectedPage);
    await inspectedPage.evaluate(async () => {
      window.crashReport.set('test-key', 'test-value');
    });
    await clickCrashReportContext(devToolsPage);
    const dataGrid = await getDataGrid(undefined, devToolsPage);
    const innerText = await getInnerTextOfDataGridCells(dataGrid, 1, true, devToolsPage);
    assertRowDetails(innerText[0], 'test-key', 'test-value');
  });

  it('filters crash report context entries by key', async ({devToolsPage, inspectedPage}) => {
    await setupTest(devToolsPage, inspectedPage);
    await inspectedPage.evaluate(async () => {
      window.crashReport.set('apple', 'red');
      window.crashReport.set('banana', 'yellow');
    });
    await clickCrashReportContext(devToolsPage);
    const dataGrid = await getDataGrid(undefined, devToolsPage);
    await getDataGridRows(2, dataGrid, false, devToolsPage);
    const toolbar = await devToolsPage.waitFor(TOOLBAR_SELECTOR);
    const filterInput = await devToolsPage.waitFor(FILTER_INPUT_SELECTOR, toolbar);
    await filterInput.click();
    await devToolsPage.typeText('apple');

    const innerText = await getInnerTextOfDataGridCells(dataGrid, 1, true, devToolsPage);
    assertRowDetails(innerText[0], 'apple', 'red');
  });

  it('filters crash report context entries by value', async ({devToolsPage, inspectedPage}) => {
    await setupTest(devToolsPage, inspectedPage);
    await inspectedPage.evaluate(async () => {
      window.crashReport.set('apple', 'red');
      window.crashReport.set('banana', 'yellow');
    });
    await clickCrashReportContext(devToolsPage);
    const dataGrid = await getDataGrid(undefined, devToolsPage);
    await getDataGridRows(2, dataGrid, false, devToolsPage);
    const toolbar = await devToolsPage.waitFor(TOOLBAR_SELECTOR);
    const filterInput = await devToolsPage.waitFor(FILTER_INPUT_SELECTOR, toolbar);
    await filterInput.click();
    await devToolsPage.typeText('red');
    const innerText = await getInnerTextOfDataGridCells(dataGrid, 1, true, devToolsPage);
    assertRowDetails(innerText[0], 'apple', 'red');
  });

  it('deletes crash report context entries', async ({devToolsPage, inspectedPage}) => {
    await setupTest(devToolsPage, inspectedPage);
    await inspectedPage.evaluate(async () => {
      window.crashReport.set('apple', 'red');
      window.crashReport.set('banana', 'yellow');
    });
    await clickCrashReportContext(devToolsPage);
    const dataGrid = await getDataGrid(undefined, devToolsPage);
    const innerTextBeforeDelete = await getInnerTextOfDataGridCells(dataGrid, 2, true, devToolsPage);
    assertRowDetails(innerTextBeforeDelete[0], 'apple', 'red');
    assertRowDetails(innerTextBeforeDelete[1], 'banana', 'yellow');
    await inspectedPage.evaluate(async () => {
      window.crashReport.delete('apple');
    });
    const refreshButton = await devToolsPage.waitFor(REFRESH_BUTTON_SELECTOR);
    await refreshButton.click();
    const innerText = await getInnerTextOfDataGridCells(dataGrid, 1, true, devToolsPage);
    assertRowDetails(innerText[0], 'banana', 'yellow');
  });
});
