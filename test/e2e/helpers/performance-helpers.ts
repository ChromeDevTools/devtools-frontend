// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {click, goToResource, platform, waitFor, waitForAria} from '../../shared/helper.js';

export const RECORD_BUTTON_SELECTOR = '[aria-label="Record"]';
export const RELOAD_AND_RECORD_BUTTON_SELECTOR = '[aria-label="Start profiling and reload page"]';
export const STOP_BUTTON_SELECTOR = '[aria-label="Stop"]';
export const SUMMARY_TAB_SELECTOR = '[aria-label="Summary"]';
export const BOTTOM_UP_SELECTOR = '[aria-label="Bottom-Up"]';
export const CALL_TREE_SELECTOR = '[aria-label="Call Tree"]';
export const ACTIVITY_COLUMN_SELECTOR = '.activity-column.disclosure';
export const TOTAL_TIME_SELECTOR =
    'div:nth-child(1) > div.vbox.timeline-details-chip-body > div:nth-child(1) > div.timeline-details-view-row-value';

export async function navigateToPerformanceTab(testName?: string) {
  if (testName) {
    await goToResource(`performance/${testName}.html`);
  }

  // Click on the tab.
  await click('#tab-timeline');

  // Make sure the landing page is shown.
  await waitFor('.timeline-landing-page');
}

export async function openCaptureSettings(sectionClassName: string) {
  const captureSettingsButton = await waitForAria('Capture settings');
  await captureSettingsButton.click();
  return await waitFor(sectionClassName);
}

export async function searchForComponent(frontend: puppeteer.Page, searchEntry: string) {
  const modifierKey = platform === 'mac' ? 'Meta' : 'Control';
  await frontend.keyboard.down(modifierKey);
  await frontend.keyboard.press('KeyF');
  await frontend.keyboard.up(modifierKey);
  await frontend.keyboard.type(searchEntry);
}

export async function navigateToSummaryTab() {
  await click(SUMMARY_TAB_SELECTOR);
}

export async function navigateToBottomUpTab() {
  await click(BOTTOM_UP_SELECTOR);
}

export async function navigateToCallTreeTab() {
  await click(CALL_TREE_SELECTOR);
}

export async function startRecording() {
  await click(RECORD_BUTTON_SELECTOR);

  // Wait for the button to turn to its stop state.
  await waitFor(STOP_BUTTON_SELECTOR);
}

export async function reloadAndRecord() {
  await click(RELOAD_AND_RECORD_BUTTON_SELECTOR);
  // Make sure the timeline details panel appears. It's a sure way to assert
  // that a recording is actually displayed as some of the other elements in
  // the timeline remain in the DOM even after the recording has been cleared.
  await waitFor('.timeline-details-chip-body');
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

export async function retrieveSelectedAndExpandedActivityItems(frontend: puppeteer.Page) {
  const treeItems = await frontend.$$('.expanded > td.activity-column,.selected > td.activity-column');
  const tree = [];
  for (const item of treeItems) {
    tree.push(await frontend.evaluate(el => el.innerText.split('\n')[0], item));
  }

  return tree;
}

export async function navigateToPerformanceSidebarTab(tabName: string) {
  await click(`[aria-label="${tabName}"]`);
}

export async function clickOnFunctionLink() {
  await click('.timeline-details.devtools-link');
}
