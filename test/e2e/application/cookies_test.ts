// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, getHostedModeServerPort, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {doubleClickSourceTreeItem, getDataGridData, navigateToApplicationTab} from '../helpers/application-helpers.js';

const COOKIES_SELECTOR = '[aria-label="Cookies"]';
let DOMAIN_SELECTOR: string;

describe('The Application Tab', async () => {
  before(async () => {
    DOMAIN_SELECTOR = `${COOKIES_SELECTOR} + ol > [aria-label="http://localhost:${getHostedModeServerPort()}"]`;
  });

  afterEach(async () => {
    const {target} = getBrowserAndPages();
    await target.deleteCookie({name: 'foo'});
  });

  it('[crbug.com/1047348] shows cookies even when navigating to an unreachable page', async () => {
    const {target} = getBrowserAndPages();
    // This sets a new cookie foo=bar
    await navigateToApplicationTab(target, 'cookies');

    await goToResource('network/unreachable.rawresponse');

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    await waitForFunction(async () => {
      const dataGridRowValues = await getDataGridData('.storage-view table', ['name', 'value']);
      const expected = [{name: 'foo', value: 'bar'}, {name: '', value: ''}];
      return JSON.stringify(dataGridRowValues) === JSON.stringify(expected);
    });
  });

  it('[crbug.com/462370] shows a preview of the cookie value', async () => {
    const {target} = getBrowserAndPages();
    // This sets a new cookie foo=bar
    await navigateToApplicationTab(target, 'cookies');

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    await waitFor('.cookies-table .data-grid-data-grid-node');
    await click('.cookies-table .data-grid-data-grid-node');

    await waitForFunction(async () => {
      const previewValueNode = await waitFor('.cookie-value');
      const previewValue = await previewValueNode.evaluate(e => e.textContent);
      return previewValue === 'bar';
    });
  });

  it('[crbug.com/1086462] clears the preview value when clearing cookies', async () => {
    const {target} = getBrowserAndPages();
    // This sets a new cookie foo=bar
    await navigateToApplicationTab(target, 'cookies');

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    await waitFor('.cookies-table .data-grid-data-grid-node');
    await click('.cookies-table .data-grid-data-grid-node');

    // Select a cookie first
    await waitForFunction(async () => {
      const previewValueNode1 = await waitFor('.cookie-value');
      const previewValue1 = await previewValueNode1.evaluate(e => e.textContent);
      return previewValue1 === 'bar';
    });

    // Clear all cookies
    await waitFor('button[aria-label="Clear All"]');
    await click('button[aria-label="Clear All"]');

    // Make sure that the preview resets
    await waitForFunction(async () => {
      const previewValueNode2 = await waitFor('.cookie-value');
      const previewValue2 = await previewValueNode2.evaluate(e => e.textContent as string);

      return previewValue2.match(/Select a cookie to preview its value/);
    });
  });
});
