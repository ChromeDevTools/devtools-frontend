// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getBrowserAndPages, resourcesPath, waitFor} from '../../shared/helper.js';
import {getCurrentUrl} from '../helpers/layers-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('The Layers Panel', async () => {
  it('should keep the currently inspected url as an attribute', async () => {
    const {target} = getBrowserAndPages();
    const targetUrl = `${resourcesPath}/layers/default.html`;
    await target.goto(targetUrl);

    await openPanelViaMoreTools('Layers');

    const url = await getCurrentUrl();
    assert.equal(url, targetUrl);
  });

  it('[crbug.com/1053901] should update the layers view when going offline', async () => {
    const {target} = getBrowserAndPages();
    await openPanelViaMoreTools('Layers');

    const targetUrl = `${resourcesPath}/layers/default.html`;
    await target.goto(targetUrl);
    await waitFor('[aria-label="layers"]:not([test-current-url=""])');
    assert.equal(await getCurrentUrl(), targetUrl);

    const session = await target.target().createCDPSession();
    await session.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    await target.reload();
    await waitFor(`[aria-label="layers"]:not([test-current-url="${targetUrl}"])`);
    assert.equal(await getCurrentUrl(), 'chrome-error://chromewebdata/');
  });
});
