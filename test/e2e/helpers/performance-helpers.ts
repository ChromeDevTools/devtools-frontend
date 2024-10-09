// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {getBrowserAndPages} from '../../conductor/puppeteer-state.js';
import {
  $,
  click,
  goToResource,
  summonSearchBox,
  waitFor,
  waitForAria,
  waitForElementWithTextContent,
  waitForFunction,
  waitForMany,
} from '../../shared/helper.js';

import {
  expectVeEvents,
  veChange,
  veClick,
  veImpression,
  veImpressionsUnder,
  veKeyDown,
  veResize,
} from './visual-logging-helpers.js';

export const FILTER_TEXTBOX_SELECTOR = '[aria-label="Filter"]';
export const RECORD_BUTTON_SELECTOR = '[aria-label="Record"]';
export const RELOAD_AND_RECORD_BUTTON_SELECTOR = '[aria-label="Record and reload"]';
export const STOP_BUTTON_SELECTOR = '[aria-label="Stop"]';
export const SUMMARY_TAB_SELECTOR = '[aria-label="Summary"]';
export const BOTTOM_UP_SELECTOR = '[aria-label="Bottom-up"]';
export const CALL_TREE_SELECTOR = '[aria-label="Call tree"]';
export const ACTIVITY_COLUMN_SELECTOR = '.activity-column.disclosure';
export const TOTAL_TIME_SELECTOR =
    'div:nth-child(1) > div.vbox.timeline-details-chip-body > div:nth-child(1) > div.timeline-details-view-row-value';
const RECALCULATE_STYLE_TITLE = 'Recalculate style';
const SELECTOR_STATS_SELECTOR = '[aria-label="Selector stats"]';
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
  await expectVeEvents([veClick('Toolbar: main > PanelTabHeader: timeline'), veImpressionForPerformancePanel()]);
}

export async function openCaptureSettings(sectionClassName: string) {
  const captureSettingsButton = await waitForAria('Capture settings');
  await captureSettingsButton.click();
  await waitFor(sectionClassName);
  await expectVeEvents(
      [
        veClick('Toolbar > Toggle: timeline-settings-toggle'),
        veImpression(
            'Pane', 'timeline-settings-pane',
            [
              veImpression('Toggle', 'timeline-capture-layers-and-pictures'),
              veImpression('Toggle', 'timeline-capture-selector-stats'),
              veImpression('Toggle', 'timeline-disable-js-sampling'),
              veImpression('DropDown', 'cpu-throttling'),
              veImpression('DropDown', 'preferred-network-condition'),
              veImpression('Toggle', 'timeline-show-extension-data'),
            ]),
      ],
      'Panel: timeline');
}

export async function searchForComponent(frontend: puppeteer.Page, searchEntry: string) {
  await waitFor('.timeline-details-chip-body');
  await summonSearchBox();
  await waitFor('.search-bar');
  await frontend.keyboard.type(searchEntry);
  await frontend.keyboard.press('Tab');
  await expectVeEvents([
    veKeyDown(''),
    veImpressionsUnder('Panel: timeline', [veImpression(
                                              'Toolbar', 'search',
                                              [
                                                veImpression('TextField', 'search'),
                                                veImpression('Action', 'regular-expression'),
                                                veImpression('Action', 'match-case'),
                                                veImpression('Action', 'select-previous'),
                                                veImpression('Action', 'select-next'),
                                                veImpression('Action', 'close-search'),
                                              ])]),
    veChange('Panel: timeline > Toolbar: search > TextField: search'),
  ]);
}

export async function navigateToBottomUpTab() {
  await click(BOTTOM_UP_SELECTOR);
  await expectVeEvents(
      [
        veClick('Section: timeline.flame-chart-view > Toolbar: sidebar > PanelTabHeader: bottom-up'),
        veImpressionsUnder(
            'Section: timeline.flame-chart-view',
            [
              veImpression(
                  'Pane', 'bottom-up',
                  [
                    veImpression(
                        'Toolbar', undefined,
                        [
                          veImpression('Toggle', 'match-case'),
                          veImpression('Toggle', 'regular-expression'),
                          veImpression('Toggle', 'match-whole-word'),
                          veImpression('TextField', 'filter'),
                          veImpression('DropDown', 'timeline-tree-group-by'),
                        ]),
                    veImpression('TableHeader', 'self'),
                    veImpression('TableHeader', 'total'),
                    veImpression('TableHeader', 'activity'),
                    veImpression(
                        'TableRow', undefined,
                        [
                          veImpression('TableCell', 'self'),
                          veImpression('TableCell', 'total'),
                          veImpression('TableCell', 'activity', [veImpression('Link', 'url')]),
                        ]),
                  ]),
            ]),

      ],
      'Panel: timeline');
}

export async function navigateToCallTreeTab() {
  await click(CALL_TREE_SELECTOR);
  await expectVeEvents(
      [
        veClick('Section: timeline.flame-chart-view > Toolbar: sidebar > PanelTabHeader: call-tree'),
        veImpressionsUnder(
            'Section: timeline.flame-chart-view',
            [

              veImpression(
                  'Pane', 'call-tree',
                  [
                    veImpression(
                        'Toolbar', undefined,
                        [
                          veImpression('Toggle', 'match-case'),
                          veImpression('Toggle', 'regular-expression'),
                          veImpression('Toggle', 'match-whole-word'),
                          veImpression('TextField', 'filter'),
                          veImpression('DropDown', 'timeline-tree-group-by'),
                        ]),
                    veImpression('TableHeader: self'),
                    veImpression('TableHeader: total'),
                    veImpression('TableHeader: activity'),
                    veImpression(
                        'TableRow', undefined,
                        [
                          veImpression('TableCell: self'),
                          veImpression('TableCell: total'),
                          veImpression('TableCell: activity'),
                        ]),
                  ]),
            ],
            ),
      ],
      'Panel: timeline');
}

export async function setFilter(filter: string) {
  const filterBoxElement = await click(FILTER_TEXTBOX_SELECTOR);
  await filterBoxElement.type(filter);
  await expectVeEvents(
      [veChange(''), veImpression('Action', 'clear')],
      'Panel: timeline > Section: timeline.flame-chart-view > Pane: bottom-up > Toolbar > TextField: filter');
}

export async function toggleCaseSensitive() {
  const matchCaseButton = await waitForAria('Match case');
  await matchCaseButton.click();
  await expectVeEvents([veClick(
      'Panel: timeline > Section: timeline.flame-chart-view > Pane: bottom-up > Toolbar > Toggle: match-case')]);
}

export async function toggleRegExButtonBottomUp() {
  const regexButton = await waitFor('[aria-label="Use regular expression"]');
  await regexButton.click();
  await expectVeEvents([
    veClick(
        'Panel: timeline > Section: timeline.flame-chart-view > Pane: bottom-up > Toolbar > Toggle: regular-expression'),
  ]);
}

export async function toggleMatchWholeWordButtonBottomUp() {
  const wholeWordButton = await waitForAria('Match whole word');
  await wholeWordButton.click();
  await expectVeEvents([veClick(
      'Panel: timeline > Section: timeline.flame-chart-view > Pane: bottom-up > Toolbar > Toggle: match-whole-word')]);
}

export async function startRecording() {
  await click(RECORD_BUTTON_SELECTOR);

  // Wait for the button to turn to its stop state.
  await waitFor(STOP_BUTTON_SELECTOR);
  await expectVeEvents(
      [veClick('Toolbar > Toggle: timeline.toggle-recording'), veImpressionForStatusDialog()], 'Panel: timeline');
}

export async function reloadAndRecord() {
  await click(RELOAD_AND_RECORD_BUTTON_SELECTOR);
  // Make sure the timeline details panel appears. It's a sure way to assert
  // that a recording is actually displayed as some of the other elements in
  // the timeline remain in the DOM even after the recording has been cleared.
  await waitFor('.timeline-details-chip-body');
  await expectVeEvents(
      [veClick('Toolbar > Action: timeline.record-reload'), veImpressionForStatusDialog()], 'Panel: timeline');
}

export async function stopRecording() {
  await click(STOP_BUTTON_SELECTOR);

  // Make sure the timeline details panel appears. It's a sure way to assert
  // that a recording is actually displayed as some of the other elements in
  // the timeline remain in the DOM even after the recording has been cleared.
  await waitFor('.timeline-details-chip-body');
  await expectVeEvents(
      [
        veClick('Toolbar > Toggle: timeline.toggle-recording'),
        veResize('Dialog: timeline-status'),
      ],
      'Panel: timeline');
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

export async function navigateToSelectorStatsTab() {
  await click(SELECTOR_STATS_SELECTOR);
  await expectVeEvents(
      [
        veClick('Toolbar: sidebar > PanelTabHeader: selector-stats'),
        veImpression(
            'Pane', 'selector-stats',
            [
              veImpression('TableHeader', 'elapsed(us)'),
              veImpression('TableHeader', 'match_attempts'),
              veImpression('TableHeader', 'match_count'),
              veImpression('TableHeader', 'reject_percentage'),
              veImpression('TableHeader', 'selector'),
              veImpression('TableHeader', 'style_sheet_id'),
              veImpression('TableRow', undefined, [veImpression('TableCell')]),
            ]),
      ],
      'Panel: timeline > Section: timeline.flame-chart-view');
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
  await expectVeEvents(
      [veChange('Panel: timeline > Pane: timeline-settings-pane > Toggle: timeline-capture-selector-stats')]);
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
  await expectVeEvents(
      [veChange('Panel: timeline > Pane: timeline-settings-pane > Toggle: timeline-capture-selector-stats')]);
}

export function veImpressionForPerformancePanel(options?: {timelineLegacyLandingPage?: boolean}) {
  return veImpression('Panel', 'timeline', [
    veImpression(
        'Toolbar', undefined,
        [
          veImpression('Toggle', 'timeline.toggle-recording'),
          veImpression('Action', 'timeline.record-reload'),
          veImpression('Action', 'timeline.clear'),
          veImpression('Action', 'timeline.load-from-file'),
          veImpression('DropDown', 'timeline.save-to-file-more-options'),
          veImpression('DropDown', 'history'),
          veImpression('Toggle', 'timeline-show-screenshots'),
          veImpression('Toggle', 'timeline-show-memory'),
          veImpression('Action', 'components.collect-garbage'),
        ]),
    veImpression('Action', 'timeline.toggle-recording'),
    veImpression('Action', 'timeline.record-reload'),
    ...(options?.timelineLegacyLandingPage ?
            [veImpression('Link', 'learn-more')] :
            [veImpression('DropDown', 'cpu-throttling'), veImpression('DropDown', 'network-conditions')]),
  ]);
}

function veImpressionForStatusDialog() {
  return veImpression(
      'Dialog', 'timeline-status',
      [veImpression('Action', 'timeline.download-after-error'), veImpression('Action', 'timeline.stop-recording')]);
}
