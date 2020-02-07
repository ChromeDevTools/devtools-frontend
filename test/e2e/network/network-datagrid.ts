// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as puppeteer from 'puppeteer';

import {click, getBrowserAndPages, resetPages, resourcesPath} from '../../shared/helper.js';

async function navigateToNetworkTab(target: puppeteer.Page, frontend: puppeteer.Page, testName: string) {
  await target.goto(`${resourcesPath}/network/${testName}.html`);
  await click('#tab-network');
  // Make sure the network tab is shown on the screen
  await frontend.waitForSelector('.network-log-grid');
}

describe('The Network Tab', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('shows Last-Modified', async () => {
    const {target, frontend} = getBrowserAndPages();
    await navigateToNetworkTab(target, frontend, 'last-modified');

    // Open the contextmenu for all network column
    await click('.name-column', {clickOptions: {button: 'right'}});

    // Enable the Last-Modified column in the network datagrid
    await click(`[aria-label="Response Headers"]`);
    await click(`[aria-label="Last-Modified, unchecked"]`);

    // Wait for the column to show up
    await frontend.waitForSelector('.last-modified-column');

    const lastModifiedColumnValues = await frontend.evaluate(() => {
      return Array.from(document.querySelectorAll('.last-modified-column')).map(message => message.textContent);
    });

    assert.deepEqual(lastModifiedColumnValues, [
      `Last-Modified`,
      ``,
      `Sun, 26 Sep 2010 22:04:35 GMT`,
    ]);
  });
});
