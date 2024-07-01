// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {getBrowserAndPages} from '../../conductor/puppeteer-state.js';
import {
  $,
  click,
  goToResource,
  platform,
  waitFor,
  waitForAria,
  waitForElementWithTextContent,
  waitForFunction,
  waitForMany,
} from '../../shared/helper.js';

import {veImpression} from './visual-logging-helpers.js';

export const FILTER_TEXTBOX_SELECTOR = '[aria-label="Filter"]';
export const RECORD_BUTTON_SELECTOR = '[aria-label="Record"]';
export const RELOAD_AND_RECORD_BUTTON_SELECTOR = '[aria-label="Record and reload"]';
export const STOP_BUTTON_SELECTOR = '[aria-label="Stop"]';
export const SUMMARY_TAB_SELECTOR = '[aria-label="Summary"]';
export const BOTTOM_UP_SELECTOR = '[aria-label="Bottom-Up"]';
export const CALL_TREE_SELECTOR = '[aria-label="Call Tree"]';
export const ACTIVITY_COLUMN_SELECTOR = '.activity-column.disclosure';
export const TOTAL_TIME_SELECTOR =
    'div:nth-child(1) > div.vbox.timeline-details-chip-body > div:nth-child(1) > div.timeline-details-view-row-value';
const RECALCULATE_STYLE_TITLE = 'Recalculate Style';
const SELECTOR_STATS_SELECTOR = '[aria-label="Selector Stats"]';
const CSS_SELECTOR_STATS_TITLE = 'Enable CSS selector stats (slow)';
const TIMELINE_SETTINGS_PANE = '.timeline-settings-pane';

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

export async function setFilter(filter: string) {
  const filterBoxElement = await click(FILTER_TEXTBOX_SELECTOR);
  await filterBoxElement.type(filter);
}

export async function toggleCaseSensitive() {
  const matchCaseButton = await waitForAria('Match Case');
  await matchCaseButton.click();
}

export async function toggleRegExButtonBottomUp() {
  const regexButton = await waitForAria('Use Regular Expression');
  await regexButton.click();
}

export async function toggleMatchWholeWordButtonBottomUp() {
  const wholeWordButton = await waitForAria('Match whole word');
  await wholeWordButton.click();
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

export async function getRenderingTimeFromSummary(): Promise<[number, string]> {
  const pieChartSizes = await waitForMany('.pie-chart-size', 6);
  const pieChartNames = await waitForMany('.pie-chart-name', 6);

  // update the index if the rendering time is showing in a different row
  const chartName = await pieChartNames[2].evaluate(node => node.textContent as string);
  const chartSize = await pieChartSizes[2].evaluate(node => node.textContent as string);

  return [parseInt(chartSize, 10), chartName];
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

export async function navigateToSelectorStatsTab() {
  await click(SELECTOR_STATS_SELECTOR);
}

export async function selectRecalculateStylesEvent() {
  const {frontend} = getBrowserAndPages();

  await waitForFunction(async () => {
    await searchForComponent(frontend, RECALCULATE_STYLE_TITLE);
    const title = await $('.timeline-details-chip-title');
    if (!title) {
      return false;
    }
    const titleText = await title.evaluate(x => x.textContent);
    return titleText === RECALCULATE_STYLE_TITLE;
  });
}

export async function enableCSSSelectorStats() {
  const timelineSettingsPane = await waitFor(TIMELINE_SETTINGS_PANE);
  if (await timelineSettingsPane.isHidden()) {
    await openCaptureSettings(TIMELINE_SETTINGS_PANE);
  }

  // Wait for the checkbox to load
  const toggle =
      await waitForElementWithTextContent(CSS_SELECTOR_STATS_TITLE) as puppeteer.ElementHandle<HTMLInputElement>;
  await waitForFunction(() => toggle.evaluate((e: HTMLInputElement) => {
    if (e.disabled) {
      return false;
    }
    if (!e.checked) {
      e.click();
    }
    return true;
  }));
}

export async function disableCSSSelectorStats() {
  const timelineSettingsPane = await waitFor(TIMELINE_SETTINGS_PANE);
  if (await timelineSettingsPane.isHidden()) {
    await openCaptureSettings(TIMELINE_SETTINGS_PANE);
  }

  // Wait for the checkbox to load
  const toggle =
      await waitForElementWithTextContent(CSS_SELECTOR_STATS_TITLE) as puppeteer.ElementHandle<HTMLInputElement>;
  await waitForFunction(() => toggle.evaluate((e: HTMLInputElement) => {
    if (e.disabled) {
      return false;
    }
    if (e.checked) {
      e.click();
    }
    return true;
  }));
}

export function veImpressionForPerformancePanel() {
  return veImpression('Panel', 'timeline', [
    veImpression(
        'Toolbar', undefined,
        [
          veImpression('Toggle', 'timeline.toggle-recording'),
          veImpression('Action', 'timeline.record-reload'),
          veImpression('Action', 'timeline.load-from-file'),
          veImpression('Action', 'timeline.save-to-file'),
          veImpression('Action', 'components.collect-garbage'),
          veImpression('Toggle', 'timeline-show-screenshots'),
          veImpression('Toggle', 'timeline-show-memory'),
        ]),
    // veImpression('Pane', 'timeline-settings-pane', {optional: true}),
    veImpression('Link', 'learn-more'),
    veImpression('Toggle', 'timeline.toggle-recording'),
    veImpression('Action', 'timeline.record-reload'),
  ]);
}
