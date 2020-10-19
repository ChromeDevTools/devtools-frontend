// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, getHostedModeServerPort, goToResource, pressKey, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {doubleClickSourceTreeItem, getReportValues, navigateToApplicationTab} from '../helpers/application-helpers.js';

const TOP_FRAME_SELECTOR = '[aria-label="top"]';
const WORKERS_SELECTOR = '[aria-label="Workers"]';

describe('The Application Tab', async () => {
  it('shows details for a frame when clicked on in the frame tree', async () => {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'frame-tree');
    await click('#tab-resources');
    await doubleClickSourceTreeItem(TOP_FRAME_SELECTOR);

    await waitForFunction(async () => {
      const fieldValues = await getReportValues();
      const expected = [
        `http://localhost:${getHostedModeServerPort()}/test/e2e/resources/application/frame-tree.html`,
        '',
        `http://localhost:${getHostedModeServerPort()}`,
        '<#document>',
        '',
        'YesLocalhost is always a secure context',
        'No',
        'None',
        'UnsafeNone',
      ];
      return JSON.stringify(fieldValues) === JSON.stringify(expected);
    });
  });

  it('shows dedicated worker in the frame tree', async () => {
    const {target} = getBrowserAndPages();
    await goToResource('application/frame-tree.html');
    await click('#tab-resources');
    await doubleClickSourceTreeItem(TOP_FRAME_SELECTOR);
    // DevTools is not ready yet when the worker is being initially attached.
    // We therefore need to reload the page to see the worker in DevTools.
    await target.reload();
    await doubleClickSourceTreeItem(WORKERS_SELECTOR);
    await waitFor(`${WORKERS_SELECTOR} + ol li:first-child`);
    pressKey('ArrowDown');

    await waitForFunction(async () => {
      const fieldValues = await getReportValues();
      const expected =
          [`http://localhost:${getHostedModeServerPort()}/test/e2e/resources/application/dedicated-worker.js`];
      return JSON.stringify(fieldValues) === JSON.stringify(expected);
    });
  });
});
