// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  increaseTimeoutForPerfPanel,
  navigateToPerformanceTab,
  reloadAndRecord,
} from '../../e2e/helpers/performance-helpers.js';

describe('Revealing insights in RPP', function() {
  setup({dockingMode: 'undocked'});
  increaseTimeoutForPerfPanel(this);

  it('can import a trace and show a list of insights', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab('fake-image-lcp', devToolsPage, inspectedPage);
    await reloadAndRecord(devToolsPage);

    await devToolsPage.click('aria/Show sidebar');
    await devToolsPage.click('aria/View details for LCP breakdown insight.');

    // Ensure that the LCP timespan breakdown is showing.
    await devToolsPage.waitFor('.overlay-type-TIMESPAN_BREAKDOWN');
    // Ensure that the LCP breakdown phases are shown.
    const perfTable = await devToolsPage.waitFor('devtools-performance-table');

    const tableBody = await devToolsPage.waitFor('tbody', perfTable);
    const rowTitles = await tableBody.evaluate(tbody => {
      const headers = tbody.querySelectorAll<HTMLElement>('tr th');
      return [...headers].map(header => header.innerText);
    });
    assert.deepEqual(
        rowTitles, ['Time to first byte', 'Resource load delay', 'Resource load duration', 'Element render delay']);
  });
});
