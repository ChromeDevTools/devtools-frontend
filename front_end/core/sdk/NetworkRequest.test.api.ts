// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';
import type * as Common from '../common/common.js';

import * as SDK from './sdk.js';

function waitForRequestFinished(
    networkManager: SDK.NetworkManager.NetworkManager,
    urlPattern: RegExp,
    ): {promise: Promise<SDK.NetworkRequest.NetworkRequest>, dispose: () => void} {
  let listener: ((event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.NetworkRequest>) => void)|null = null;
  const dispose = () => {
    if (listener) {
      networkManager.removeEventListener(SDK.NetworkManager.Events.RequestFinished, listener);
      listener = null;
    }
  };
  const promise = new Promise<SDK.NetworkRequest.NetworkRequest>(resolve => {
    listener = event => {
      const request = event.data;
      if (urlPattern.test(request.url())) {
        dispose();
        resolve(request);
      }
    };
    networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished, listener);
  });
  return {promise, dispose};
}

describe('NetworkRequest', () => {
  it('correctly reports memory-cached resources', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.exists(primaryTarget);
    const networkManager = primaryTarget.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);

    // Ensure Network.enable has settled on primaryTarget before navigating on
    // inspectedPage's separate CDP session.
    await primaryTarget.networkAgent().invoke_setCacheDisabled({cacheDisabled: false});

    const initialWaiter = waitForRequestFinished(networkManager, /abe\.png$/);
    try {
      const [initialRequest] = await Promise.all([
        initialWaiter.promise,
        inspectedPage.goToResource('network/memory-cached-resource/memory-cached-resource.html'),
      ]);
      assert.strictEqual(initialRequest.statusCode, 200);
    } finally {
      initialWaiter.dispose();
    }

    await primaryTarget.networkAgent().invoke_setCacheDisabled({cacheDisabled: true});
    const uncachedWaiter = waitForRequestFinished(networkManager, /abe\.png$/);
    try {
      const [uncachedRequest] = await Promise.all([
        uncachedWaiter.promise,
        inspectedPage.reload(),
      ]);
      assert.strictEqual(uncachedRequest.statusCode, 200);
      assert.isFalse(uncachedRequest.cached());
      assert.isFalse(uncachedRequest.cachedInMemory());
    } finally {
      uncachedWaiter.dispose();
      await primaryTarget.networkAgent().invoke_setCacheDisabled({cacheDisabled: false});
    }

    const cachedWaiter = waitForRequestFinished(networkManager, /abe\.png$/);
    try {
      const [cachedRequest] = await Promise.all([
        cachedWaiter.promise,
        inspectedPage.evaluate(() => new Promise<void>(resolve => {
                                 const iframe = document.createElement('iframe');
                                 iframe.onload = () => resolve();
                                 iframe.src = 'memory-cached-resource.html';
                                 document.body.appendChild(iframe);
                               })),
      ]);
      assert.strictEqual(cachedRequest.statusCode, 200);
      assert.isTrue(cachedRequest.cached());
      assert.isTrue(cachedRequest.cachedInMemory());
    } finally {
      cachedWaiter.dispose();
    }
  });
});
