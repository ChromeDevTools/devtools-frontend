// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Logs from '../../models/logs/logs.js';
import * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import {
  assertScreenshot,
  getCleanTextContentFromElements,
  raf,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

function createNetworkRequest(
    matchedSource: Protocol.Network.ServiceWorkerRouterSource,
    actualSource: Protocol.Network.ServiceWorkerRouterSource): SDK.NetworkRequest.NetworkRequest {
  const request = SDK.NetworkRequest.NetworkRequest.create(
      'requestId' as Protocol.Network.RequestId, urlString`http://devtools-frontend.test`, urlString``, null, null,
      null);

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
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();
  it('RequestTimeRanges has router evaluation field with SW router source as network', async () => {
    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.Network, Protocol.Network.ServiceWorkerRouterSource.Network);
    const timingInfo = request.timing as Protocol.Network.ResourceTiming;
    const timeRanges = NetworkTimeCalculator.calculateRequestTimeRanges(request, 100);
    const routerEvaluationTime = timingInfo.workerRouterEvaluationStart as number;
    const sendStart = timingInfo.sendStart;

    const routerEvaluation = timeRanges.find(
        timeRange => timeRange.name === NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_ROUTER_EVALUATION);
    assert.isTrue(Boolean(routerEvaluation), 'worker router evaluation exists');
    assert.strictEqual(routerEvaluation?.start, timingInfo.requestTime + routerEvaluationTime / 1000);
    assert.strictEqual(routerEvaluation?.end, timingInfo.requestTime + sendStart / 1000);

    const cacheLookup = timeRanges.find(
        timeRange => timeRange.name === NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_CACHE_LOOKUP);
    assert.isFalse(Boolean(cacheLookup), 'worker cache lookup does not exist');
  });

  it('RequestTimeRanges has router evaluation field with SW router source as fetch-event', async () => {
    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.FetchEvent, Protocol.Network.ServiceWorkerRouterSource.FetchEvent);
    const timingInfo = request.timing as Protocol.Network.ResourceTiming;
    const timeRanges = NetworkTimeCalculator.calculateRequestTimeRanges(request, 100);
    const routerEvaluationTime = timingInfo.workerRouterEvaluationStart as number;
    const workerStart = timingInfo.workerStart;

    const routerEvaluation = timeRanges.find(
        timeRange => timeRange.name === NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_ROUTER_EVALUATION);
    assert.isTrue(Boolean(routerEvaluation), 'worker router evaluation exists');
    assert.strictEqual(routerEvaluation?.start, timingInfo.requestTime + routerEvaluationTime / 1000);
    assert.strictEqual(routerEvaluation?.end, timingInfo.requestTime + workerStart / 1000);

    const cacheLookup = timeRanges.find(
        timeRange => timeRange.name === NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_CACHE_LOOKUP);
    assert.isFalse(Boolean(cacheLookup), 'worker cache lookup does not exist');
  });

  it('RequestTimeRanges has router evaluation field with SW router source as cache hit', async () => {
    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.Cache, Protocol.Network.ServiceWorkerRouterSource.Cache);
    const timingInfo = request.timing as Protocol.Network.ResourceTiming;
    const timeRanges = NetworkTimeCalculator.calculateRequestTimeRanges(request, 100);
    const routerEvaluationTime = timingInfo.workerRouterEvaluationStart as number;
    const cacheLookupStart = timingInfo.workerCacheLookupStart as number;

    const routerEvaluation = timeRanges.find(
        timeRange => timeRange.name === NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_ROUTER_EVALUATION);
    assert.isTrue(Boolean(routerEvaluation), 'worker router evaluation exists');
    assert.strictEqual(routerEvaluation?.start, timingInfo.requestTime + routerEvaluationTime / 1000);
    assert.strictEqual(routerEvaluation?.end, timingInfo.requestTime + cacheLookupStart / 1000);

    const cacheLookup = timeRanges.find(
        timeRange => timeRange.name === NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_CACHE_LOOKUP);
    assert.isTrue(Boolean(cacheLookup), 'worker cache lookup does not exist');
    assert.strictEqual(cacheLookup?.start, timingInfo.requestTime + cacheLookupStart / 1000);
    assert.strictEqual(cacheLookup?.end, timingInfo.requestTime + timingInfo.receiveHeadersStart / 1000);
  });

  it('RequestTimeRanges has router evaluation field with SW router source as cache miss', async () => {
    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.Cache, Protocol.Network.ServiceWorkerRouterSource.Network);
    const timingInfo = request.timing as Protocol.Network.ResourceTiming;
    const timeRanges = NetworkTimeCalculator.calculateRequestTimeRanges(request, 100);
    const routerEvaluationTime = timingInfo.workerRouterEvaluationStart as number;
    const cacheLookupStart = timingInfo.workerCacheLookupStart as number;

    const routerEvaluation = timeRanges.find(
        timeRange => timeRange.name === NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_ROUTER_EVALUATION);
    assert.isTrue(Boolean(routerEvaluation), 'worker router evaluation exists');
    assert.strictEqual(routerEvaluation?.start, timingInfo.requestTime + routerEvaluationTime / 1000);
    assert.strictEqual(routerEvaluation?.end, timingInfo.requestTime + cacheLookupStart / 1000);

    const cacheLookup = timeRanges.find(
        timeRange => timeRange.name === NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_CACHE_LOOKUP);
    assert.isTrue(Boolean(cacheLookup), 'worker cache lookup does not exist');
    assert.strictEqual(cacheLookup?.start, timingInfo.requestTime + cacheLookupStart / 1000);
    assert.strictEqual(cacheLookup?.end, timingInfo.requestTime + timingInfo.sendStart / 1000);
  });

  it('Timing table has router evaluation field with detail tabs', async () => {
    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.Network, Protocol.Network.ServiceWorkerRouterSource.Network);

    const component = Network.RequestTimingView.RequestTimingView.create(
        request, new NetworkTimeCalculator.NetworkTimeCalculator(true));
    const div = document.createElement('div');
    renderElementIntoDOM(div);
    component.markAsRoot();
    component.show(div);

    await component.updateComplete;

    // Test if we correctly set details element
    const routerEvaluationDetailsElement = document.querySelector('.router-evaluation-timing-bar-details');
    assert.isNotNull(routerEvaluationDetailsElement, 'router evaluation details does not exist');
    assert.strictEqual(
        routerEvaluationDetailsElement.childElementCount, 1,
        'router evaluation details child element count does not match');
    assert.isNotNull(routerEvaluationDetailsElement.firstElementChild, 'router evaluation first element is non null');

    // Test if we correctly set the tree item inside shadow root
    const shadowElement = routerEvaluationDetailsElement.firstElementChild.shadowRoot;
    assert.isNotNull(shadowElement, 'shadow element does not exist');
    const content = getCleanTextContentFromElements(shadowElement, '.network-fetch-details-treeitem');
    assert.lengthOf(content, 2, 'does not match the tree item');

    // Check the content of the view. Since the value is set from matched to actual,
    // the order should be the same.
    const networkString = String(Protocol.Network.ServiceWorkerRouterSource.Network);
    assert.strictEqual(content[0], `Matched source: ${networkString}`, 'matched source does not match');
    assert.strictEqual(content[1], `Actual source: ${networkString}`, 'actual source does not match');
  });

  it('Timing table shows throttling indicator', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});

    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.Cache, Protocol.Network.ServiceWorkerRouterSource.Cache);
    const timeRanges = NetworkTimeCalculator.calculateRequestTimeRanges(request, 100);

    const wasThrottled = new SDK.NetworkManager.AppliedNetworkConditions(SDK.NetworkManager.Slow3GConditions, '');
    const input: Parameters<typeof Network.RequestTimingView.DEFAULT_VIEW>[0] = {
      request,
      totalDuration: 100,
      startTime: 0,
      endTime: 100,
      timeRanges,
      calculator: new NetworkTimeCalculator.NetworkTimeCalculator(true),
      wasThrottled,
    };

    Network.RequestTimingView.DEFAULT_VIEW(input, {}, container);
    await assertScreenshot('network/request-timing-view-throttling.png');

    const icon = container.querySelector<HTMLElement>('devtools-icon[name=watch]');
    assert.exists(icon);
    const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal');
    icon.click();
    sinon.assert.calledOnceWithExactly(revealStub, wasThrottled, false);
  });

  it('correctly passes requestUnfinished to the view', async () => {
    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.Network, Protocol.Network.ServiceWorkerRouterSource.Network);
    request.finished = false;
    const calculator = new NetworkTimeCalculator.NetworkTimeCalculator(true);

    const viewStub = createViewFunctionStub(Network.RequestTimingView.RequestTimingView);
    const component = new Network.RequestTimingView.RequestTimingView(undefined, viewStub);
    renderElementIntoDOM(component);

    component.request = request;
    component.calculator = calculator;

    const input = await viewStub.nextInput;
    assert.isFalse(input.request.finished, 'request.finished should be false when request is not finished');

    const requestFinished = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.Network, Protocol.Network.ServiceWorkerRouterSource.Network);
    requestFinished.finished = true;

    component.request = requestFinished;

    const inputFinished = await viewStub.nextInput;
    assert.isTrue(inputFinished.request.finished, 'request.finished should be true when request is finished');
  });

  it('shows caution message in DEFAULT_VIEW if and only if request is not finished yet', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.Network, Protocol.Network.ServiceWorkerRouterSource.Network);
    const timeRanges = NetworkTimeCalculator.calculateRequestTimeRanges(request, 100);
    const calculator = new NetworkTimeCalculator.NetworkTimeCalculator(true);

    const baseInput: Parameters<typeof Network.RequestTimingView.DEFAULT_VIEW>[0] = {
      request,
      totalDuration: 100,
      startTime: 0,
      endTime: 100,
      timeRanges,
      calculator,
    };

    // Case 1: request.finished = false
    request.finished = false;
    Network.RequestTimingView.DEFAULT_VIEW(baseInput, {}, container);
    const cautionElementTrue = container.querySelector('.caution');
    assert.isNotNull(cautionElementTrue, 'caution element should exist when request is not finished');
    assert.include(cautionElementTrue?.textContent, 'Caution: Request isn’t finished yet');

    // Case 2: request.finished = true
    const requestFinished = createNetworkRequest(Protocol.Network.ServiceWorkerRouterSource.Network,
                                                 Protocol.Network.ServiceWorkerRouterSource.Network);
    requestFinished.finished = true;
    Network.RequestTimingView.DEFAULT_VIEW({...baseInput, request: requestFinished}, {}, container);
    const cautionElementFalse = container.querySelector('.caution');
    assert.isNull(cautionElementFalse, 'caution element should not exist when request is finished');
  });

  it('renders read-only object properties for Service Worker fetch details', async () => {
    const request = createNetworkRequest(
        Protocol.Network.ServiceWorkerRouterSource.Network, Protocol.Network.ServiceWorkerRouterSource.Network);
    request.fetchedViaServiceWorker = true;

    const origRequest = {
      url: request.url(),
      method: 'GET',
      headers: {},
      initialPriority: Protocol.Network.ResourcePriority.High,
      referrerPolicy: Protocol.Network.RequestReferrerPolicy.StrictOriginWhenCrossOrigin,
    } as Protocol.Network.Request;

    const response = {
      url: request.url(),
      status: 200,
      statusText: 'OK',
      headers: {},
      mimeType: 'text/html',
      charset: '',
      connectionReused: false,
      connectionId: 0,
      encodedDataLength: 0,
      securityState: Protocol.Security.SecurityState.Secure,
    } as Protocol.Network.Response;

    sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'originalRequestForURL').returns(origRequest);
    sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'originalResponseForURL').returns(response);

    const populateSpy =
        sinon.spy(ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement, 'populateChildrenIfNeeded');

    const component = Network.RequestTimingView.RequestTimingView.create(
        request, new NetworkTimeCalculator.NetworkTimeCalculator(true));
    const div = document.createElement('div');
    renderElementIntoDOM(div);
    component.markAsRoot();
    component.show(div);

    await component.updateComplete;
    await Promise.all(populateSpy.returnValues);
    await raf();
    await UI.Widget.Widget.allUpdatesComplete;

    const detailsTreeElement = component.contentElement.querySelector('.network-fetch-timing-bar-details > *');
    assert.exists(detailsTreeElement);
    assert.exists(detailsTreeElement.shadowRoot);

    const rootElements = detailsTreeElement.shadowRoot.querySelectorAll('li.object-properties-section-root-element');
    assert.lengthOf(rootElements, 2);

    for (const rootElementNode of rootElements) {
      const rootElement = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(rootElementNode);
      assert.exists(rootElement);
      const firstProperty = rootElement.childAt(0);
      assert.instanceOf(firstProperty, ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement);
      assert.isFalse(firstProperty.editable);
    }
  });

  it('renders Service Worker timing details correctly', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create('requestId' as Protocol.Network.RequestId,
                                                             urlString`http://devtools-frontend.test`, urlString``,
                                                             null, null, null);
    request.mimeType = 'text/html';
    request.finished = true;
    request.fetchedViaServiceWorker = true;

    // Setup timing:
    // requestTime = 100s
    // workerStart = 10ms -> 100.010s
    // workerReady = 30ms -> 100.030s (Startup duration = 20ms)
    // workerFetchStart = 40ms -> 100.040s
    // workerRespondWithSettled = 90ms -> 100.090s (respondWith duration = 50ms)
    // sendEnd = 110ms -> 100.110s (Request to SW duration = 80ms)
    request.timing = {
      requestTime: 100,
      proxyStart: -1,
      proxyEnd: -1,
      dnsStart: -1,
      dnsEnd: -1,
      connectStart: -1,
      connectEnd: -1,
      sslStart: -1,
      sslEnd: -1,
      workerStart: 10,
      workerReady: 30,
      workerRouterEvaluationStart: -1,
      workerFetchStart: 40,
      workerRespondWithSettled: 90,
      sendStart: 100,
      sendEnd: 110,
      pushStart: 0,
      pushEnd: 0,
      receiveHeadersStart: 120,
      receiveHeadersEnd: -1,
    };
    request.responseReceivedTime = 100.120;
    request.endTime = 100.150;

    const component = Network.RequestTimingView.RequestTimingView.create(
        request, new NetworkTimeCalculator.NetworkTimeCalculator(true));
    renderElementIntoDOM(component);

    await component.updateComplete;

    const rows = Array.from(component.contentElement.querySelectorAll('tr'));
    const timingRows = rows.filter(row => row.querySelector('.network-timing-bar'));

    const timingData = timingRows.map(row => {
      const labelEl = row.querySelector('td');
      const durationEl = row.querySelector('.network-timing-bar-title');
      return {
        label: labelEl?.textContent?.trim() ?? '',
        duration: durationEl?.textContent?.trim() ?? '',
      };
    });

    const startupRow = timingData.find(d => d.label === 'Startup');
    assert.exists(startupRow);
    assert.strictEqual(startupRow.duration.replace(/\s/g, ' '), '20.00 ms');

    const respondWithRow = timingData.find(d => d.label === 'respondWith');
    assert.exists(respondWithRow);
    assert.strictEqual(respondWithRow.duration.replace(/\s/g, ' '), '50.00 ms');

    const requestToSWRow = timingData.find(d => d.label === 'Request to ServiceWorker');
    assert.exists(requestToSWRow);
    assert.strictEqual(requestToSWRow.duration.replace(/\s/g, ' '), '80.00 ms');
  });
});
