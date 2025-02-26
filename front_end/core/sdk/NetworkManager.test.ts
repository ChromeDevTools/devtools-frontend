// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {createTarget, describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createWorkspaceProject} from '../../testing/OverridesHelpers.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;
const LONG_URL_PART =
    'LoremIpsumDolorSitAmetConsecteturAdipiscingElitPhasellusVitaeOrciInAugueCondimentumTinciduntUtEgetDolorQuisqueEfficiturUltricesTinciduntVivamusVelitPurusCommodoQuisErosSitAmetTemporMalesuadaNislNullamTtempusVulputateAugueEgetScelerisqueLacusVestibulumNon/index.html';

describeWithMockConnection('NetworkManager', () => {
  it('setCookieControls is not invoked if the browsers enterprise setting blocks third party cookies', () => {
    Object.assign(
        Root.Runtime.hostConfig,
        {thirdPartyCookieControls: {managedBlockThirdPartyCookies: true}, devToolsPrivacyUI: {enabled: true}});

    const enableThirdPartyCookieRestrictionSetting =
        Common.Settings.Settings.instance().createSetting('cookie-control-override-enabled', false);
    const disableThirdPartyCookieMetadataSetting =
        Common.Settings.Settings.instance().createSetting('grace-period-mitigation-disabled', true);
    const disableThirdPartyCookieHeuristicsSetting =
        Common.Settings.Settings.instance().createSetting('heuristic-mitigation-disabled', true);
    assert.isFalse(enableThirdPartyCookieRestrictionSetting.get());
    assert.isTrue(disableThirdPartyCookieMetadataSetting.get());
    assert.isTrue(disableThirdPartyCookieHeuristicsSetting.get());

    const target = createTarget();
    const expectedCall = sinon.spy(target.networkAgent(), 'invoke_setCookieControls');

    new SDK.NetworkManager.NetworkManager(target);

    // function should not be called since there is a enterprise policy blocking third-party cookies
    assert.isTrue(expectedCall.notCalled);
  });

  it('setCookieControls gets invoked with expected values when network agent auto attach', () => {
    updateHostConfig({devToolsPrivacyUI: {enabled: true}});

    const enableThirdPartyCookieRestrictionSetting =
        Common.Settings.Settings.instance().createSetting('cookie-control-override-enabled', false);
    const disableThirdPartyCookieMetadataSetting =
        Common.Settings.Settings.instance().createSetting('grace-period-mitigation-disabled', true);
    const disableThirdPartyCookieHeuristicsSetting =
        Common.Settings.Settings.instance().createSetting('heuristic-mitigation-disabled', true);
    assert.isFalse(enableThirdPartyCookieRestrictionSetting.get());
    assert.isTrue(disableThirdPartyCookieMetadataSetting.get());
    assert.isTrue(disableThirdPartyCookieHeuristicsSetting.get());

    const target = createTarget();
    const expectedCall = sinon.spy(target.networkAgent(), 'invoke_setCookieControls');

    new SDK.NetworkManager.NetworkManager(target);

    // Metadata and heuristics should be disabled when cookie controls is disabled.
    assert.isTrue(expectedCall.calledOnceWith({
      enableThirdPartyCookieRestriction: false,
      disableThirdPartyCookieMetadata: false,
      disableThirdPartyCookieHeuristics: false
    }));
  });
});

describeWithMockConnection('MultitargetNetworkManager', () => {
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
      assert.lengthOf(startedRequests, 1);
      assert.strictEqual(startedRequests[0].trustTokenOperationDoneEvent(), mockEvent);
    });
  });

  it('handles worker requests originating from the frame target', async () => {
    const target = createTarget();
    const workerTarget = createTarget({type: SDK.Target.Type.Worker});

    const multiTargetNetworkManager = SDK.NetworkManager.MultitargetNetworkManager.instance();
    const initialNetworkManager = target.model(SDK.NetworkManager.NetworkManager)!;

    assert.strictEqual(multiTargetNetworkManager.inflightMainResourceRequests.size, 0);

    const requestId = 'mockId';
    const requestPromise = initialNetworkManager.once(SDK.NetworkManager.Events.RequestStarted);
    initialNetworkManager.dispatcher.requestWillBeSent(
        {requestId, loaderId: '', request: {url: 'example.com'}} as Protocol.Network.RequestWillBeSentEvent);

    const {request} = await requestPromise;
    assert.isOk(SDK.NetworkManager.NetworkManager.forRequest(request) === initialNetworkManager);
    assert.isOk(multiTargetNetworkManager.inflightMainResourceRequests.has(requestId));

    const workerNetworkManager = workerTarget.model(SDK.NetworkManager.NetworkManager)!;
    workerNetworkManager.dispatcher.loadingFinished({requestId} as Protocol.Network.LoadingFinishedEvent);

    assert.isOk(SDK.NetworkManager.NetworkManager.forRequest(request) === workerNetworkManager);
    assert.isOk(!multiTargetNetworkManager.inflightMainResourceRequests.has(requestId));
  });

  it('uses main frame to get certificate', () => {
    SDK.ChildTargetManager.ChildTargetManager.install();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = createTarget({parentTarget: tabTarget});
    const prerenderTarget = createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const subframeTarget = createTarget({parentTarget: mainFrameTarget, subtype: ''});

    const unexpectedCalls =
        [tabTarget, prerenderTarget, subframeTarget].map(t => sinon.spy(t.networkAgent(), 'invoke_getCertificate'));
    const expectedCall = sinon.spy(mainFrameTarget.networkAgent(), 'invoke_getCertificate');
    void SDK.NetworkManager.MultitargetNetworkManager.instance().getCertificate('https://example.com');
    for (const unexpectedCall of unexpectedCalls) {
      assert.isTrue(unexpectedCall.notCalled);
    }
    assert.isTrue(expectedCall.calledOnceWith({origin: 'https://example.com'}));
  });

  it('blocking settings are consistent after change', async () => {
    const multitargetNetworkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    let eventCounter = 0;
    multitargetNetworkManager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.BLOCKED_PATTERNS_CHANGED, () => eventCounter++);
    const blockingEnabledSetting = Common.Settings.Settings.instance().moduleSetting('request-blocking-enabled');
    const blockedPatternsSetting: Common.Settings.Setting<SDK.NetworkManager.BlockedPattern[]> =
        Common.Settings.Settings.instance().createSetting('network-blocked-patterns', []);

    // Change blocking setting via Common.Settings.Settings.
    assert.isFalse(multitargetNetworkManager.isBlocking());
    assert.isFalse(multitargetNetworkManager.blockingEnabled());
    blockingEnabledSetting.set(true);
    assert.strictEqual(eventCounter, 1);
    assert.isFalse(multitargetNetworkManager.isBlocking());
    assert.isTrue(multitargetNetworkManager.blockingEnabled());
    blockedPatternsSetting.set([{url: 'example.com', enabled: true}]);
    assert.strictEqual(eventCounter, 2);
    assert.isTrue(multitargetNetworkManager.isBlocking());
    assert.isTrue(multitargetNetworkManager.blockingEnabled());
    blockedPatternsSetting.set([]);
    assert.strictEqual(eventCounter, 3);
    assert.isFalse(multitargetNetworkManager.isBlocking());
    assert.isTrue(multitargetNetworkManager.blockingEnabled());
    blockingEnabledSetting.set(false);
    assert.strictEqual(eventCounter, 4);
    assert.isFalse(multitargetNetworkManager.isBlocking());
    assert.isFalse(multitargetNetworkManager.blockingEnabled());

    // Change blocking setting via MultitargetNetworkManager.
    assert.isFalse(multitargetNetworkManager.isBlocking());
    assert.isFalse(multitargetNetworkManager.blockingEnabled());
    multitargetNetworkManager.setBlockingEnabled(true);
    assert.strictEqual(eventCounter, 5);
    assert.isFalse(multitargetNetworkManager.isBlocking());
    assert.isTrue(multitargetNetworkManager.blockingEnabled());
    multitargetNetworkManager.setBlockedPatterns([{url: 'example.com', enabled: true}]);
    assert.strictEqual(eventCounter, 6);
    assert.isTrue(multitargetNetworkManager.isBlocking());
    assert.isTrue(multitargetNetworkManager.blockingEnabled());
    multitargetNetworkManager.setBlockedPatterns([]);
    assert.strictEqual(eventCounter, 7);
    assert.isFalse(multitargetNetworkManager.isBlocking());
    assert.isTrue(multitargetNetworkManager.blockingEnabled());
    multitargetNetworkManager.setBlockingEnabled(false);
    assert.strictEqual(eventCounter, 8);
    assert.isFalse(multitargetNetworkManager.isBlocking());
    assert.isFalse(multitargetNetworkManager.blockingEnabled());
  });
});

describe('NetworkDispatcher', () => {
  const requestWillBeSentEvent = {requestId: 'mockId', request: {url: 'example.com'}} as
      Protocol.Network.RequestWillBeSentEvent;
  const loadingFinishedEvent = {requestId: 'mockId', timestamp: 42, encodedDataLength: 42} as
      Protocol.Network.LoadingFinishedEvent;
  describeWithEnvironment('request', () => {
    let networkDispatcher: SDK.NetworkManager.NetworkDispatcher;

    beforeEach(() => {
      const networkManager: Common.ObjectWrapper.ObjectWrapper<unknown>&{target?: () => void} =
          new Common.ObjectWrapper.ObjectWrapper();
      networkManager.target = () => ({
        model: () => null,
      });
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
      const mockResponseReceivedEventWithHeaders = (headers: Protocol.Network.Headers) => {
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
          SDK.NetworkManager.MultitargetNetworkManager.Events.REQUEST_INTERCEPTED, 'mockId');
      networkDispatcher.responseReceived(mockResponseReceivedEventWithHeaders({'test-header': 'third'}));
      assert.deepEqual(
          networkDispatcher.requestForId('mockId')?.responseHeaders, [{name: 'test-header', value: 'third'}]);
    });

    it('has populated \'originalHeaders\' after receiving \'responseReceivedExtraInfo\'', () => {
      const responseReceivedExtraInfoEvent = {
        requestId: 'mockId' as Protocol.Network.RequestId,
        blockedCookies: [],
        headers: {
          'test-header': 'first',
          'set-cookie': 'foo=bar\ncolor=green',
        } as Protocol.Network.Headers,
        resourceIPAddressSpace: Protocol.Network.IPAddressSpace.Public,
        statusCode: 200,
      } as Protocol.Network.ResponseReceivedExtraInfoEvent;

      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.responseReceivedExtraInfo(responseReceivedExtraInfoEvent);

      assert.deepEqual(networkDispatcher.requestForId('mockId')?.responseHeaders, [
        {name: 'test-header', value: 'first'},
        {name: 'set-cookie', value: 'foo=bar'},
        {name: 'set-cookie', value: 'color=green'},
      ]);
    });

    it('Correctly set early hints properties on receivedResponse event', () => {
      const responseReceivedEvent = {
        requestId: 'mockId',
        loaderId: 'mockLoaderId',
        frameId: 'mockFrameId',
        timestamp: 581734.083213,
        type: Protocol.Network.ResourceType.Document,
        response: {
          url: 'example.com',
          status: 200,
          statusText: '',
          headers: {
            'test-header': 'first',
          } as Protocol.Network.Headers,
          mimeType: 'text/html',
          connectionReused: true,
          connectionId: 12345,
          encodedDataLength: 100,
          securityState: 'secure',
          fromEarlyHints: true,
        } as Protocol.Network.Response,
      } as Protocol.Network.ResponseReceivedEvent;

      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.responseReceived(responseReceivedEvent);

      assert.isTrue(networkDispatcher.requestForId('mockId')?.fromEarlyHints());
    });

    it('has populated early hints headers after receiving \'repsonseReceivedEarlyHints\'', () => {
      const earlyHintsEvent = {
        requestId: 'mockId' as Protocol.Network.RequestId,
        headers: {
          link: '</style.css>; as=style;',
        } as Protocol.Network.Headers,
      };
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent);
      networkDispatcher.loadingFinished(loadingFinishedEvent);
      networkDispatcher.responseReceivedEarlyHints(earlyHintsEvent);

      assert.deepEqual(networkDispatcher.requestForId('mockId')?.earlyHintsHeaders, [
        {name: 'link', value: '</style.css>; as=style;'},
      ]);
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

describeWithMockConnection('InterceptedRequest', () => {
  let target: SDK.Target.Target;
  let fulfillRequestSpy: sinon.SinonSpy;

  async function checkRequestOverride(
      target: SDK.Target.Target, request: Protocol.Network.Request, requestId: Protocol.Fetch.RequestId,
      responseStatusCode: number, responseHeaders: Protocol.Fetch.HeaderEntry[], responseBody: string,
      expectedOverriddenResponse: OverriddenResponse, expectedSetCookieHeaders: Protocol.Fetch.HeaderEntry[] = []) {
    const multitargetNetworkManager = SDK.NetworkManager.MultitargetNetworkManager.instance();
    const fetchAgent = target.fetchAgent();

    const fulfilledRequest = new Promise(resolve => {
      multitargetNetworkManager.addEventListener(
          SDK.NetworkManager.MultitargetNetworkManager.Events.REQUEST_FULFILLED, resolve);
    });
    const networkRequest = SDK.NetworkRequest.NetworkRequest.create(
        requestId as unknown as Protocol.Network.RequestId, urlString`${request.url}`, urlString`${request.url}`, null,
        null, null);

    networkRequest.originalResponseHeaders = responseHeaders;

    // The response headers passed to 'interceptedRequest' do not contain any
    // 'set-cookie' headers, because they originate from CDP's 'Fetch.requestPaused'
    // which receives its header information via mojo which in turn filters out
    // 'set-cookie' headers.
    const filteredResponseHeaders = responseHeaders.filter(header => header.name !== 'set-cookie');
    const interceptedRequest = new SDK.NetworkManager.InterceptedRequest(
        fetchAgent, request, Protocol.Network.ResourceType.Document, requestId, networkRequest, responseStatusCode,
        filteredResponseHeaders);
    interceptedRequest.responseBody = async () => {
      return new TextUtils.ContentData.ContentData(responseBody, false, 'text/html');
    };

    assert.isTrue(fulfillRequestSpy.notCalled);
    await multitargetNetworkManager.requestIntercepted(interceptedRequest);
    await fulfilledRequest;
    assert.isTrue(fulfillRequestSpy.calledOnceWithExactly(expectedOverriddenResponse));
    assert.deepEqual(networkRequest.setCookieHeaders, expectedSetCookieHeaders);
    fulfillRequestSpy.resetHistory();
  }

  async function checkSetCookieOverride(
      url: string, headersFromServer: Protocol.Fetch.HeaderEntry[],
      expectedOverriddenHeaders: Protocol.Fetch.HeaderEntry[],
      expectedPersistedSetCookieHeaders: Protocol.Fetch.HeaderEntry[]): Promise<void> {
    const responseCode = 200;
    const requestId = 'request_id_for_cookies' as Protocol.Fetch.RequestId;
    const responseBody = 'interceptedRequest content';
    const networkRequest = {
      method: 'GET',
      url,
    } as Protocol.Network.Request;
    await checkRequestOverride(
        target, networkRequest, requestId, responseCode, headersFromServer, responseBody, {
          requestId,
          responseCode,
          body: btoa(responseBody),
          responseHeaders: expectedOverriddenHeaders,
        },
        expectedPersistedSetCookieHeaders);
  }

  beforeEach(async () => {
    SDK.NetworkManager.MultitargetNetworkManager.dispose();
    target = createTarget();
    const networkPersistenceManager = await createWorkspaceProject(urlString`file:///path/to/overrides`, [
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
            },
            {
              "applyTo": "withCookie.html",
              "headers": [{
                "name": "set-cookie",
                "value": "userId=12345"
              }]
            },
            {
              "applyTo": "withCookie2.html",
              "headers": [
                {
                  "name": "set-cookie",
                  "value": "userName=DevTools"
                },
                {
                  "name": "set-cookie",
                  "value": "themeColour=dark"
                }
              ]
            },
            {
              "applyTo": "withCookie3.html",
              "headers": [
                {
                  "name": "set-cookie",
                  "value": "userName=DevTools"
                },
                {
                  "name": "set-cookie",
                  "value": "malformed_override"
                }
              ]
            },
            {
              "applyTo": "cookies/*",
              "headers": [
                {
                  "name": "set-cookie",
                  "value": "unique=value"
                },
                {
                  "name": "set-cookie",
                  "value": "override-me=first"
                }
              ]
            },
            {
              "applyTo": "cookies/mergeCookies.html",
              "headers": [
                {
                  "name": "set-cookie",
                  "value": "override-me=second"
                },
                {
                  "name": "set-cookie",
                  "value": "foo=bar"
                }
              ]
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
      {name: 'utf16.html', path: 'www.example.com/', content: 'Overwritten with non-UTF16 (TODO: fix this!)'},
      {name: 'something.html', path: 'file:/usr/local/foo/content/', content: 'Override for something'},
      {
        name: '.headers',
        path: 'file:/usr/local/example/',
        content: `[
            {
              "applyTo": "*",
              "headers": [{
                "name": "test-file-urls",
                "value": "file url value"
              }]
            }
          ]`,
      },
      {name: 'index.html', path: 'file:/usr/local/example/', content: 'Overridden file content'},
      {
        name: '.headers',
        path: 'www.longurl.com/longurls/',
        content: `[
            {
              "applyTo": "index.html-${
            Platform.StringUtilities.hashCode('www.longurl.com/' + LONG_URL_PART).toString(16)}.html",
              "headers": [{
                "name": "long-url-header",
                "value": "long url header value"
              }]
            }
          ]`,
      },
      {
        name: `index.html-${Platform.StringUtilities.hashCode('www.longurl.com/' + LONG_URL_PART).toString(16)}.html`,
        path: 'www.longurl.com/longurls/',
        content: 'Overridden long URL file content',
      },
      {
        name: '.headers',
        path: 'file:/longurls/',
        content: `[
            {
              "applyTo": "index.html-${
            Platform.StringUtilities
                .hashCode(
                    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.encodeEncodedPathToLocalPathParts(
                        'file:' as Platform.DevToolsPath.EncodedPathString)[0] +
                    '/' + LONG_URL_PART)
                .toString(16)}.html",
              "headers": [{
                "name": "long-file-url-header",
                "value": "long file url header value"
              }]
            }
          ]`,
      },
    ]);
    sinon.stub(target.fetchAgent(), 'invoke_enable');
    fulfillRequestSpy = sinon.spy(target.fetchAgent(), 'invoke_fulfillRequest');
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
          body: btoa(responseBody),
          responseHeaders: [
            {name: 'css-only', value: 'only added to css files'},
            {name: 'age', value: 'overridden'},
            {name: 'content-type', value: 'text/html; charset=utf-8'},
          ],
        });
  });

  it('does not intercept OPTIONS requests', async () => {
    const requestId = 'request_id_1' as Protocol.Fetch.RequestId;
    const request = {
      method: 'OPTIONS',
      url: 'https://www.example.com/styles.css',
    } as Protocol.Network.Request;
    const fetchAgent = target.fetchAgent();
    const continueRequestSpy = sinon.spy(fetchAgent, 'invoke_continueRequest');

    const networkRequest = SDK.NetworkRequest.NetworkRequest.create(
        requestId as unknown as Protocol.Network.RequestId, urlString`${request.url}`, urlString`${request.url}`, null,
        null, null);

    const interceptedRequest = new SDK.NetworkManager.InterceptedRequest(
        fetchAgent, request, Protocol.Network.ResourceType.Document, requestId, networkRequest);
    interceptedRequest.responseBody = async () => {
      return new TextUtils.ContentData.ContentData('interceptedRequest content', false, 'text/html');
    };

    assert.isTrue(continueRequestSpy.notCalled);
    await SDK.NetworkManager.MultitargetNetworkManager.instance().requestIntercepted(interceptedRequest);
    assert.isTrue(fulfillRequestSpy.notCalled);
    assert.isTrue(continueRequestSpy.calledOnce);
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

  describe('NetworkPersistenceManager', () => {
    it('decodes the intercepted response body with the right charset', async () => {
      const requestId = 'request_id_utf_16' as Protocol.Fetch.RequestId;
      const request = {
        method: 'GET',
        url: 'https://www.example.com/utf16.html',
      } as Protocol.Network.Request;
      const fetchAgent = target.fetchAgent();
      sinon.spy(fetchAgent, 'invoke_continueRequest');

      const networkRequest = SDK.NetworkRequest.NetworkRequest.create(
          requestId as unknown as Protocol.Network.RequestId, urlString`${request.url}`, urlString`${request.url}`,
          null, null, null);
      networkRequest.originalResponseHeaders = [{name: 'content-type', value: 'text/html; charset-utf-16'}];

      // Create a quick'n dirty network UISourceCode for the request manually. We need to establish a binding to the
      // overridden file system UISourceCode.
      const networkProject = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
          Workspace.Workspace.WorkspaceImpl.instance(), 'testing-network', Workspace.Workspace.projectTypes.Network,
          'Override network project', false);
      Workspace.Workspace.WorkspaceImpl.instance().addProject(networkProject);
      const uiSourceCode = networkProject.createUISourceCode(
          urlString`https://www.example.com/utf16.html`, Common.ResourceType.resourceTypes.Document);
      networkProject.addUISourceCode(uiSourceCode);

      const interceptedRequest = new SDK.NetworkManager.InterceptedRequest(
          fetchAgent, request, Protocol.Network.ResourceType.Document, requestId, networkRequest, 200,
          [{name: 'content-type', value: 'text/html; charset-utf-16'}]);
      interceptedRequest.responseBody = async () => {
        // Very simple HTML doc base64 encoded.
        return new TextUtils.ContentData.ContentData(
            '//48ACEARABPAEMAVABZAFAARQAgAGgAdABtAGwAPgAKADwAcAA+AEkA8QB0AOsAcgBuAOIAdABpAPQAbgDgAGwAaQB6AOYAdABpAPgAbgADJjTYBt88AC8AcAA+AAoA',
            true, 'text/html', 'utf-16');
      };

      await SDK.NetworkManager.MultitargetNetworkManager.instance().requestIntercepted(interceptedRequest);
      const content = await Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance()
                          .originalContentForUISourceCode(uiSourceCode);

      assert.strictEqual(content, '<!DOCTYPE html>\n<p>Iñtërnâtiônàlizætiøn☃𝌆</p>\n');
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
          body: btoa(responseBody),
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

  it('can override headers and content for a request with a \'file:/\'-URL', async () => {
    const responseCode = 200;
    const requestId = 'request_id_8' as Protocol.Fetch.RequestId;
    const responseBody = 'interceptedRequest content';
    await checkRequestOverride(
        target, {
          method: 'GET',
          url: 'file:///usr/local/example/index.html',
        } as Protocol.Network.Request,
        requestId, responseCode,
        [
          {name: 'content-type', value: 'text/html; charset=utf-8'},
          {name: 'age', value: 'original'},
        ],
        responseBody, {
          requestId,
          responseCode,
          body: btoa('Overridden file content'),
          responseHeaders: [
            {name: 'test-file-urls', value: 'file url value'},
            {name: 'age', value: 'overridden'},
            {name: 'content-type', value: 'text/html; charset=utf-8'},
          ],
        });
  });

  it('can apply global header overrides to a request with a \'file:/\'-URL', async () => {
    const responseCode = 200;
    const requestId = 'request_id_9' as Protocol.Fetch.RequestId;
    const responseBody = 'content of something/index.html';
    await checkRequestOverride(
        target, {
          method: 'GET',
          url: 'file:///usr/local/whatever/index.html',
        } as Protocol.Network.Request,
        requestId, responseCode,
        [
          {name: 'content-type', value: 'text/html; charset=utf-8'},
          {name: 'age', value: 'original'},
        ],
        responseBody, {
          requestId,
          responseCode,
          body: btoa(responseBody),
          responseHeaders: [
            {name: 'age', value: 'overridden'},
            {name: 'content-type', value: 'text/html; charset=utf-8'},
          ],
        });
  });

  it('can override headers and content for a request with a very long URL', async () => {
    const responseCode = 200;
    const requestId = 'request_id_10' as Protocol.Fetch.RequestId;
    const responseBody = 'interceptedRequest content';
    await checkRequestOverride(
        target, {
          method: 'GET',
          url: `https://www.longurl.com/${LONG_URL_PART}`,
        } as Protocol.Network.Request,
        requestId, responseCode,
        [
          {name: 'content-type', value: 'text/html; charset=utf-8'},
          {name: 'age', value: 'original'},
        ],
        responseBody, {
          requestId,
          responseCode,
          body: btoa('Overridden long URL file content'),
          responseHeaders: [
            {name: 'long-url-header', value: 'long url header value'},
            {name: 'age', value: 'overridden'},
            {name: 'content-type', value: 'text/html; charset=utf-8'},
          ],
        });
  });

  it('can override headers for a request with a very long \'file:/\'-URL', async () => {
    const responseCode = 200;
    const requestId = 'request_id_11' as Protocol.Fetch.RequestId;
    const responseBody = 'interceptedRequest content';
    await checkRequestOverride(
        target, {
          method: 'GET',
          url: 'file:///' + LONG_URL_PART,
        } as Protocol.Network.Request,
        requestId, responseCode,
        [
          {name: 'content-type', value: 'text/html; charset=utf-8'},
          {name: 'age', value: 'original'},
        ],
        responseBody, {
          requestId,
          responseCode,
          body: btoa(responseBody),
          responseHeaders: [
            {name: 'long-file-url-header', value: 'long file url header value'},
            {name: 'age', value: 'overridden'},
            {name: 'content-type', value: 'text/html; charset=utf-8'},
          ],
        });
  });

  it('can override \'set-cookie\' headers', async () => {
    const headersFromServer = [{name: 'content-type', value: 'text/html; charset=utf-8'}];
    const expectedOverriddenHeaders = [
      {name: 'age', value: 'overridden'},
      {name: 'content-type', value: 'text/html; charset=utf-8'},
      {name: 'set-cookie', value: 'userId=12345'},
    ];
    const expectedPersistedSetCookieHeaders = [{name: 'set-cookie', value: 'userId=12345'}];
    await checkSetCookieOverride(
        'https://www.example.com/withCookie.html', headersFromServer, expectedOverriddenHeaders,
        expectedPersistedSetCookieHeaders);
  });

  it('marks both requests as overridden when there are 2 requests with the same URL', async () => {
    const responseCode = 200;
    const requestId1 = 'request_id_1' as Protocol.Fetch.RequestId;
    const requestId2 = 'request_id_2' as Protocol.Fetch.RequestId;
    const body = 'interceptedRequest content';
    const request = {
      method: 'GET',
      url: 'https://www.example.com/styles.css',
    } as Protocol.Network.Request;
    const originalResponseHeaders = [{name: 'content-type', value: 'text/html; charset=utf-8'}];
    const responseHeaders = [
      {name: 'css-only', value: 'only added to css files'},
      {name: 'age', value: 'overridden'},
      {name: 'content-type', value: 'text/html; charset=utf-8'},
    ];

    const {dispatcher} = target.model(SDK.NetworkManager.NetworkManager)!;
    dispatcher.requestWillBeSent({requestId: requestId1 as string, request} as Protocol.Network.RequestWillBeSentEvent);
    dispatcher.requestWillBeSent({requestId: requestId2 as string, request} as Protocol.Network.RequestWillBeSentEvent);

    await checkRequestOverride(target, request, requestId1, responseCode, originalResponseHeaders, body, {
      requestId: requestId1,
      responseCode,
      body: btoa(body),
      responseHeaders,
    });
    await checkRequestOverride(target, request, requestId2, responseCode, originalResponseHeaders, body, {
      requestId: requestId2,
      responseCode,
      body: btoa(body),
      responseHeaders,
    });
    assert.isTrue(dispatcher.requestForId(requestId1)?.wasIntercepted());
    assert.isTrue(dispatcher.requestForId(requestId2)?.wasIntercepted());
  });

  it('stores \'set-cookie\' headers on the request', async () => {
    const headersFromServer = [{name: 'set-cookie', value: 'foo=bar'}];
    const expectedOverriddenHeaders = [
      {name: 'age', value: 'overridden'},
    ];
    const expectedPersistedSetCookieHeaders = [{name: 'set-cookie', value: 'foo=bar'}];
    await checkSetCookieOverride(
        'https://www.example.com/noCookie.html', headersFromServer, expectedOverriddenHeaders,
        expectedPersistedSetCookieHeaders);
  });

  it('can override \'set-cookie\' headers when there server also sends \'set-cookie\' headers', async () => {
    const headersFromServer = [{name: 'set-cookie', value: 'foo=bar'}];
    const expectedOverriddenHeaders = [
      {name: 'age', value: 'overridden'},
      {name: 'set-cookie', value: 'userId=12345'},
    ];
    const expectedPersistedSetCookieHeaders =
        [{name: 'set-cookie', value: 'foo=bar'}, {name: 'set-cookie', value: 'userId=12345'}];
    await checkSetCookieOverride(
        'https://www.example.com/withCookie.html', headersFromServer, expectedOverriddenHeaders,
        expectedPersistedSetCookieHeaders);
  });

  it('can overwrite a cookie value from server with a cookie value from overrides', async () => {
    const headersFromServer = [{name: 'set-cookie', value: 'userId=999'}];
    const expectedOverriddenHeaders = [
      {name: 'age', value: 'overridden'},
      {name: 'set-cookie', value: 'userId=12345'},
    ];
    const expectedPersistedSetCookieHeaders = [{name: 'set-cookie', value: 'userId=12345'}];
    await checkSetCookieOverride(
        'https://www.example.com/withCookie.html', headersFromServer, expectedOverriddenHeaders,
        expectedPersistedSetCookieHeaders);
  });

  it('correctly merges cookies from server and from overrides', async () => {
    const headersFromServer = [
      {name: 'set-cookie', value: 'foo=bar'},
      {name: 'set-cookie', value: 'userName=server'},
    ];
    const expectedOverriddenHeaders = [
      {name: 'age', value: 'overridden'},
      {name: 'set-cookie', value: 'userName=DevTools'},
      {name: 'set-cookie', value: 'themeColour=dark'},
    ];
    const expectedPersistedSetCookieHeaders = [
      {name: 'set-cookie', value: 'foo=bar'},
      {name: 'set-cookie', value: 'userName=DevTools'},
      {name: 'set-cookie', value: 'themeColour=dark'},
    ];
    await checkSetCookieOverride(
        'https://www.example.com/withCookie2.html', headersFromServer, expectedOverriddenHeaders,
        expectedPersistedSetCookieHeaders);
  });

  it('correctly merges malformed cookies from server and from overrides', async () => {
    const headersFromServer = [
      {name: 'set-cookie', value: 'malformed_original'},
      {name: 'set-cookie', value: 'userName=server'},
    ];
    const expectedOverriddenHeaders = [
      {name: 'age', value: 'overridden'},
      {name: 'set-cookie', value: 'userName=DevTools'},
      {name: 'set-cookie', value: 'malformed_override'},
    ];
    const expectedPersistedSetCookieHeaders = [
      {name: 'set-cookie', value: 'malformed_original'},
      {name: 'set-cookie', value: 'userName=DevTools'},
      {name: 'set-cookie', value: 'malformed_override'},
    ];
    await checkSetCookieOverride(
        'https://www.example.com/withCookie3.html', headersFromServer, expectedOverriddenHeaders,
        expectedPersistedSetCookieHeaders);
  });

  it('correctly merges \'set-cookie\' headers from server with multiple defined overrides', async () => {
    const headersFromServer = [
      {name: 'set-cookie', value: 'userName=server'},
      {name: 'set-cookie', value: 'override-me=zero'},
    ];
    const expectedOverriddenHeaders = [
      {name: 'age', value: 'overridden'},
      {name: 'set-cookie', value: 'unique=value'},
      {name: 'set-cookie', value: 'override-me=second'},
      {name: 'set-cookie', value: 'foo=bar'},
    ];
    const expectedPersistedSetCookieHeaders = [
      {name: 'set-cookie', value: 'userName=server'},
      {name: 'set-cookie', value: 'override-me=second'},
      {name: 'set-cookie', value: 'unique=value'},
      {name: 'set-cookie', value: 'foo=bar'},
    ];
    await checkSetCookieOverride(
        'https://www.example.com/cookies/mergeCookies.html', headersFromServer, expectedOverriddenHeaders,
        expectedPersistedSetCookieHeaders);
  });

  it('correctly merges \'set-cookie\' headers with duplicates', () => {
    const original = [
      {name: 'set-cookie', value: 'foo=original'},
      {name: 'set-cookie', value: 'bar=original'},
      {name: 'set-cookie', value: 'baz=original'},
      {name: 'set-cookie', value: 'duplicate=duplicate'},
      {name: 'set-cookie', value: 'duplicate=duplicate'},
      {name: 'set-cookie', value: 'duplicate2=duplicate2'},
      {name: 'set-cookie', value: 'duplicate2=duplicate2'},
      {name: 'set-cookie', value: 'duplicate3=duplicate3'},
      {name: 'set-cookie', value: 'duplicate3=duplicate3'},
      {name: 'set-cookie', value: 'malformed'},
      {name: 'set-cookie', value: 'both'},
      {name: 'set-cookie', value: 'double'},
      {name: 'set-cookie', value: 'double'},
      {name: 'set-cookie', value: 'original_duplicate'},
      {name: 'set-cookie', value: 'original_duplicate'},
      {name: 'set-cookie', value: 'override_duplicate'},
    ];
    const overrides = [
      {name: 'set-cookie', value: 'bar=overridden'},
      {name: 'set-cookie', value: 'baz=overridden1'},
      {name: 'set-cookie', value: 'baz=overridden2'},
      {name: 'set-cookie', value: 'duplicate2=overridden'},
      {name: 'set-cookie', value: 'duplicate3=overridden'},
      {name: 'set-cookie', value: 'duplicate3=overridden'},
      {name: 'set-cookie', value: 'malformed_override'},
      {name: 'set-cookie', value: 'both'},
      {name: 'set-cookie', value: 'original_duplicate'},
      {name: 'set-cookie', value: 'override_duplicate'},
      {name: 'set-cookie', value: 'override_duplicate'},
    ];
    const expected = [
      {name: 'set-cookie', value: 'foo=original'},
      {name: 'set-cookie', value: 'bar=overridden'},
      {name: 'set-cookie', value: 'baz=overridden1'},
      {name: 'set-cookie', value: 'baz=overridden2'},
      {name: 'set-cookie', value: 'duplicate=duplicate'},
      {name: 'set-cookie', value: 'duplicate=duplicate'},
      {name: 'set-cookie', value: 'duplicate2=overridden'},
      {name: 'set-cookie', value: 'duplicate3=overridden'},
      {name: 'set-cookie', value: 'duplicate3=overridden'},
      {name: 'set-cookie', value: 'malformed'},
      {name: 'set-cookie', value: 'both'},
      {name: 'set-cookie', value: 'double'},
      {name: 'set-cookie', value: 'double'},
      {name: 'set-cookie', value: 'original_duplicate'},
      {name: 'set-cookie', value: 'override_duplicate'},
      {name: 'set-cookie', value: 'override_duplicate'},
      {name: 'set-cookie', value: 'malformed_override'},
    ];
    assert.deepEqual(SDK.NetworkManager.InterceptedRequest.mergeSetCookieHeaders(original, overrides), expected);
  });
});
