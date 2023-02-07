// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$$, click, getBrowserAndPages, goToResource, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToCssOverviewTab, startCaptureCSSOverview} from '../helpers/css-overview-helpers.js';

const CONTRAST_BUTTON_SELECTOR = '[data-type="contrast"]';
const CONTRAST_ISSUE_IN_GRID_SELECTOR = '.contrast-container-in-grid';
const OVERVIEW_SUMMARY_SIDEBAR_ITEM_SELECTOR = 'div[data-id="summary"]';
const COLORS_SIDEBAR_ITEM_SELECTOR = 'div[data-id="colors"]';

describe('CSS Overview experiment', async () => {
  it('can display low contrast issues', async () => {
    await goToResource('elements/low-contrast.html');
    await navigateToCssOverviewTab();
    await startCaptureCSSOverview();
    await waitFor(CONTRAST_BUTTON_SELECTOR);
    const contrastButtons = await $$(CONTRAST_BUTTON_SELECTOR);
    assert.strictEqual(2, contrastButtons.length, 'Wrong number of contrast issues found in CSS Overview');
    const firstIssue = contrastButtons[0];
    await firstIssue.click();
    const gridContainer = await waitFor(CONTRAST_ISSUE_IN_GRID_SELECTOR);
    const text = await gridContainer.evaluate(el => (el as HTMLElement).innerText);
    assert.strictEqual(text.replace(/\n/gmi, ' '), 'Aa 1 AA AAA');
  });

  it('can navigate sidebar panel through keyboard', async () => {
    await goToResource('elements/low-contrast.html');
    await navigateToCssOverviewTab();
    await startCaptureCSSOverview();
    const {frontend} = getBrowserAndPages();
    await click(OVERVIEW_SUMMARY_SIDEBAR_ITEM_SELECTOR);
    await frontend.keyboard.press('Tab');
    await frontend.keyboard.press('Enter');
    const colorsSidebarItem = await waitFor(COLORS_SIDEBAR_ITEM_SELECTOR);
    const isSelected = await colorsSidebarItem?.evaluate(e => e.classList.contains('selected'));
    assert.isTrue(isSelected);
  });
});
