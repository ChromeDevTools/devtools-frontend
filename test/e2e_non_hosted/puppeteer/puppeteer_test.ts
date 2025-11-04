// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

describe('Puppeteer', () => {
  it('should connect to the browser via DevTools own connection', async ({browser, devToolsPage}) => {
    const version = await browser.browser.version();
    const result = await devToolsPage.evaluate(`(async () => {
      const puppeteer = await import('./third_party/puppeteer/puppeteer.js');
      const SDK = await import('./core/sdk/sdk.js');
      const PuppeteerService = await import('./services/puppeteer/puppeteer.js');

      const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!mainTarget) {
        throw new Error('Could not find main target');
      }
      const childTargetManager = mainTarget.model(SDK.ChildTargetManager.ChildTargetManager);
      const mainTargetId = await childTargetManager.getParentTargetId();
      const {sessionId} = await mainTarget.targetAgent().invoke_attachToTarget({targetId: mainTargetId, flatten: true});

      const {browser} = await PuppeteerService.PuppeteerConnection.PuppeteerConnectionHelper.connectPuppeteerToConnectionViaTab({
        connection: mainTarget.router(),
        targetId: mainTargetId,
        sessionId,
        isPageTargetCallback: (target) => target.targetId === mainTargetId,
      });

      const version = await browser.version();
      browser.disconnect();
      return version;
    })()`);

    assert.deepEqual(version, result);
  });
});
