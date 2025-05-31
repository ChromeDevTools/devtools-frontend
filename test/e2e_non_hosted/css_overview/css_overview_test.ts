// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';
import {expectVeEvents, veClick, veImpression, veImpressionsUnder} from '../../e2e/helpers/visual-logging-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

const CONTRAST_BUTTON_SELECTOR = '[data-type="contrast"]';
const CONTRAST_ISSUE_IN_GRID_SELECTOR = '.contrast-container-in-grid';
const OVERVIEW_SUMMARY_SIDEBAR_ITEM_SELECTOR = 'div[data-id="summary"]';
const COLORS_SIDEBAR_ITEM_SELECTOR = 'div[data-id="colors"]';
const FONT_INFO_SIDEBAR_ITEM_SELECTOR = 'div[data-id="font-info"]';

const CSS_OVERVIEW_TAB_SELECTOR = '#tab-cssoverview';
const CSS_OVERVIEW_PANEL_TITLE = 'CSS overview';
const CSS_OVERVIEW_PANEL_CONTENT = '.view-container[aria-label="CSS overview panel"]';
const CSS_OVERVIEW_CAPTURE_BUTTON_SELECTOR = '.start-capture';
const CSS_OVERVIEW_COMPLETED_VIEW_SELECTOR = '.overview-completed-view';

describe('CSS overview experiment', () => {
  async function navigateToCssOverviewTab(devToolsPage: DevToolsPage) {
    const cssOverviewTab = await devToolsPage.$(CSS_OVERVIEW_TAB_SELECTOR);
    if (!cssOverviewTab) {
      await openCSSOverviewPanelFromMoreTools(devToolsPage);
    } else {
      await devToolsPage.click(CSS_OVERVIEW_TAB_SELECTOR);
      await cssOverviewPanelContentIsLoaded(devToolsPage);
    }
  }

  async function openCSSOverviewPanelFromMoreTools(devToolsPage: DevToolsPage) {
    await openPanelViaMoreTools(CSS_OVERVIEW_PANEL_TITLE, devToolsPage);
    await cssOverviewTabExists(devToolsPage);
    await cssOverviewPanelContentIsLoaded(devToolsPage);
  }

  async function cssOverviewTabExists(devToolsPage: DevToolsPage) {
    await devToolsPage.waitFor(CSS_OVERVIEW_TAB_SELECTOR);
  }

  async function cssOverviewPanelContentIsLoaded(devToolsPage: DevToolsPage) {
    await devToolsPage.waitFor(CSS_OVERVIEW_PANEL_CONTENT);
    await expectVeEvents(
        [veImpressionsUnder(
            'Panel: css-overview',
            [
              veImpression('Action', 'css-overview.capture-overview'),
              veImpression('Action', 'feedback'),
              veImpression('Link', 'css-overview.quick-start'),
              veImpression('Link', 'feedback'),
            ])],
        undefined, devToolsPage);
  }

  async function startCaptureCSSOverview(devToolsPage: DevToolsPage) {
    await devToolsPage.click(CSS_OVERVIEW_CAPTURE_BUTTON_SELECTOR);
    await devToolsPage.waitFor(CSS_OVERVIEW_COMPLETED_VIEW_SELECTOR);
    await devToolsPage.raf();
    await expectVeEvents(
        [
          veClick('Panel: css-overview > Action: css-overview.capture-overview'),
          veImpressionsUnder(
              'Panel: css-overview',
              [
                veImpression('Action', 'css-overview.clear-overview'),
                veImpression('Action', 'css-overview.color'),
                veImpression('Item', 'css-overview.colors'),
                veImpression('Item', 'css-overview.font-info'),
                veImpression('Item', 'css-overview.media-queries'),
                veImpression('Item', 'css-overview.summary'),
                veImpression('Item', 'css-overview.unused-declarations'),
              ]),
        ],
        undefined, devToolsPage);
  }
  it('can display low contrast issues', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/low-contrast.html');
    await navigateToCssOverviewTab(devToolsPage);
    await startCaptureCSSOverview(devToolsPage);
    await devToolsPage.waitFor(CONTRAST_BUTTON_SELECTOR);
    const contrastButtons = await devToolsPage.$$(CONTRAST_BUTTON_SELECTOR);
    assert.lengthOf(contrastButtons, 2, 'Wrong number of contrast issues found in CSS overview');
    const firstIssue = contrastButtons[0];
    await firstIssue.click();
    const gridContainer = await devToolsPage.waitFor(CONTRAST_ISSUE_IN_GRID_SELECTOR);
    const text = (await gridContainer.evaluate(el => (el as HTMLElement).innerText)).replaceAll(/\s+/gm, '');
    assert.strictEqual(text, 'Aa1AAAAA');
  });

  it('can navigate sidebar panel through keyboard tab key', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/low-contrast.html');
    await navigateToCssOverviewTab(devToolsPage);
    await startCaptureCSSOverview(devToolsPage);
    await devToolsPage.click(OVERVIEW_SUMMARY_SIDEBAR_ITEM_SELECTOR);
    await devToolsPage.page.keyboard.press('Tab');
    await devToolsPage.page.keyboard.press('Enter');
    await devToolsPage.waitFor(`${COLORS_SIDEBAR_ITEM_SELECTOR}.selected`);
  });

  it('can navigate sidebar panel through keyboard arrow keys', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/low-contrast.html');
    await navigateToCssOverviewTab(devToolsPage);
    await startCaptureCSSOverview(devToolsPage);
    await devToolsPage.click(OVERVIEW_SUMMARY_SIDEBAR_ITEM_SELECTOR);
    await devToolsPage.page.keyboard.press('ArrowDown');
    await devToolsPage.waitFor(`${COLORS_SIDEBAR_ITEM_SELECTOR}.selected`);
    await devToolsPage.page.keyboard.press('ArrowDown');
    await devToolsPage.waitFor(`${FONT_INFO_SIDEBAR_ITEM_SELECTOR}.selected`);
    await devToolsPage.page.keyboard.press('ArrowUp');
    await devToolsPage.waitFor(`${COLORS_SIDEBAR_ITEM_SELECTOR}.selected`);
  });
});
