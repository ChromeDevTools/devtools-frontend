// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'path';

import {getBrowserAndPages} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  clickStartButton,
  navigateToLighthouseTab,
  selectCategories,
  waitForResult,
} from '../helpers/lighthouse-helpers.js';

// This test will fail (by default) in headful mode, as the target page never gets painted.
// To resolve this when debugging, just make sure the target page is visible during the lighthouse run.

describe('request blocking', async function() {
  // The tests in this suite are particularly slow
  this.timeout(60_000);

  // Start blocking *.css
  // Ideally this would be done with UI manipulation, but it'd be less reliable AND
  // the designated tests in network-request-blocking-panel_test.ts are skipped by default due to flakiness.
  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluate(() => {
      // @ts-ignore layout test global
      const networkManager = self.SDK.multitargetNetworkManager;
      networkManager.setBlockingEnabled(true);
      networkManager.setBlockedPatterns([{enabled: true, url: '*.css'}]);
    });
  });

  // Reset request blocking state
  afterEach(async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluate(() => {
      // @ts-ignore layout test global
      const networkManager = globalThis.SDK.multitargetNetworkManager;
      networkManager.setBlockingEnabled(false);
      networkManager.setBlockedPatterns([]);
    });
  });

  it('is respected during a lighthouse run', async () => {
    await navigateToLighthouseTab('lighthouse/hello.html');

    await selectCategories(['performance']);

    await clickStartButton();

    const {lhr} = await waitForResult();

    const requests = lhr.audits['network-requests'].details.items;

    const trimmedRequests = requests.map((item: Record<string, unknown>) => {
      return {
        url: typeof item.url === 'string' && path.basename(item.url),
        statusCode: item.statusCode,
      };
    });
    assert.deepEqual(trimmedRequests, [
      {url: 'hello.html', statusCode: 200},
      {url: 'basic.css', statusCode: -1},  // statuCode === -1 means the request failed
    ]);
  });
});
