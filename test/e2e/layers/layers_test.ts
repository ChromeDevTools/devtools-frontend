// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  getBrowserAndPages,
  getResourcesPath,
  goToResource,
  raf,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getCurrentUrl} from '../helpers/layers-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('The Layers Panel', async () => {
  // See crbug.com/1261763 for details.
  it.skip('[crbug.com/1261763] should keep the currently inspected url as an attribute', async () => {
    const {target, frontend} = getBrowserAndPages();

    const targetUrl = 'layers/default.html';
    await target.bringToFront();
    await goToResource(targetUrl);

    await frontend.bringToFront();
    await openPanelViaMoreTools('Layers');
    await target.bringToFront();
    await raf(target);
    await frontend.bringToFront();

    await waitFor('[aria-label="layers"]:not([test-current-url=""])');

    await waitForFunction(async () => {
      return await getCurrentUrl() === `${getResourcesPath()}/${targetUrl}`;
    });
  });

  it('should update the layers view when going offline', async () => {
    // neterror.js started serving sourcemaps and we're requesting it unnecessarily.
    expectError('Request Network.loadNetworkResource failed. {"code":-32602,"message":"Unsupported URL scheme"}');
    expectError(
        'Fetch API cannot load chrome-error://chromewebdata/neterror.rollup.js.map. URL scheme "chrome-error" is not supported.');
    const {target, frontend} = getBrowserAndPages();
    await openPanelViaMoreTools('Layers');

    const targetUrl = 'layers/default.html';
    await goToResource(targetUrl, {waitUntil: 'networkidle0'});
    await target.bringToFront();
    await raf(target);
    await frontend.bringToFront();
    await waitFor('[aria-label="layers"]:not([test-current-url=""])');
    assert.strictEqual(await getCurrentUrl(), `${getResourcesPath()}/${targetUrl}`);

    const session = await target.target().createCDPSession();
    await session.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    await target.reload({waitUntil: 'networkidle0'});
    await target.bringToFront();
    await raf(target);
    await frontend.bringToFront();
    await waitFor(`[aria-label="layers"]:not([test-current-url="${targetUrl}"])`);
    await waitForFunction(async () => {
      return (await getCurrentUrl()) === 'chrome-error://chromewebdata/';
    });
    await session.detach();
  });
});
