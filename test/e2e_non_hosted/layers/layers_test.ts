// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';

describe('The Layers Panel', function() {
  async function getCurrentUrl(devToolsPage: DevToolsPage) {
    await devToolsPage.waitFor('[aria-label="layers"]');
    const element = await devToolsPage.waitFor('[aria-label="layers"]');
    return await element.evaluate(e => e.getAttribute('test-current-url'));
  }

  it('should keep the currently inspected url as an attribute', async ({devToolsPage, inspectedPage}) => {
    const targetUrl = 'layers/default.html';
    await inspectedPage.bringToFront();
    await inspectedPage.goToResource(targetUrl);

    await devToolsPage.bringToFront();
    await openPanelViaMoreTools('Layers', devToolsPage);
    await inspectedPage.bringToFront();
    await inspectedPage.raf();
    await devToolsPage.bringToFront();

    await devToolsPage.waitFor('[aria-label="layers"]:not([test-current-url=""])');

    await devToolsPage.waitForFunction(async () => {
      return await getCurrentUrl(devToolsPage) === `${inspectedPage.getResourcesPath()}/${targetUrl}`;
    });
  });

  it('should update the layers view when going offline', async ({devToolsPage, inspectedPage}) => {
    await openPanelViaMoreTools('Layers', devToolsPage);

    const targetUrl = 'layers/default.html';
    await inspectedPage.goToResource(targetUrl, {waitUntil: 'networkidle0'});
    await devToolsPage.bringToFront();
    await devToolsPage.raf();
    await inspectedPage.bringToFront();
    await devToolsPage.waitFor('[aria-label="layers"]:not([test-current-url=""])');
    assert.strictEqual(await getCurrentUrl(devToolsPage), `${inspectedPage.getResourcesPath()}/${targetUrl}`);

    const session = await inspectedPage.page.createCDPSession();
    try {
      await session.send('Network.emulateNetworkConditions', {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      });
      await inspectedPage.page.reload({waitUntil: 'networkidle0'});
      await devToolsPage.bringToFront();
      await devToolsPage.raf();
      await inspectedPage.bringToFront();
      await devToolsPage.waitFor(`[aria-label="layers"]:not([test-current-url="${targetUrl}"])`);
      await devToolsPage.waitForFunction(async () => {
        return (await getCurrentUrl(devToolsPage)) === 'chrome-error://chromewebdata/';
      });
    } finally {
      await session.detach();
    }
  });
});
