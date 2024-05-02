// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, goToResource, waitFor, waitForMany, waitForNone} from '../../shared/helper.js';

import {openPanelViaMoreTools} from './settings-helpers.js';

const START_INSTRUMENTING_BUTTON = 'button[aria-label="Start instrumenting coverage and reload page"]';
const STOP_INSTRUMENTING_BUTTON = 'button[aria-label="Stop instrumenting coverage and show results"]';

export async function waitForTheCoveragePanelToLoad() {
  // Open panel and wait for content
  await openPanelViaMoreTools('Coverage');
  await waitFor('div[aria-label="Coverage panel"]');
  await waitFor('.coverage-results .landing-page');
}

export async function navigateToCoverageTestSite() {
  await goToResource('coverage/default.html');
}

export async function startInstrumentingCoverage() {
  await click(START_INSTRUMENTING_BUTTON);
  await waitForNone('.coverage-results .landing-page');
}

export async function stopInstrumentingCoverage() {
  await click(STOP_INSTRUMENTING_BUTTON);
  await waitForNone('button[aria-label="Clear coverage"][disabled]');
}

export async function clearCoverageContent() {
  await click('button[aria-label="Clear coverage"]');
  await waitFor('.coverage-results .landing-page');
}

export async function getMessageContents() {
  const messageElement = await waitFor('.coverage-results .landing-page .message');
  return messageElement.evaluate(node => (node as HTMLElement).innerText);
}

export async function getCoverageData(expectedCount: number) {
  const rows = await waitForMany('.data-grid-data-grid-node', expectedCount, await waitFor('.coverage-results'));
  return Promise.all(rows.map(r => r.evaluate((r: Element) => ({
                                                url: r.querySelector('.url-column')?.textContent,
                                                total: r.querySelector('.size-column')?.textContent,
                                                unused: r.querySelector('.unused-size-column span')?.textContent,
                                              }))));
}
