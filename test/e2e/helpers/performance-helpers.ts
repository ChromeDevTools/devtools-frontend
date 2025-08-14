// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';
import {waitForMany} from '../../shared/helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

import {openCommandMenu} from './quick_open-helpers.js';
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

export async function navigateToPerformanceTab(
    testResource?: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage: InspectedPage = getBrowserAndPagesWrappers().inspectedPage) {
  await devToolsPage.evaluate(() => {
    // Prevent the Performance panel shortcuts dialog, that is automatically shown the first
    // time the performance panel is opened, from opening in tests.
    localStorage.setItem('hide-shortcuts-dialog-for-test', 'true');
    // Disable the auto showing of the RPP sidebar. This only
    // happens on the first time the user should see the
    // sidebar, so it makes tests have to check if it's open or
    // not. Instead, let's just disable any auto-show in tests.
    localStorage.setItem('disable-auto-show-rpp-sidebar-for-test', 'true');
  });

  if (testResource) {
    await inspectedPage.goToResource(`performance/${testResource}.html`);
  }

  // Open the tab.
  await openCommandMenu(devToolsPage);
  await devToolsPage.typeText('Performance');
  await devToolsPage.page.keyboard.press('Enter');

  // Make sure the landing page is shown.
  await devToolsPage.waitFor('.timeline-landing-page');
}

export async function openCaptureSettings(
    sectionClassName: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const captureSettingsButton = await devToolsPage.waitForAria('Capture settings');
  await captureSettingsButton.click();
  await devToolsPage.waitFor(sectionClassName);
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
              veImpression('DropDown', 'active-network-condition-key'),
              veImpression('Toggle', 'timeline-show-extension-data'),
            ]),
      ],
      'Panel: timeline', devToolsPage);
}

export async function searchForComponent(
    searchEntry: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitFor('devtools-performance-timeline-summary');
  await devToolsPage.summonSearchBox();
  await devToolsPage.waitFor('.search-bar');
  await devToolsPage.page.keyboard.type(searchEntry);
  await devToolsPage.timeout(300);
  await devToolsPage.page.keyboard.press('Tab');
  await devToolsPage.timeout(300);
  await expectVeEvents(
      [
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
      ],
      undefined, devToolsPage);
}

export async function navigateToBottomUpTab(
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage, veLinkContext: string) {
  await devToolsPage.click(BOTTOM_UP_SELECTOR);
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
                          veImpression('TableCell', 'activity', [veImpression('Link', veLinkContext)]),
                        ]),
                  ]),
            ]),

      ],
      'Panel: timeline', devToolsPage);
}

export async function navigateToCallTreeTab(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(CALL_TREE_SELECTOR);
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
      'Panel: timeline', devToolsPage);
}

export async function setFilter(
    filter: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const filterBoxElement = await devToolsPage.click(FILTER_TEXTBOX_SELECTOR);
  await filterBoxElement.type(filter);
  await expectVeEvents(
      [veChange(''), veImpression('Action', 'clear')],
      'Panel: timeline > Section: timeline.flame-chart-view > Pane: bottom-up > Toolbar > TextField: filter',
      devToolsPage);
}

export async function toggleCaseSensitive(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const matchCaseButton = await devToolsPage.waitForAria('Match case');
  await matchCaseButton.click();
  await expectVeEvents(
      [veClick(
          'Panel: timeline > Section: timeline.flame-chart-view > Pane: bottom-up > Toolbar > Toggle: match-case')],
      undefined, devToolsPage);
}

export async function toggleRegExButtonBottomUp(
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const regexButton = await devToolsPage.waitFor('[aria-label="Use regular expression"]');
  await regexButton.click();
  await expectVeEvents(
      [
        veClick(
            'Panel: timeline > Section: timeline.flame-chart-view > Pane: bottom-up > Toolbar > Toggle: regular-expression')
      ],
      undefined, devToolsPage);
}

export async function toggleMatchWholeWordButtonBottomUp(
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const wholeWordButton = await devToolsPage.waitForAria('Match whole word');
  await wholeWordButton.click();
  await expectVeEvents(
      [veClick(
          'Panel: timeline > Section: timeline.flame-chart-view > Pane: bottom-up > Toolbar > Toggle: match-whole-word')],
      undefined, devToolsPage);
}

export async function startRecording(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(RECORD_BUTTON_SELECTOR);

  // Wait for the button to turn to its stop state.
  await devToolsPage.waitFor(STOP_BUTTON_SELECTOR);
  await expectVeEvents(
      [veClick('Toolbar > Toggle: timeline.toggle-recording'), veImpressionForStatusDialog()], 'Panel: timeline',
      devToolsPage);
}

/**
 * Increases the timeout for the tests in the given context.
 * Useful for performance as tests that import or record a trace often get over the default timeout on slower bots.
 * Note that in e2e_non_hosted this can only be used on a `describe`, not an
 * `it`, hence why the type of the argument is `Mocha.Suite`
 */
export function increaseTimeoutForPerfPanel(context: Mocha.Suite): void {
  // If the timeout is 0, then we are in debug mode, and don't want to override
  // that.
  if (context.timeout()) {
    context.timeout(30_000);
  }
}

export async function reloadAndRecord(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(RELOAD_AND_RECORD_BUTTON_SELECTOR);
  // Make sure the timeline details panel appears. It's a sure way to assert
  // that a recording is actually displayed as some of the other elements in
  // the timeline remain in the DOM even after the recording has been cleared.
  await devToolsPage.waitFor('devtools-performance-timeline-summary');
  await expectVeEvents(
      [veClick('Toolbar > Action: timeline.record-reload'), veImpressionForStatusDialog()], 'Panel: timeline',
      devToolsPage);
}

export async function stopRecording(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(STOP_BUTTON_SELECTOR);

  // Make sure the timeline details panel appears. It's a sure way to assert
  // that a recording is actually displayed as some of the other elements in
  // the timeline remain in the DOM even after the recording has been cleared.
  await devToolsPage.waitFor('devtools-performance-timeline-summary');
  await expectVeEvents(
      [
        veClick('Toolbar > Toggle: timeline.toggle-recording'),
        veResize('Dialog: timeline-status'),
      ],
      'Panel: timeline', devToolsPage);
}

export async function getTotalTimeFromSummary(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<number> {
  const minCategories = 2;
  const categoryValues = await devToolsPage.waitForMany('.category-value', minCategories);

  const totalVal = categoryValues[categoryValues.length - 1];
  const totalText = await totalVal.evaluate(node => node.textContent as string);
  return parseInt(totalText, 10);
}

export async function getTotalTimeFromPie(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<number> {
  const pieChartTotal = await devToolsPage.waitFor('.pie-chart-total');
  const totalText = await pieChartTotal.evaluate(node => node.textContent as string);
  return parseInt(totalText, 10);
}

export async function getRenderingTimeFromSummary(): Promise<[number, string]> {
  const categoryValues = await waitForMany('.category-value', 6);
  const categoryNames = await waitForMany('.category-name', 6);

  // update the index if the rendering time is showing in a different row
  const categoryName = await categoryNames[1].evaluate(node => node.textContent as string);
  const categoryValue = await categoryValues[1].evaluate(node => node.textContent as string);

  return [parseInt(categoryValue, 10), categoryName];
}

export async function retrieveSelectedAndExpandedActivityItems(frontend: puppeteer.Page) {
  const treeItems = await frontend.$$('.expanded > td.activity-column,.selected > td.activity-column');
  const tree = [];
  for (const item of treeItems) {
    tree.push(await frontend.evaluate(el => el.innerText.split('\n')[0], item));
  }

  return tree;
}

export async function navigateToSelectorStatsTab(
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(SELECTOR_STATS_SELECTOR);
  await devToolsPage.waitFor('#tab-selector-stats.selected');
  await expectVeEvents(
      [
        veClick('Toolbar: sidebar > PanelTabHeader: selector-stats'),
        veImpression(
            'Pane', 'selector-stats',
            [
              veImpression('TableHeader', 'elapsed-us'),
              veImpression('TableHeader', 'match-attempts'),
              veImpression('TableHeader', 'match-count'),
              veImpression('TableHeader', 'reject-percentage'),
              veImpression('TableHeader', 'selector'),
              veImpression('TableHeader', 'style-sheet-id'),
              veImpression('TableHeader', 'invalidation-count'),
              veImpression('TableRow', undefined, [veImpression('TableCell', 'elapsed-us')]),
            ]),
      ],
      'Panel: timeline > Section: timeline.flame-chart-view', devToolsPage);
}

export async function selectRecalculateStylesEvent(
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await searchForComponent(RECALCULATE_STYLE_TITLE, devToolsPage);
  const title = await devToolsPage.$('.timeline-details-chip-title');
  if (!title) {
    return false;
  }
  const titleText = await title.evaluate(x => x.textContent);
  return titleText === RECALCULATE_STYLE_TITLE;
}

export async function enableCSSSelectorStats(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const timelineSettingsPane = await devToolsPage.waitFor(TIMELINE_SETTINGS_PANE);
  if (await timelineSettingsPane.isHidden()) {
    await openCaptureSettings(TIMELINE_SETTINGS_PANE, devToolsPage);
  }

  // Wait for the checkbox to load
  const toggle = await devToolsPage.waitForElementWithTextContent(CSS_SELECTOR_STATS_TITLE) as
      puppeteer.ElementHandle<HTMLInputElement>;
  await devToolsPage.waitForFunction(() => toggle.evaluate(e => {
    if (e.disabled) {
      return false;
    }
    if (!e.checked) {
      e.click();
    }
    return true;
  }));
  await expectVeEvents(
      [veChange('Panel: timeline > Pane: timeline-settings-pane > Toggle: timeline-capture-selector-stats')], undefined,
      devToolsPage);
}

export function veImpressionForPerformancePanel() {
  return veImpression('Panel', 'timeline', [
    veImpression(
        'Toolbar', undefined,
        [
          veImpression('Toggle', 'timeline.toggle-recording'),
          veImpression('Action', 'timeline.record-reload'),
          veImpression('Action', 'timeline.clear'),
          veImpression('Action', 'timeline.load-from-file'),
          veImpression('DropDown', 'history'),
          veImpression('Toggle', 'timeline-show-screenshots'),
          veImpression('Toggle', 'timeline-show-memory'),
          veImpression('Action', 'components.collect-garbage'),
        ]),
    veImpression('Action', 'timeline.toggle-recording'),
    veImpression('Action', 'timeline.record-reload'),
    veImpression('DropDown', 'cpu-throttling'),
    veImpression('DropDown', 'network-conditions'),
  ]);
}

function veImpressionForStatusDialog() {
  return veImpression('Dialog', 'timeline-status');
}
