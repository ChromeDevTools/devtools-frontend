// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

import {openPanelViaMoreTools} from './settings-helpers.js';

const START_INSTRUMENTING_BUTTON = 'devtools-button[aria-label="Start instrumenting coverage and reload page"]';
const STOP_INSTRUMENTING_BUTTON = 'devtools-button[aria-label="Stop instrumenting coverage and show results"]';

export async function waitForTheCoveragePanelToLoad(frontend?: DevToolsPage) {
  frontend = frontend || getBrowserAndPagesWrappers().devToolsPage;
  // Open panel and wait for content
  await openPanelViaMoreTools('Coverage', frontend);
  await frontend.waitFor('div[aria-label="Coverage panel"]');
  await frontend.waitFor('.coverage-results .empty-state');
}

export async function navigateToCoverageTestSite(inspectedPage?: InspectedPage) {
  inspectedPage = inspectedPage || getBrowserAndPagesWrappers().inspectedPage;
  await inspectedPage.goToResource('coverage/default.html');
}

export async function startInstrumentingCoverage(frontend?: DevToolsPage) {
  frontend = frontend || getBrowserAndPagesWrappers().devToolsPage;
  await frontend.click(START_INSTRUMENTING_BUTTON);
  await frontend.waitForNone('.coverage-results .empty-state');
}

export async function stopInstrumentingCoverage(frontend?: DevToolsPage) {
  frontend = frontend || getBrowserAndPagesWrappers().devToolsPage;
  await frontend.click(STOP_INSTRUMENTING_BUTTON);
  await frontend.waitForNone('button[title="Clear coverage"][disabled]');
}

export async function clearCoverageContent(frontend?: DevToolsPage) {
  frontend = frontend || getBrowserAndPagesWrappers().devToolsPage;
  await frontend.click('devtools-button[aria-label="Clear coverage"]');
  await frontend.waitFor('.coverage-results .empty-state');
}

export async function getCoverageData(expectedCount: number, frontend?: DevToolsPage) {
  frontend = frontend || getBrowserAndPagesWrappers().devToolsPage;
  const rows = await frontend.waitForMany(
      '.data-grid-data-grid-node', expectedCount, await frontend.waitFor('.coverage-results'));
  return await Promise.all(rows.map(r => r.evaluate((r: Element) => ({
                                                      url: r.querySelector('.url-column')?.textContent,
                                                      total: r.querySelector('.size-column')?.textContent,
                                                      unused: r.querySelector('.unused-size-column span')?.textContent,
                                                    }))));
}
