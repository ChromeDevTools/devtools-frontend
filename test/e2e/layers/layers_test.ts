// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, getResourcesPath, goToResource, timeout, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getCurrentUrl} from '../helpers/layers-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('The Layers Panel', async () => {
  it('should keep the currently inspected url as an attribute', async () => {
    const targetUrl = 'layers/default.html';
    await goToResource(targetUrl);

    await openPanelViaMoreTools('Layers');

    await waitFor('[aria-label="layers"]:not([test-current-url=""])');

    // FIXME(crbug/1112692): Refactor test to remove the timeout.
    await timeout(50);

    const url = await getCurrentUrl();
    assert.strictEqual(url, `${getResourcesPath()}/${targetUrl}`);
  });

  // Disabled due to flakiness, original regression: crbug.com/1053901
  it.skip('[crbug.com/1111256] should update the layers view when going offline', async () => {
    const {target} = getBrowserAndPages();
    await openPanelViaMoreTools('Layers');

    const targetUrl = 'layers/default.html';
    await goToResource(targetUrl);
    await waitFor('[aria-label="layers"]:not([test-current-url=""])');
    assert.strictEqual(await getCurrentUrl(), `${getResourcesPath()}/${targetUrl}`);

    const session = await target.target().createCDPSession();
    await session.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    await target.reload();
    await waitFor(`[aria-label="layers"]:not([test-current-url="${targetUrl}"])`);
    assert.strictEqual(await getCurrentUrl(), 'chrome-error://chromewebdata/');
  });
});
