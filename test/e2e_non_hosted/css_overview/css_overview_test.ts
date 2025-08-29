// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {navigateToCssOverviewTab, startCaptureCSSOverview} from '../../e2e/helpers/css-overview-helpers.js';

const CONTRAST_BUTTON_SELECTOR = '[data-type="contrast"]';
const CONTRAST_ISSUE_IN_GRID_SELECTOR = '.contrast-container-in-grid';
const OVERVIEW_SUMMARY_SIDEBAR_ITEM_SELECTOR = 'div[data-id="summary"]';
const COLORS_SIDEBAR_ITEM_SELECTOR = 'div[data-id="colors"]';
const FONT_INFO_SIDEBAR_ITEM_SELECTOR = 'div[data-id="font-info"]';

describe('CSS overview experiment', () => {
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
