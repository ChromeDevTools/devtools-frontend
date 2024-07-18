// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {$, click, waitFor, waitForNone} from '../../shared/helper.js';

import {openPanelViaMoreTools} from './settings-helpers.js';
import {expectVeEvents, veClick, veImpression, veImpressionsUnder} from './visual-logging-helpers.js';

const CSS_OVERVIEW_PANEL_CONTENT = '.view-container[aria-label="CSS overview panel"]';
const CSS_OVERVIEW_TAB_SELECTOR = '#tab-cssoverview';
const CSS_OVERVIEW_PANEL_TITLE = 'CSS overview';
const CSS_OVERVIEW_CAPTURE_BUTTON_SELECTOR = '.start-capture';
const CSS_OVERVIEW_COMPLETED_VIEW_SELECTOR = '.overview-completed-view';

export async function navigateToCssOverviewTab() {
  const cssOverviewTab = await $(CSS_OVERVIEW_TAB_SELECTOR);
  if (!cssOverviewTab) {
    await openCSSOverviewPanelFromMoreTools();
  } else {
    await click(CSS_OVERVIEW_TAB_SELECTOR);
    await cssOverviewPanelContentIsLoaded();
  }
}

export async function cssOverviewTabExists() {
  await waitFor(CSS_OVERVIEW_TAB_SELECTOR);
}

export async function cssOverviewTabDoesNotExist() {
  await waitForNone(CSS_OVERVIEW_TAB_SELECTOR);
}

export async function cssOverviewPanelContentIsLoaded() {
  await waitFor(CSS_OVERVIEW_PANEL_CONTENT);
  await expectVeEvents([veImpressionForCssOverviewPanel()]);
}

export async function openCSSOverviewPanelFromMoreTools() {
  await openPanelViaMoreTools(CSS_OVERVIEW_PANEL_TITLE);
  await cssOverviewTabExists();
  await cssOverviewPanelContentIsLoaded();
}

export async function startCaptureCSSOverview() {
  await click(CSS_OVERVIEW_CAPTURE_BUTTON_SELECTOR);
  await waitFor(CSS_OVERVIEW_COMPLETED_VIEW_SELECTOR);
  await expectVeEvents([
    veClick('Panel: css-overview > Action: css-overview.capture-overview'),
    veImpressionsUnder(
        'Panel: css-overview',
        [
          veImpression('Action', 'css-overview.clear-overview'),
          veImpression('Action', 'css-overview.color'),
          veImpression('Action', 'css-overview.contrast'),
          veImpression('Item', 'css-overview.colors'),
          veImpression('Item', 'css-overview.font-info'),
          veImpression('Item', 'css-overview.media-queries'),
          veImpression('Item', 'css-overview.summary'),
          veImpression('Item', 'css-overview.unused-declarations'),
        ]),
  ]);
}

function veImpressionForCssOverviewPanel() {
  return veImpressionsUnder('Panel: css-overview', [
    veImpression('Action', 'css-overview.capture-overview'),
    veImpression('Action', 'feedback'),
    veImpression('Link', 'css-overview.quick-start'),
    veImpression('Link', 'feedback'),
  ]);
}
