// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget, describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {createWorkspaceProject} from '../../helpers/OverridesHelpers.js';

import * as Root from '../../../../../front_end/core/root/root.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

describe('MultitargetNetworkManager', () => {
  describe('Trust Token done event', () => {
    it('is not lost when arriving before the corresponding requestWillBeSent event', () => {
      // 1) Setup a NetworkManager and listen to "RequestStarted" events.
      const networkManager = new Common.ObjectWrapper.ObjectWrapper<SDK.NetworkManager.EventTypes>();
      const startedRequests: SDK.NetworkRequest.NetworkRequest[] = [];
      networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted, event => {
        startedRequests.push(event.data.request);
      });
      const networkDispatcher =
          new SDK.NetworkManager.NetworkDispatcher(networkManager as SDK.NetworkManager.NetworkManager);

      // 2) Fire a trust token event, followed by a requestWillBeSent event.
      const mockEvent = {requestId: 'mockId'} as Protocol.Network.TrustTokenOperationDoneEvent;
      networkDispatcher.trustTokenOperationDone(mockEvent);
      networkDispatcher.requestWillBeSent(
          {requestId: 'mockId', request: {url: 'example.com'}} as Protocol.Network.RequestWillBeSentEvent);

      // 3) Check that the resulting NetworkRequest has the Trust Token Event data associated with it.
      assert.strictEqual(startedRequests.length, 1);
      assert.strictEqual(startedRequests[0].trustTokenOperationDoneEvent(), mockEvent);
    });
  });
});

describe('NetworkDispatcher', () => {
  const requestWillBeSentEvent = {requestId: 'mockId', request: {url: 'example.com'}} as
      Protocol.Network.RequestWillBeSentEvent;
  const loadingFinishedEvent =
      {requestId: 'mockId', timestamp: 42, encodedDataLength: 42, shouldReportCorbBlocking: false} as
      Protocol.Network.LoadingFinishedEvent;
  describeWithEnvironment('request', () => {
    let networkDispatcher: SDK.NetworkManager.NetworkDispatcher;

    beforeEach(() => {
      const networkManager = new Common.ObjectWrapper.ObjectWrapper();
      networkDispatcher = new SDK.NetworkManager.NetworkDispatcher(networkManager as SDK.NetworkManager.NetworkManager);
    });

    it('is preserved after loadingFinished', () => {
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);

      assert.exists(networkDispatcher.requestForId('mockId'));
    });

    it('clears finished requests on clearRequests()', () => {
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);

      const unfinishedRequestWillBeSentEvent = {requestId: 'unfinishedRequestId', request: {url: 'example.com'}} as
          Protocol.Network.RequestWillBeSentEvent;
      networkDispatcher.requestWillBeSent(unfinishedRequestWillBeSentEvent);

      networkDispatcher.clearRequests();
      assert.notExists(networkDispatcher.requestForId('mockId'));
      assert.exists(networkDispatcher.requestForId('unfinishedRequestId'));
    });

    it('preserves extra info for unfinished clearRequests()', () => {
      const requestWillBeSentExtraInfoEvent = {
        requestId: 'mockId',
        associatedCookies: [],
        headers: {'Header-From-Extra-Info': 'foo'},
        connectTiming: {requestTime: 0},
      } as unknown as Protocol.Network.RequestWillBeSentExtraInfoEvent;
      networkDispatcher.requestWillBeSentExtraInfo(requestWillBeSentExtraInfoEvent);

      networkDispatcher.clearRequests();
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      assert.exists(networkDispatcher.requestForId('mockId'));
      assert.deepEqual(
          networkDispatcher.requestForId('mockId')?.requestHeaders(), [{name: 'Header-From-Extra-Info', value: 'foo'}]);
    });

    it('response headers are overwritten by request interception', () => {
      const responseReceivedExtraInfoEvent = {
        requestId: 'mockId' as Protocol.Network.RequestId,
        blockedCookies: [],
        headers: {
          'test-header': 'first',
        } as Protocol.Network.Headers,
        resourceIPAddressSpace: Protocol.Network.IPAddressSpace.Public,
        statusCode: 200,
      } as Protocol.Network.ResponseReceivedExtraInfoEvent;
      const mockResponseReceivedEventWithHeaders =
          (headers: Protocol.Network.Headers): Protocol.Network.ResponseReceivedEvent => {
            return {
              requestId: 'mockId',
              loaderId: 'mockLoaderId',
              frameId: 'mockFrameId',
              timestamp: 581734.083213,
              type: Protocol.Network.ResourceType.Document,
              response: {
                url: 'example.com',
                status: 200,
                statusText: '',
                headers,
                mimeType: 'text/html',
                connectionReused: true,
                connectionId: 12345,
                encodedDataLength: 100,
                securityState: 'secure',
              } as Protocol.Network.Response,
            } as Protocol.Network.ResponseReceivedEvent;
          };

      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.responseReceivedExtraInfo(responseReceivedExtraInfoEvent);

      // ResponseReceived does not overwrite response headers.
      networkDispatcher.responseReceived(mockResponseReceivedEventWithHeaders({'test-header': 'second'}));
      assert.deepEqual(
          networkDispatcher.requestForId('mockId')?.responseHeaders, [{name: 'test-header', value: 'first'}]);

      // ResponseReceived does overwrite response headers if request is marked as intercepted.
      SDK.NetworkManager.MultitargetNetworkManager.instance().dispatchEventToListeners(
          SDK.NetworkManager.MultitargetNetworkManager.Events.RequestIntercepted,
          'example.com' as Platform.DevToolsPath.UrlString);
      networkDispatcher.responseReceived(mockResponseReceivedEventWithHeaders({'test-header': 'third'}));
      assert.deepEqual(
          networkDispatcher.requestForId('mockId')?.responseHeaders, [{name: 'test-header', value: 'third'}]);
    });
  });

  describeWithEnvironment('WebBundle requests', () => {
    let networkDispatcher: SDK.NetworkManager.NetworkDispatcher;
    const webBundleMetadataReceivedEvent = {requestId: 'mockId', urls: ['foo']} as
        Protocol.Network.SubresourceWebBundleMetadataReceivedEvent;
    const webBundleInnerResponseParsedEvent = {bundleRequestId: 'bundleRequestId', innerRequestId: 'mockId'} as
        Protocol.Network.SubresourceWebBundleInnerResponseParsedEvent;
    const resourceUrlsFoo = ['foo'] as Platform.DevToolsPath.UrlString[];

    beforeEach(() => {
      const networkManager = new Common.ObjectWrapper.ObjectWrapper();
      networkDispatcher = new SDK.NetworkManager.NetworkDispatcher(networkManager as SDK.NetworkManager.NetworkManager);
    });

    it('have webbundle info when webbundle event happen between browser events', () => {
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.subresourceWebBundleMetadataReceived(webBundleMetadataReceivedEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);

      assert.deepEqual(networkDispatcher.requestForId('mockId')?.webBundleInfo()?.resourceUrls, resourceUrlsFoo);
    });

    it('have webbundle info when webbundle event happen before browser events', () => {
      networkDispatcher.subresourceWebBundleMetadataReceived(webBundleMetadataReceivedEvent);
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);

      assert.deepEqual(networkDispatcher.requestForId('mockId')?.webBundleInfo()?.resourceUrls, resourceUrlsFoo);
    });

    it('have webbundle info when webbundle event happen after browser events', () => {
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);
      networkDispatcher.subresourceWebBundleMetadataReceived(webBundleMetadataReceivedEvent);

      assert.deepEqual(networkDispatcher.requestForId('mockId')?.webBundleInfo()?.resourceUrls, resourceUrlsFoo);
    });

    it('have webbundle info only for the final request but nor redirect', () => {
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.requestWillBeSent(
          {requestId: 'mockId', request: {url: 'redirect.example.com'}, redirectResponse: {url: 'example.com'}} as
          Protocol.Network.RequestWillBeSentEvent);
      networkDispatcher.subresourceWebBundleMetadataReceived(webBundleMetadataReceivedEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);

      assert.deepEqual(networkDispatcher.requestForId('mockId')?.webBundleInfo()?.resourceUrls, resourceUrlsFoo);
      assert.exists(networkDispatcher.requestForId('mockId')?.redirectSource());
      assert.notExists(networkDispatcher.requestForId('mockId')?.redirectSource()?.webBundleInfo());
    });

    it('have webbundle info on error', () => {
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);
      networkDispatcher.subresourceWebBundleMetadataError(
          {requestId: 'mockId', errorMessage: 'Kaboom!'} as Protocol.Network.SubresourceWebBundleMetadataErrorEvent);

      assert.deepEqual(networkDispatcher.requestForId('mockId')?.webBundleInfo()?.errorMessage, 'Kaboom!');
    });

    it('have webbundle inner request info when webbundle event happen between browser events', () => {
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.subresourceWebBundleInnerResponseParsed(webBundleInnerResponseParsedEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);

      assert.deepEqual(
          networkDispatcher.requestForId('mockId')?.webBundleInnerRequestInfo()?.bundleRequestId, 'bundleRequestId');
    });

    it('have webbundle inner request info when webbundle event happen before browser events', () => {
      networkDispatcher.subresourceWebBundleInnerResponseParsed(webBundleInnerResponseParsedEvent);
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);

      assert.deepEqual(
          networkDispatcher.requestForId('mockId')?.webBundleInnerRequestInfo()?.bundleRequestId, 'bundleRequestId');
    });

    it('have webbundle inner request info when webbundle event happen after browser events', () => {
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);
      networkDispatcher.subresourceWebBundleInnerResponseParsed(webBundleInnerResponseParsedEvent);

      assert.deepEqual(
          networkDispatcher.requestForId('mockId')?.webBundleInnerRequestInfo()?.bundleRequestId, 'bundleRequestId');
    });

    it('have webbundle inner request info on error', () => {
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);
      networkDispatcher.subresourceWebBundleInnerResponseError(
          {innerRequestId: 'mockId', errorMessage: 'Kaboom!'} as
          Protocol.Network.SubresourceWebBundleInnerResponseErrorEvent);

      assert.deepEqual(networkDispatcher.requestForId('mockId')?.webBundleInnerRequestInfo()?.errorMessage, 'Kaboom!');
    });
  });
});

interface OverriddenResponse {
  requestId: Protocol.Fetch.RequestId;
  responseCode: number;
  body: string;
  responseHeaders: Protocol.Fetch.HeaderEntry[];
}

async function checkRequestOverride(
    target: SDK.Target.Target, request: Protocol.Network.Request, requestId: Protocol.Fetch.RequestId,
    responseStatusCode: number, responseHeaders: Protocol.Fetch.HeaderEntry[], responseBody: string,
    expectedOverriddenResponse: OverriddenResponse) {
  const multitargetNetworkManager = SDK.NetworkManager.MultitargetNetworkManager.instance();
  const fetchAgent = target.fetchAgent();
  const spy = sinon.spy(fetchAgent, 'invoke_fulfillRequest');

  const fulfilledRequest = new Promise(resolve => {
    multitargetNetworkManager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.RequestFulfilled, resolve);
  });
  const networkRequest = SDK.NetworkRequest.NetworkRequest.create(
      requestId as unknown as Protocol.Network.RequestId, request.url as Platform.DevToolsPath.UrlString,
      request.url as Platform.DevToolsPath.UrlString, null, null, null);

  const interceptedRequest = new SDK.NetworkManager.InterceptedRequest(
      fetchAgent, request, Protocol.Network.ResourceType.Document, requestId, networkRequest, responseStatusCode,
      responseHeaders);
  interceptedRequest.responseBody = async () => {
    return {error: null, content: responseBody, encoded: false};
  };

  assert.isTrue(spy.notCalled);
  await multitargetNetworkManager.requestIntercepted(interceptedRequest);
  await fulfilledRequest;
  assert.isTrue(spy.calledOnceWithExactly(expectedOverriddenResponse));
  assert.deepEqual(networkRequest.originalResponseHeaders, responseHeaders);
}

describeWithMockConnection('InterceptedRequest', () => {
  let target: SDK.Target.Target;

  beforeEach(async () => {
    SDK.NetworkManager.MultitargetNetworkManager.dispose();
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.HEADER_OVERRIDES, '');
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
    target = createTarget();
    const networkPersistenceManager =
        await createWorkspaceProject('file:///path/to/overrides' as Platform.DevToolsPath.UrlString, [
          {
            name: '.headers',
            path: 'www.example.com/',
            content: `[
            {
              "applyTo": "index.html",
              "headers": [{
                "name": "index-only",
                "value": "only added to index.html"
              }]
            },
            {
              "applyTo": "*.css",
              "headers": [{
                "name": "css-only",
                "value": "only added to css files"
              }]
            },
            {
              "applyTo": "path/to/*.js",
              "headers": [{
                "name": "another-header",
                "value": "only added to specific path"
              }]
            }
          ]`,
          },
          {
            name: '.headers',
            path: '',
            content: `[
            {
              "applyTo": "*",
              "headers": [{
                "name": "age",
                "value": "overridden"
              }]
            }
          ]`,
          },
          {name: 'helloWorld.html', path: 'www.example.com/', content: 'Hello World!'},
        ]);
    sinon.stub(target.fetchAgent(), 'invoke_enable');
    await networkPersistenceManager.updateInterceptionPatternsForTests();
  });

  it('can override headers-only for a status 200 request', async () => {
    const responseCode = 200;
    const requestId = 'request_id_1' as Protocol.Fetch.RequestId;
    const responseBody = 'interceptedRequest content';
    await checkRequestOverride(
        target, {
          method: 'GET',
          url: 'https://www.example.com/styles.css',
        } as Protocol.Network.Request,
        requestId, responseCode, [{name: 'content-type', value: 'text/html; charset=utf-8'}], responseBody, {
          requestId,
          responseCode,
          body: responseBody,
          responseHeaders: [
            {name: 'css-only', value: 'only added to css files'},
            {name: 'age', value: 'overridden'},
            {name: 'content-type', value: 'text/html; charset=utf-8'},
          ],
        });
  });

  it('can override headers and content for a status 200 request', async () => {
    const responseCode = 200;
    const requestId = 'request_id_2' as Protocol.Fetch.RequestId;
    const responseBody = 'interceptedRequest content';
    await checkRequestOverride(
        target, {
          method: 'GET',
          url: 'https://www.example.com/helloWorld.html',
        } as Protocol.Network.Request,
        requestId, responseCode, [{name: 'content-type', value: 'text/html; charset=utf-8'}], responseBody, {
          requestId,
          responseCode,
          body: btoa('Hello World!'),
          responseHeaders: [
            {name: 'age', value: 'overridden'},
            {name: 'content-type', value: 'text/html; charset=utf-8'},
          ],
        });
  });

  it('can override headers-only for a status 300 (redirect) request', async () => {
    const responseCode = 300;
    const requestId = 'request_id_3' as Protocol.Fetch.RequestId;
    const responseBody = 'interceptedRequest content';
    await checkRequestOverride(
        target, {
          method: 'GET',
          url: 'https://www.example.com/path/to/foo.js',
        } as Protocol.Network.Request,
        requestId, responseCode, [{name: 'content-type', value: 'text/html; charset=utf-8'}], responseBody, {
          requestId,
          responseCode,
          body: '',
          responseHeaders: [
            {name: 'another-header', value: 'only added to specific path'},
            {name: 'age', value: 'overridden'},
            {name: 'content-type', value: 'text/html; charset=utf-8'},
          ],
        });
  });

  it('can override headers and content for a status 300 (redirect) request', async () => {
    const responseCode = 300;
    const requestId = 'request_id_4' as Protocol.Fetch.RequestId;
    const responseBody = 'interceptedRequest content';
    await checkRequestOverride(
        target, {
          method: 'GET',
          url: 'https://www.example.com/helloWorld.html',
        } as Protocol.Network.Request,
        requestId, responseCode, [{name: 'content-type', value: 'text/html; charset=utf-8'}], responseBody, {
          requestId,
          responseCode: 200,
          body: btoa('Hello World!'),
          responseHeaders: [
            {name: 'age', value: 'overridden'},
            {name: 'content-type', value: 'text/html; charset=utf-8'},
          ],
        });
  });

  it('can override headers-only for a status 404 (not found) request', async () => {
    const responseCode = 404;
    const requestId = 'request_id_5' as Protocol.Fetch.RequestId;
    const responseBody = 'interceptedRequest content';
    await checkRequestOverride(
        target, {
          method: 'GET',
          url: 'https://www.example.com/doesNotExist.html',
        } as Protocol.Network.Request,
        requestId, responseCode, [{name: 'content-type', value: 'text/html; charset=utf-8'}], responseBody, {
          requestId,
          responseCode,
          body: 'interceptedRequest content',
          responseHeaders: [
            {name: 'age', value: 'overridden'},
            {name: 'content-type', value: 'text/html; charset=utf-8'},
          ],
        });
  });

  it('can override headers and content for a status 404 (not found) request', async () => {
    const responseCode = 404;
    const requestId = 'request_id_6' as Protocol.Fetch.RequestId;
    const responseBody = 'interceptedRequest content';
    await checkRequestOverride(
        target, {
          method: 'GET',
          url: 'https://www.example.com/helloWorld.html',
        } as Protocol.Network.Request,
        requestId, responseCode, [{name: 'content-type', value: 'text/html; charset=utf-8'}], responseBody, {
          requestId,
          responseCode: 200,
          body: btoa('Hello World!'),
          responseHeaders: [
            {name: 'age', value: 'overridden'},
            {name: 'content-type', value: 'text/html; charset=utf-8'},
          ],
        });
  });
});
