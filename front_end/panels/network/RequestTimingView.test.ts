// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import * as RequestTimingView from './RequestTimingView.js';

function createNetworkRequest(
    matchedSource: Protocol.Network.ServiceWorkerRouterSource,
    actualSource: Protocol.Network.ServiceWorkerRouterSource): SDK.NetworkRequest.NetworkRequest {
  const request = SDK.NetworkRequest.NetworkRequest.create(
      'requestId' as Protocol.Network.RequestId, 'http://devtools-frontend.test' as Platform.DevToolsPath.UrlString,
      '' as Platform.DevToolsPath.UrlString, null, null, null);

  request.mimeType = 'application/wasm';
  request.finished = true;
  const timingInfo: Protocol.Network.ResourceTiming = {
    requestTime: 500,
    proxyStart: 0,
    proxyEnd: 0,
    dnsStart: 0,
    dnsEnd: 0,
    connectStart: 0,
    connectEnd: 0,
    sslStart: 0,
    sslEnd: 0,
    workerReady: 400,
    workerStart: 500,
    workerRouterEvaluationStart: -200,
    workerFetchStart: 600,
    workerRespondWithSettled: 700,
    sendStart: 800,
    sendEnd: 900,
    pushStart: 0,
    pushEnd: 0,
    receiveHeadersStart: 1000,
    receiveHeadersEnd: 0,
  };
  if (matchedSource === Protocol.Network.ServiceWorkerRouterSource.Cache) {
    timingInfo.workerCacheLookupStart = -100;
  }

  request.timing = timingInfo;
  request.serviceWorkerRouterInfo = {
    ruleIdMatched: 1,
    matchedSourceType: matchedSource,
    actualSourceType: actualSource,
  };

  return request;
}

describe('ResourceTimingView', () => {
  it('RequestTimeRanges has router evaluation field with SW router source as network', async () => {
    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.Network, Protocol.Network.ServiceWorkerRouterSource.Network);
    const timingInfo = request.timing as Protocol.Network.ResourceTiming;
    const timeRanges = RequestTimingView.RequestTimingView.calculateRequestTimeRanges(request, 100);
    const routerEvaluationTime = timingInfo.workerRouterEvaluationStart as number;
    const sendStart = timingInfo.sendStart as number;

    const routerEvaluation = timeRanges.find(
        timeRange => timeRange.name === RequestTimingView.RequestTimeRangeNames.SERVICE_WORKER_ROUTER_EVALUATION);
    assert.isTrue(Boolean(routerEvaluation), 'worker router evaluation exists');
    assert.strictEqual(routerEvaluation?.start, timingInfo.requestTime + routerEvaluationTime / 1000);
    assert.strictEqual(routerEvaluation?.end, timingInfo.requestTime + sendStart / 1000);

    const cacheLookup = timeRanges.find(
        timeRange => timeRange.name === RequestTimingView.RequestTimeRangeNames.SERVICE_WORKER_CACHE_LOOKUP);
    assert.isFalse(Boolean(cacheLookup), 'worker cache lookup does not exist');
  });

  it('RequestTimeRanges has router evaluation field with SW router source as fetch-event', async () => {
    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.FetchEvent, Protocol.Network.ServiceWorkerRouterSource.FetchEvent);
    const timingInfo = request.timing as Protocol.Network.ResourceTiming;
    const timeRanges = RequestTimingView.RequestTimingView.calculateRequestTimeRanges(request, 100);
    const routerEvaluationTime = timingInfo.workerRouterEvaluationStart as number;
    const workerStart = timingInfo.workerStart as number;

    const routerEvaluation = timeRanges.find(
        timeRange => timeRange.name === RequestTimingView.RequestTimeRangeNames.SERVICE_WORKER_ROUTER_EVALUATION);
    assert.isTrue(Boolean(routerEvaluation), 'worker router evaluation exists');
    assert.strictEqual(routerEvaluation?.start, timingInfo.requestTime + routerEvaluationTime / 1000);
    assert.strictEqual(routerEvaluation?.end, timingInfo.requestTime + workerStart / 1000);

    const cacheLookup = timeRanges.find(
        timeRange => timeRange.name === RequestTimingView.RequestTimeRangeNames.SERVICE_WORKER_CACHE_LOOKUP);
    assert.isFalse(Boolean(cacheLookup), 'worker cache lookup does not exist');
  });

  it('RequestTimeRanges has router evaluation field with SW router source as cache hit', async () => {
    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.Cache, Protocol.Network.ServiceWorkerRouterSource.Cache);
    const timingInfo = request.timing as Protocol.Network.ResourceTiming;
    const timeRanges = RequestTimingView.RequestTimingView.calculateRequestTimeRanges(request, 100);
    const routerEvaluationTime = timingInfo.workerRouterEvaluationStart as number;
    const cacheLookupStart = timingInfo.workerCacheLookupStart as number;

    const routerEvaluation = timeRanges.find(
        timeRange => timeRange.name === RequestTimingView.RequestTimeRangeNames.SERVICE_WORKER_ROUTER_EVALUATION);
    assert.isTrue(Boolean(routerEvaluation), 'worker router evaluation exists');
    assert.strictEqual(routerEvaluation?.start, timingInfo.requestTime + routerEvaluationTime / 1000);
    assert.strictEqual(routerEvaluation?.end, timingInfo.requestTime + cacheLookupStart / 1000);

    const cacheLookup = timeRanges.find(
        timeRange => timeRange.name === RequestTimingView.RequestTimeRangeNames.SERVICE_WORKER_CACHE_LOOKUP);
    assert.isTrue(Boolean(cacheLookup), 'worker cache lookup does not exist');
    assert.strictEqual(cacheLookup?.start, timingInfo.requestTime + cacheLookupStart / 1000);
    assert.strictEqual(cacheLookup?.end, timingInfo.requestTime + timingInfo.receiveHeadersStart / 1000);
  });

  it('RequestTimeRanges has router evaluation field with SW router source as cache miss', async () => {
    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.Cache, Protocol.Network.ServiceWorkerRouterSource.Network);
    const timingInfo = request.timing as Protocol.Network.ResourceTiming;
    const timeRanges = RequestTimingView.RequestTimingView.calculateRequestTimeRanges(request, 100);
    const routerEvaluationTime = timingInfo.workerRouterEvaluationStart as number;
    const cacheLookupStart = timingInfo.workerCacheLookupStart as number;

    const routerEvaluation = timeRanges.find(
        timeRange => timeRange.name === RequestTimingView.RequestTimeRangeNames.SERVICE_WORKER_ROUTER_EVALUATION);
    assert.isTrue(Boolean(routerEvaluation), 'worker router evaluation exists');
    assert.strictEqual(routerEvaluation?.start, timingInfo.requestTime + routerEvaluationTime / 1000);
    assert.strictEqual(routerEvaluation?.end, timingInfo.requestTime + cacheLookupStart / 1000);

    const cacheLookup = timeRanges.find(
        timeRange => timeRange.name === RequestTimingView.RequestTimeRangeNames.SERVICE_WORKER_CACHE_LOOKUP);
    assert.isTrue(Boolean(cacheLookup), 'worker cache lookup does not exist');
    assert.strictEqual(cacheLookup?.start, timingInfo.requestTime + cacheLookupStart / 1000);
    assert.strictEqual(cacheLookup?.end, timingInfo.requestTime + timingInfo.sendStart / 1000);
  });
});
