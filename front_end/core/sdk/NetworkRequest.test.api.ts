// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, type InspectedPage, it} from '../../../test/api/mocha-interface.js';
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

async function fetchAndWaitForFinished(
    networkManager: SDK.NetworkManager.NetworkManager,
    inspectedPage: InspectedPage,
    url: string,
    urlPattern: RegExp,
    ): Promise<SDK.NetworkRequest.NetworkRequest> {
  const waiter = waitForRequestFinished(networkManager, urlPattern);
  try {
    const [request] = await Promise.all([
      waiter.promise,
      inspectedPage.evaluate(
          async targetUrl => {
            await fetch(targetUrl).then(response => response.text());
          },
          url),
    ]);
    return request;
  } finally {
    waiter.dispose();
  }
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

  it('tracks timing, latency, and duration for delayed responses', async ({inspectedPage, universe}) => {
    const timerThreshold = 15;
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.exists(primaryTarget);
    const networkManager = primaryTarget.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);

    // Ensure Network.enable has settled on primaryTarget before fetching on
    // inspectedPage's separate CDP session.
    await primaryTarget.networkAgent().invoke_setCacheDisabled({cacheDisabled: false});

    const resourcesPath = inspectedPage.getResourcesPath();
    const request1Url =
        `${resourcesPath}/network/search-result-1.js?waitBeforeHeaders=100&waitBetweenChunks=100&numChunks=2`;
    const request2Url = `${resourcesPath}/network/search-result-1.js?waitBeforeHeaders=100`;

    const request1 = await fetchAndWaitForFinished(
        networkManager,
        inspectedPage,
        request1Url,
        /search-result-1\.js\?waitBeforeHeaders=100&waitBetweenChunks=100&numChunks=2$/,
    );
    assert.strictEqual(request1.url(), request1Url);
    assert.strictEqual(request1.statusCode, 200);
    assert.isAtLeast(request1.latency * 1000, 100 - timerThreshold);
    assert.isAtLeast(request1.duration * 1000, 300 - timerThreshold);
    assert.isAbove(request1.startTime, 0);
    assert.isAtLeast(request1.responseReceivedTime, request1.startTime);
    assert.isAbove(request1.endTime, request1.responseReceivedTime);
    assert.exists(request1.timing);
    assert.isAbove(request1.timing.requestTime, 0);
    assert.isAtLeast(request1.timing.sendEnd, request1.timing.sendStart);
    assert.isAtLeast(request1.timing.receiveHeadersStart, request1.timing.sendEnd);
    assert.isAtLeast(request1.timing.receiveHeadersEnd, request1.timing.receiveHeadersStart);
    assert.isAbove(request1.duration * 1000, request1.timing.receiveHeadersEnd);

    const request2 = await fetchAndWaitForFinished(
        networkManager,
        inspectedPage,
        request2Url,
        /search-result-1\.js\?waitBeforeHeaders=100$/,
    );
    assert.strictEqual(request2.url(), request2Url);
    assert.strictEqual(request2.statusCode, 200);
    assert.isAtLeast(request2.latency * 1000, 100 - timerThreshold);
    assert.isAtLeast(request2.duration * 1000, 100 - timerThreshold);
    assert.isAbove(request2.startTime, 0);
    assert.isAtLeast(request2.responseReceivedTime, request2.startTime);
    assert.isAtLeast(request2.endTime, request2.responseReceivedTime);
    assert.exists(request2.timing);
    assert.isAbove(request2.timing.requestTime, 0);
    assert.isAtLeast(request2.timing.sendEnd, request2.timing.sendStart);
    assert.isAtLeast(request2.timing.receiveHeadersStart, request2.timing.sendEnd);
    assert.isAtLeast(request2.timing.receiveHeadersEnd, request2.timing.receiveHeadersStart);
  });
});
