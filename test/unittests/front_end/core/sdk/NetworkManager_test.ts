// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import type * as ProtocolProxyApi from '../../../../../front_end/generated/protocol-proxy-api.js';

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

    it('is cleared on clearRequests()', () => {
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);

      networkDispatcher.clearRequests();
      assert.notExists(networkDispatcher.requestForId('mockId'));
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

describe('InterceptedRequest', () => {
  it('always responds with status code 200 when fulfilling a request', async () => {
    const fetchAgent = {
      invoke_fulfillRequest: () => {},
    } as unknown as ProtocolProxyApi.FetchApi;
    const spy = sinon.spy(fetchAgent, 'invoke_fulfillRequest');
    const request = {
      url: 'https://www.example.com/',
    } as Protocol.Network.Request;
    const requestId = 'requestId' as Protocol.Fetch.RequestId;
    const interceptedRequest = new SDK.NetworkManager.InterceptedRequest(
        fetchAgent, request, Protocol.Network.ResourceType.Document, requestId, /* responseStatusCode */ 300);
    const textContent = 'some content';
    const responseHeaders = [{name: 'headerName', value: 'headerValue'}] as Protocol.Fetch.HeaderEntry[];

    await interceptedRequest.continueRequestWithContent(
        new Blob([textContent], {type: 'text/html'}), false, responseHeaders);
    assert.isTrue(spy.calledWith({requestId, responseCode: 200, body: btoa(textContent), responseHeaders}));
  });
});
