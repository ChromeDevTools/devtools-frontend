// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

import {getDataGridRows} from './datagrid-helpers.js';
import {openCommandMenu} from './quick_open-helpers.js';
import {expectVeEvents, veChange, veClick, veImpression, veImpressionsUnder} from './visual-logging-helpers.js';

export async function navigateToApplicationTab(
    testName: string,
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage = getBrowserAndPagesWrappers().inspectedPage,
) {
  await inspectedPage.bringToFront();
  await inspectedPage.goToResource(`application/${testName}.html`);
  await devToolsPage.bringToFront();
  await openCommandMenu(devToolsPage);
  await devToolsPage.typeText('Application');
  await devToolsPage.page.keyboard.press('Enter');
  await devToolsPage.waitFor('#tab-resources');
  // Make sure the application navigation list is shown
  await devToolsPage.waitFor('.storage-group-list-item');
  await expectVeEvents([veImpressionForApplicationPanel()], undefined, devToolsPage);
}

export async function navigateToServiceWorkers(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const SERVICE_WORKER_ROW_SELECTOR = '[aria-label="Service workers"]';
  await devToolsPage.click(SERVICE_WORKER_ROW_SELECTOR);
  await devToolsPage.waitFor('.service-worker-list');
  await expectVeEvents(
      [
        veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: application > TreeItem: service-workers'),
        veImpressionsUnder('Panel: resources', [veImpressionForServiceWorkersView()]),
      ],
      undefined, devToolsPage);
}

export async function navigateToFrame(name: string, devToolsPage: DevToolsPage) {
  await doubleClickTreeItem(`[aria-label="${name}"]`, devToolsPage);
  await devToolsPage.waitFor('[title="Click to open in Sources panel"]');
  await expectVeEvents(
      [
        veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: frames > TreeItem: frame'),
        veImpressionsUnder('Panel: resources', [veImpressionForFrameDetails()]),
      ],
      undefined, devToolsPage);
}

export async function navigateToStorage(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const STORAGE_SELECTOR = '[aria-label="Storage"]';
  await devToolsPage.click(STORAGE_SELECTOR);
  await devToolsPage.waitFor('.clear-storage-button');
  await expectVeEvents(
      [
        veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: application > TreeItem: storage'),
        veImpressionsUnder('Panel: resources', [veImpressionForStorageOverview()]),
      ],
      undefined, devToolsPage);
}

export async function navigateToOpenedWindows(devToolsPage: DevToolsPage) {
  await doubleClickTreeItem('[aria-label="Opened Windows"]', devToolsPage);
  await devToolsPage.waitFor('.empty-state');
  await expectVeEvents(
      [
        veClick(
            'Panel: resources > Pane: sidebar > Tree > TreeItem: frames > TreeItem: frame > TreeItem: opened-windows'),
        veImpressionsUnder(
            'Panel: resources', [veImpression('Pane', 'opened-windows', [veImpression('Section', 'empty-view')])]),
      ],
      undefined, devToolsPage);
}

export async function navigateToWebWorkers(devToolsPage: DevToolsPage) {
  const WEB_WORKERS_SELECTOR = '[aria-label="Web Workers"]';
  await expectVeEvents(
      [veImpressionsUnder(
          'Panel: resources > Pane: sidebar > Tree > TreeItem: frames > TreeItem: frame',
          [veImpression('TreeItem', 'web-workers')])],
      undefined, devToolsPage);
  await doubleClickTreeItem(WEB_WORKERS_SELECTOR, devToolsPage);
  await devToolsPage.waitFor(`${WEB_WORKERS_SELECTOR} + ol li:first-child`);
  await devToolsPage.waitFor('.empty-state');
  await expectVeEvents(
      [
        veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: frames > TreeItem: frame > TreeItem: web-workers'),
        veImpressionsUnder(
            'Panel: resources', [veImpression('Pane', 'web-workers', [veImpression('Section', 'empty-view')])]),
      ],
      undefined, devToolsPage);
}

export async function navigateToFrameServiceWorkers(frameName: string, devToolsPage: DevToolsPage) {
  await navigateToFrame(frameName, devToolsPage);
  const SERVICE_WORKERS_SELECTOR = `[aria-label="${frameName}"] ~ ol [aria-label="Service workers"]`;

  await doubleClickTreeItem(SERVICE_WORKERS_SELECTOR, devToolsPage);
  await devToolsPage.waitFor(`${SERVICE_WORKERS_SELECTOR} + ol li:first-child`);
  const emptyState = devToolsPage.waitFor('.empty-state');
  const veEvents = expectVeEvents(
      [
        veClick(
            'Panel: resources > Pane: sidebar > Tree > TreeItem: frames > TreeItem: frame > TreeItem: service-workers'),
        veImpressionsUnder(
            'Panel: resources', [veImpression('Pane', 'service-workers', [veImpression('Section', 'empty-view')])]),
      ],
      undefined, devToolsPage);
  await Promise.all([emptyState, veEvents]);
}

export async function navigateToCookiesForTopDomain(
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage = getBrowserAndPagesWrappers().inspectedPage) {
  // The parent suffix makes sure we wait for the Cookies item to have children before trying to click it.
  const COOKIES_SELECTOR = '[aria-label="Cookies"].parent';
  const DOMAIN_SELECTOR = `${COOKIES_SELECTOR} + ol > [aria-label="${inspectedPage.domain()}"]`;
  await doubleClickTreeItem(COOKIES_SELECTOR, devToolsPage);
  await doubleClickTreeItem(DOMAIN_SELECTOR, devToolsPage);

  await expectVeEvents(
      [
        veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: storage > TreeItem: cookies'),
        veImpressionsUnder(
            'Panel: resources',
            [
              veImpression(
                  'Pane', 'cookies', [veImpression('Section', 'empty-view', [veImpression('Link', 'learn-more')])]),
              veImpressionsUnder(
                  'Pane: sidebar > Tree > TreeItem: storage > TreeItem: cookies',
                  [veImpression('TreeItem', 'cookies-for-frame')]),
            ]),
        veClick(
            'Panel: resources > Pane: sidebar > Tree > TreeItem: storage > TreeItem: cookies > TreeItem: cookies-for-frame'),
        veImpressionsUnder('Panel: resources', [veImpressionForCookieTable()]),
      ],
      undefined, devToolsPage);
}

export async function navigateToSessionStorageForTopDomain(
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage = getBrowserAndPagesWrappers().inspectedPage) {
  const SESSION_STORAGE_SELECTOR = '[aria-label="Session storage"].parent';
  const DOMAIN_SELECTOR = `${SESSION_STORAGE_SELECTOR} + ol > [aria-label="${inspectedPage.domain()}"]`;
  await doubleClickTreeItem(SESSION_STORAGE_SELECTOR, devToolsPage);
  await doubleClickTreeItem(DOMAIN_SELECTOR, devToolsPage);

  await expectVeEvents(
      [
        veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: storage > TreeItem: session-storage'),
        veImpressionsUnder(
            'Panel: resources',
            [
              veImpression(
                  'Pane', 'session-storage',
                  [veImpression('Section', 'empty-view', [veImpression('Link', 'learn-more')])]),
              veImpressionsUnder(
                  'Pane: sidebar > Tree > TreeItem: storage > TreeItem: session-storage',
                  [veImpression('TreeItem', 'session-storage-for-domain')]),
            ]),
        veClick(
            'Panel: resources > Pane: sidebar > Tree > TreeItem: storage > TreeItem: session-storage > TreeItem: session-storage-for-domain'),
        veImpressionsUnder('Panel: resources', [veImpressionForSessionStorageView()]),
      ],
      undefined, devToolsPage);
}

const SHARED_STORAGE_SELECTOR = '[aria-label="Shared storage"].parent';

export async function navigateToSharedStorage(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await doubleClickTreeItem(SHARED_STORAGE_SELECTOR, devToolsPage);
  await devToolsPage.waitFor('.empty-state');

  await expectVeEvents(
      [
        veImpressionsUnder(
            'Panel: resources', [veImpression('Pane', 'manifest', [veImpression('Section', 'empty-view')])]),
      ],
      undefined, devToolsPage);
}

export async function navigateToSharedStorageForTopDomain(
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage = getBrowserAndPagesWrappers().inspectedPage,
) {
  await navigateToSharedStorage(devToolsPage);
  const DOMAIN_SELECTOR = `${SHARED_STORAGE_SELECTOR} + ol > [aria-label="${inspectedPage.domain()}"]`;
  await doubleClickTreeItem(DOMAIN_SELECTOR, devToolsPage);
  await expectVeEvents(
      [
        veClick(
            'Panel: resources > Pane: sidebar > Tree > TreeItem: storage > TreeItem: shared-storage > TreeItem: shared-storage-instance'),
        veImpressionsUnder('Panel: resources', [veImpressionForSharedStorageView()]),
      ],
      undefined, devToolsPage);
}

async function doubleClickTreeItem(selector: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const element = await devToolsPage.waitFor(selector);
  await element.evaluate(el => el.scrollIntoView(true));
  await devToolsPage.click(selector, {clickOptions: {count: 2}});
}

export async function getDataGridData(
    selector: string, columns: string[], devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  // Wait for Storage data-grid to show up
  await devToolsPage.waitFor(selector);

  const dataGridNodes = await devToolsPage.$$('.data-grid-data-grid-node:not(.creation-node)');
  const dataGridRowValues = await Promise.all(dataGridNodes.map(node => node.evaluate((row: Element, columns) => {
    const data: Record<string, string|null> = {};
    for (const column of columns) {
      const columnElement = row.querySelector(`.${column}-column`);
      data[column] = (columnElement?.textContent?.trim()) || '';
    }
    return data;
  }, columns)));

  return dataGridRowValues;
}

export async function getTrimmedTextContent(
    selector: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const elements = await devToolsPage.$$(selector);
  return await Promise.all(elements.map(element => element.evaluate(e => {
    return (e.textContent || '').trim().replace(/[ \n]{2,}/gm, '');  // remove multiple consecutive whitespaces
  })));
}

export async function getFrameTreeTitles(devToolsPage: DevToolsPage) {
  const treeTitles = await devToolsPage.$$('[aria-label="Resources Section"] ~ ol .tree-element-title');
  return await Promise.all(treeTitles.map(node => node.evaluate(e => e.textContent)));
}

export async function getStorageItemsData(
    columns: string[], leastExpected = 1, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const gridData = await devToolsPage.waitForFunction(async () => {
    const values = await getDataGridData('.data-grid table', columns, devToolsPage);
    if (values.length >= leastExpected) {
      return values;
    }
    return undefined;
  });
  return gridData;
}

export async function filterStorageItems(filter: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const element = await devToolsPage.$('.toolbar-input-prompt');
  await expectVeEvents(
      [veImpressionsUnder('Panel: resources > Pane: cookies-data > Toolbar', [veImpression('TextField', 'filter')])],
      undefined, devToolsPage);
  await element.type(filter);
  await expectVeEvents(
      [
        veChange('Panel: resources > Pane: cookies-data > Toolbar > TextField: filter'),
        veImpressionsUnder(
            'Panel: resources > Pane: cookies-data > Toolbar > TextField: filter', [veImpression('Action', 'clear')]),
      ],
      undefined, devToolsPage);
}

export async function clearStorageItemsFilter(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click('.toolbar-input .toolbar-input-clear-button');
  await expectVeEvents(
      [veClick('Panel: resources > Pane: cookies-data > Toolbar > TextField: filter > Action: clear')], undefined,
      devToolsPage);
}

export async function clearStorageItems(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click('#storage-items-delete-all');
}

export async function selectStorageItemAtIndex(
    index: number, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    try {
      const dataGridNodes = await getDataGridRows(
          index + 1, await devToolsPage.waitFor('.storage-view devtools-data-grid'), /* matchExactNumberOfRows=*/ false,
          devToolsPage);
      await dataGridNodes[index][1].click();
      await expectVeEvents(
          [veClick('Panel: resources > Pane: session-storage-data > TableRow > TableCell: value')], undefined,
          devToolsPage);
    } catch (error) {
      if (error.message === 'Node is detached from document') {
        return false;
      }
      throw error;
    }
    return true;
  });
}

export async function deleteSelectedStorageItem(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click('[title="Delete Selected"]');
  await expectVeEvents(
      [veClick('Panel: resources > Pane: session-storage-data > Toolbar > Action: storage-items-view.delete-selected')],
      undefined, devToolsPage);
}

export async function selectCookieByName(name: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const dataGrid = await devToolsPage.waitFor('.cookies-table devtools-data-grid');
  const cell = await devToolsPage.waitForFunction(async () => {
    const rows = await getDataGridRows(
        /* expectedNumberOfRows=*/ 1, dataGrid, /* matchExactNumberOfRows=*/ false, devToolsPage);
    for (const row of rows) {
      for (const cell of row) {
        const cellContent = await cell.evaluate(x => {
          return (x.classList.contains('name-column') && x.textContent?.trim()) ?? '';
        });
        if (cellContent === name) {
          return cell;
        }
      }
    }
    return undefined;
  });
  await expectVeEvents(
      [veImpressionsUnder('Panel: resources', [veImpression('Pane', 'cookies-data')])], undefined, devToolsPage);
  await cell.click();
  await expectVeEvents(
      [veClick('Panel: resources > Pane: cookies-data > TableRow > TableCell: name')], undefined, devToolsPage);
}

export async function waitForQuotaUsage(
    p: (quota: number) => boolean, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.bringToFront();
  await devToolsPage.waitForFunction(async () => {
    const usedQuota = await getQuotaUsage(devToolsPage);
    return p(usedQuota);
  });
}

export async function getQuotaUsage(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const storageRow = await devToolsPage.waitFor('.quota-usage-row');
  const quotaString = await storageRow.evaluate(el => el.textContent || '');
  const [usedQuotaText, modifier] =
      quotaString.replaceAll(',', '').replace(/^\D*([\d.]+)\D*(kM?)B.used.out.of\D*\d+\D*.?B.*$/, '$1 $2').split(' ');
  let usedQuota = Number.parseInt(usedQuotaText, 10);
  if (modifier === 'k') {
    usedQuota *= 1000;
  } else if (modifier === 'M') {
    usedQuota *= 1000000;
  }
  return usedQuota;
}

export async function getPieChartLegendRows(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const pieChartLegend = await devToolsPage.waitFor('.pie-chart-legend');
  const rows = await pieChartLegend.evaluate(legend => {
    const rows = [];
    for (const tableRow of legend.children) {
      const row = [];
      for (const cell of tableRow.children) {
        row.push(cell.textContent);
      }
      rows.push(row);
    }
    return rows;
  });
  return rows;
}

export async function unregisterServiceWorker(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const UNREGISTER_SERVICE_WORKER_SELECTOR = '[title="Unregister service worker"]';
  await devToolsPage.click('#tab-resources');
  await navigateToServiceWorkers(devToolsPage);
  await devToolsPage.click(UNREGISTER_SERVICE_WORKER_SELECTOR);
  await devToolsPage.waitForNone(UNREGISTER_SERVICE_WORKER_SELECTOR);
}

export function veImpressionForApplicationPanel() {
  return veImpression('Panel', 'resources', [
    veImpression('Pane', 'sidebar', [
      veImpression('Tree', undefined, [
        veImpression('TreeItem', 'application', [
          veImpression('Expand'),
          veImpression('TreeItem', 'manifest', [veImpression('Expand')]),
          veImpression('TreeItem', 'service-workers'),
          veImpression('TreeItem', 'storage'),
        ]),
        veImpression('TreeItem', 'storage', [
          veImpression('Expand'),
          veImpression('TreeItem', 'cache-storage'),
          veImpression('TreeItem', 'cookies'),
          veImpression('TreeItem', 'indexed-db'),
          veImpression('TreeItem', 'interest-groups'),
          veImpression('TreeItem', 'local-storage'),
          veImpression('TreeItem', 'private-state-tokens'),
          veImpression('TreeItem', 'session-storage'),
          veImpression('TreeItem', 'shared-storage'),
          veImpression('TreeItem', 'storage-buckets'),
        ]),
        veImpression('TreeItem', 'background-services', [
          veImpression('Expand'),
          veImpression('TreeItem', 'background-fetch'),
          veImpression('TreeItem', 'background-sync'),
          veImpression('TreeItem', 'bfcache'),
          veImpression('TreeItem', 'bounce-tracking-mitigations'),
          veImpression('TreeItem', 'notifications'),
          veImpression('TreeItem', 'payment-handler'),
          veImpression('TreeItem', 'periodic-background-sync'),
          veImpression('TreeItem', 'preloading', [veImpression('Expand')]),
          veImpression('TreeItem', 'push-messaging'),
          veImpression('TreeItem', 'reporting-api'),
        ]),
        veImpression('TreeItem', 'frames', [
          veImpression('Expand'),
          veImpression('TreeItem', 'frame', [veImpression('Expand')]),
        ]),
      ]),
    ]),
    veImpression('Pane', 'manifest', [
    ]),
  ]);
}

function veImpressionForCookieTable() {
  return veImpression('Pane', 'cookies-data', [
    veImpression('Pane', 'preview', [veImpression('Section', 'empty-view')]),
    veImpression('TableHeader', 'domain'),
    veImpression('TableHeader', 'expires'),
    veImpression('TableHeader', 'http-only'),
    veImpression('TableHeader', 'name'),
    veImpression('TableHeader', 'partition-key-site'),
    veImpression('TableHeader', 'path'),
    veImpression('TableHeader', 'priority'),
    veImpression('TableHeader', 'same-site'),
    veImpression('TableHeader', 'secure'),
    veImpression('TableHeader', 'size'),
    veImpression('TableHeader', 'value'),
    veImpression(
        'Toolbar', undefined,
        [
          veImpression('Action', 'storage-items-view.clear-all'),
          veImpression('Action', 'storage-items-view.delete-selected'),
          veImpression('Action', 'storage-items-view.refresh'),
          veImpression('TextField', 'filter'),
          veImpression('Toggle', 'only-show-cookies-with-issues'),
        ]),
  ]);
}

function veImpressionForFrameDetails() {
  return veImpression('Pane', 'frames', [
    veImpression('Action', 'reveal-in-elements'),
    veImpression('Action', 'reveal-in-network'),
    veImpression('Action', 'reveal-in-sources'),
    veImpression('Link', 'learn-more.coop-coep'),
    veImpression('Link', 'learn-more.monitor-memory-usage'),
    veImpression('Link', 'learn-more.origin-trials'),
  ]);
}

function veImpressionForStorageViewToolbar() {
  return veImpression('Toolbar', undefined, [
    veImpression('Action', 'storage-items-view.refresh'),
    veImpression('TextField', 'filter'),
    veImpression('Action', 'storage-items-view.clear-all'),
    veImpression('Action', 'storage-items-view.delete-selected'),
  ]);
}

function veImpressionForSessionStorageView() {
  return veImpression('Pane', 'session-storage-data', [
    veImpressionForStorageViewToolbar(),
    veImpression('Pane', 'preview'),
    veImpression('TableHeader', 'key'),
    veImpression('TableHeader', 'value'),
  ]);
}

function veImpressionForSharedStorageView() {
  return veImpression('Pane', 'shared-storage-data', [
    veImpressionForStorageViewToolbar(),
    veImpression('TableHeader', 'key'),
    veImpression('TableHeader', 'value'),
    veImpression('Action', 'reset-entropy-budget'),
    veImpression('Pane', 'preview', [veImpression('Section', 'empty-view')]),
  ]);
}

function veImpressionForServiceWorkersView() {
  return veImpression('Pane', 'service-workers', [
    veImpression('Section', 'other-origin', [veImpression('Link', 'view-all')]),
    veImpression(
        'Section', 'this-origin',
        [
          veImpression('Action', 'periodic-sync-tag'),
          veImpression('Action', 'push-message'),
          veImpression('Action', 'show-network-requests'),
          veImpression('Action', 'sync-tag'),
          veImpression('Action', 'unregister'),
          veImpression('Action', 'update'),
          veImpression('Link', 'source-location'),
          veImpression('TextField', 'periodic-sync-tag'),
          veImpression('TextField', 'push-message'),
          veImpression('TextField', 'sync-tag'),
          veImpression('Toggle', 'bypass-service-worker'),
          veImpression('Toggle', 'disconnect-from-network'),
          veImpression('Toggle', 'service-worker-update-on-reload'),
          veImpression('Tree', 'update-timing-table'),
        ]),
  ]);
}

function veImpressionForStorageOverview() {
  return veImpression('Pane', 'clear-storage', [
    veImpression('Action', 'storage.clear-site-data'),
    veImpression('Section', 'application', [veImpression('Toggle', 'clear-storage-service-workers')]),
    veImpression(
        'Section', 'storage',
        [
          veImpression('Toggle', 'clear-storage-cache-storage'),
          veImpression('Toggle', 'clear-storage-cookies'),
          veImpression('Toggle', 'clear-storage-indexeddb'),
          veImpression('Toggle', 'clear-storage-local-storage'),
        ]),
    veImpression(
        'Section', 'usage',
        [
          veImpression('Link', 'learn-more'),
          veImpression(
              'PieChart', undefined,
              [
                veImpression('Section', 'legend', [veImpression('PieChartTotal', 'select-total')]),
              ]),
          veImpression('Toggle', 'simulate-custom-quota'),
        ]),
    veImpression('Toggle', 'clear-storage-include-third-party-cookies'),
  ]);
}
