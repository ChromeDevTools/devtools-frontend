// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, goToResource, waitFor} from '../../shared/helper.js';

const RECORD_BUTTON_SELECTOR = '[aria-label="Record"]';
const STOP_BUTTON_SELECTOR = '[aria-label="Stop"]';

export async function navigateToPerformanceTab(testName?: string) {
  if (testName) {
    await goToResource(`performance/${testName}.html`);
  }

  // Click on the tab.
  await click('#tab-timeline');

  // Make sure the landing page is shown.
  await waitFor('.timeline-landing-page');
}

export async function startRecording() {
  await click(RECORD_BUTTON_SELECTOR);

  // Wait for the button to turn to its stop state.
  await waitFor(STOP_BUTTON_SELECTOR);
}

export async function stopRecording() {
  await click(STOP_BUTTON_SELECTOR);

  // Make sure the timeline details panel appears. It's a sure way to assert
  // that a recording is actually displayed as some of the other elements in
  // the timeline remain in the DOM even after the recording has been cleared.
  await waitFor('.timeline-details-chip-body');
}

export async function getTotalTimeFromSummary(): Promise<number> {
  const pieChartTotal = await waitFor('.pie-chart-total');
  const totalText = await pieChartTotal.evaluate(node => node.textContent as string);
  return parseInt(totalText, 10);
}

export async function navigateToPerformanceSidebarTab(tabName: string) {
  await click(`[aria-label="${tabName}"]`);
}

export async function waitForSourceLinkAndFollowIt() {
  const link = await waitFor('.devtools-link');
  await click(link);
  await waitFor('.panel[aria-label="sources"]');
}
