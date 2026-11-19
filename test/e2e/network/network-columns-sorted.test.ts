// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  getAllRequestNames,
  navigateToNetworkTab,
  setCacheDisabled,
  setInvert,
  setKeepLog,
  setTextFilter,
  waitForSomeRequestsToAppear,
} from '../helpers/network-helpers.js';

describe('The Network Tab', () => {
  it('can sort network columns', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab(devToolsPage, inspectedPage, 'hello.html');
    await waitForSomeRequestsToAppear(devToolsPage, 1);
    await setCacheDisabled(devToolsPage, false);
    await setKeepLog(devToolsPage, false);
    await setTextFilter(devToolsPage, 'favicon.ico');
    await setInvert(devToolsPage, true);

    await devToolsPage.click('[aria-label="Clear network log"]');
    await devToolsPage.waitForNone('.data-grid-data-grid-node > .name-column');

    await inspectedPage.evaluate(async () => {
      await fetch('/test/e2e/resources/network/style.css');
      await fetch('/test/e2e/resources/network/memory-cached-resource/abe.png');
      // Fetch abe.png a second time sequentially so the cached response is also logged.
      await fetch('/test/e2e/resources/network/memory-cached-resource/abe.png');
      await fetch('/test/e2e/resources/network/missing/foo.bar');
    });

    await waitForSomeRequestsToAppear(devToolsPage, 4);
    assert.deepEqual(await getAllRequestNames(devToolsPage), ['style.css', 'abe.png', 'abe.png', 'foo.bar']);

    await devToolsPage.click('.network-log-grid thead th.name-column');
    await devToolsPage.waitFor('.network-log-grid thead th.name-column.sort-ascending');
    await devToolsPage.waitForFunction(async () => {
      const names = await getAllRequestNames(devToolsPage);
      return names.length === 4 && names[0] === 'abe.png';
    });
    assert.deepEqual(await getAllRequestNames(devToolsPage), ['abe.png', 'abe.png', 'foo.bar', 'style.css']);

    await devToolsPage.click('.network-log-grid thead th.name-column');
    await devToolsPage.waitFor('.network-log-grid thead th.name-column.sort-descending');
    await devToolsPage.waitForFunction(async () => {
      const names = await getAllRequestNames(devToolsPage);
      return names.length === 4 && names[0] === 'style.css';
    });
    assert.deepEqual(await getAllRequestNames(devToolsPage), ['style.css', 'foo.bar', 'abe.png', 'abe.png']);
  });
});
