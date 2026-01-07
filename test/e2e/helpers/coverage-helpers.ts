// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

import {openPanelViaMoreTools} from './settings-helpers.js';

const START_INSTRUMENTING_BUTTON = 'button[title="Start instrumenting coverage and reload page"]';
const STOP_INSTRUMENTING_BUTTON = 'button[title="Stop instrumenting coverage and show results"]';

export async function waitForTheCoveragePanelToLoad(devToolsPage: DevToolsPage) {
  // Open panel and wait for content
  await openPanelViaMoreTools('Coverage', devToolsPage);
  await devToolsPage.waitFor('div[aria-label="Coverage panel"]');
  await devToolsPage.waitFor('.coverage-results .empty-state');
}

export async function navigateToCoverageTestSite(inspectedPage: InspectedPage) {
  await inspectedPage.goToResource('coverage/default.html');
}

export async function startInstrumentingCoverage(devToolsPage: DevToolsPage) {
  await devToolsPage.click(START_INSTRUMENTING_BUTTON);
  await devToolsPage.waitForNone('.coverage-results .empty-state');
}

export async function stopInstrumentingCoverage(devToolsPage: DevToolsPage) {
  await devToolsPage.click(STOP_INSTRUMENTING_BUTTON);
  await devToolsPage.waitForNone('button[title="Clear coverage"][disabled]');
}

export async function clearCoverageContent(devToolsPage: DevToolsPage) {
  await devToolsPage.click('button[title="Clear coverage"]');
  await devToolsPage.waitFor('.coverage-results .empty-state');
}

export async function getCoverageData(expectedCount: number, devToolsPage: DevToolsPage) {
  return await devToolsPage.waitForFunction(async () => {
    const rows = await devToolsPage.waitForMany(
        '.data-grid-data-grid-node', expectedCount, await devToolsPage.waitFor('.coverage-results'));
    const data =
        (await Promise.all(rows.map(r => r.evaluate(r => ({
                                                      url: r.querySelector('.url-column')?.textContent,
                                                      total: r.querySelector('.size-column')?.textContent,
                                                      unused: r.querySelector('.unused-size-column span')?.textContent,
                                                    })))))
            .filter(r => r.url && !r.url.startsWith('pptr:evaluate;'));
    return data.length === expectedCount ? data : undefined;
  });
}

export async function waitForCoverageData(
    expectedData: Array<{url: string, total: string, unused: string}>, devToolsPage: DevToolsPage) {
  return await devToolsPage.waitForFunction(async () => {
    const data = await getCoverageData(expectedData.length, devToolsPage);
    for (let i = 0; i < data.length; i++) {
      if (data[i].url !== expectedData[i].url || data[i].total !== expectedData[i].total ||
          data[i].unused !== expectedData[i].unused) {
        return false;
      }
    }
    return true;
  });
}
