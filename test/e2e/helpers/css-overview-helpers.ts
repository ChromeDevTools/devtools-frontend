// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

import {openPanelViaMoreTools} from './settings-helpers.js';
import {expectVeEvents, veClick, veImpression, veImpressionsUnder} from './visual-logging-helpers.js';

const CSS_OVERVIEW_PANEL_CONTENT = '.view-container[aria-label="CSS overview panel"]';
const CSS_OVERVIEW_TAB_SELECTOR = '#tab-cssoverview';
const CSS_OVERVIEW_PANEL_TITLE = 'CSS overview';
const CSS_OVERVIEW_CAPTURE_BUTTON_SELECTOR = '.start-capture';
const CSS_OVERVIEW_COMPLETED_VIEW_SELECTOR = '.overview-completed-view';

export async function cssOverviewTabDoesNotExist(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitForNone(CSS_OVERVIEW_TAB_SELECTOR);
}

export async function navigateToCssOverviewTab(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const cssOverviewTab = await devToolsPage.$(CSS_OVERVIEW_TAB_SELECTOR);
  if (!cssOverviewTab) {
    await openCSSOverviewPanelFromMoreTools(devToolsPage);
  } else {
    await devToolsPage.click(CSS_OVERVIEW_TAB_SELECTOR);
    await cssOverviewPanelContentIsLoaded(devToolsPage);
  }
}

export async function openCSSOverviewPanelFromMoreTools(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await openPanelViaMoreTools(CSS_OVERVIEW_PANEL_TITLE, devToolsPage);
  await cssOverviewTabExists(devToolsPage);
  await cssOverviewPanelContentIsLoaded(devToolsPage);
}

export async function cssOverviewTabExists(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitFor(CSS_OVERVIEW_TAB_SELECTOR);
}

export async function cssOverviewPanelContentIsLoaded(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
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

export async function startCaptureCSSOverview(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
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
