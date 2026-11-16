// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Protocol from '../../generated/protocol.js';
import {expectCookie} from '../../testing/Cookies.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import {mockResourceTree} from '../../testing/ResourceTreeHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;

describe('NetworkRequest', () => {
  it('can parse statusText from the first line of responseReceivedExtraInfo\'s headersText', () => {
    assert.strictEqual(
        SDK.NetworkRequest.NetworkRequest.parseStatusTextFromResponseHeadersText('HTTP/1.1 304 not modified'),
        'not modified');
    assert.strictEqual(
        SDK.NetworkRequest.NetworkRequest.parseStatusTextFromResponseHeadersText('HTTP/1.1 200 OK'), 'OK');
    assert.strictEqual(
        SDK.NetworkRequest.NetworkRequest.parseStatusTextFromResponseHeadersText('HTTP/1.1 200 OK\r\n\r\nfoo: bar\r\n'),
        'OK');
  });

  it('parses response cookies from headers', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', urlString`url`, urlString`documentURL`, null);
    request.addExtraResponseInfo({
      blockedResponseCookies: [],
      responseHeaders: [{name: 'Set-Cookie', value: 'foo=bar'}, {name: 'Set-Cookie', value: 'baz=qux'}],
      resourceIPAddressSpace: 'Public' as Protocol.Network.IPAddressSpace,
    } as unknown as SDK.NetworkRequest.ExtraResponseInfo);
    assert.lengthOf(request.responseCookies, 2);
    expectCookie(request.responseCookies[0], {name: 'foo', value: 'bar', size: 8});
    expectCookie(request.responseCookies[1], {name: 'baz', value: 'qux', size: 7});
  });

  it('infers status text from status code if none given', () => {
    const fakeRequest = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'fakeRequestId',
        urlString`url1`,
        urlString`documentURL`,
        null,
    );
    fakeRequest.statusCode = 200;

    assert.strictEqual(fakeRequest.statusText, '');
    assert.strictEqual(fakeRequest.getInferredStatusText(), 'OK');
  });

  it('does not infer status text from unknown status code', () => {
    const fakeRequest = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'fakeRequestId',
        urlString`url1`,
        urlString`documentURL`,
        null,
    );
    fakeRequest.statusCode = 999;

    assert.strictEqual(fakeRequest.statusText, '');
    assert.strictEqual(fakeRequest.getInferredStatusText(), '');
  });

  it('infers status text only when no status text given', () => {
    const fakeRequest = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'fakeRequestId',
        urlString`url1`,
        urlString`documentURL`,
        null,
    );
    fakeRequest.statusCode = 200;
    fakeRequest.statusText = 'Prefer me';

    assert.strictEqual(fakeRequest.statusText, 'Prefer me');
    assert.strictEqual(fakeRequest.getInferredStatusText(), 'Prefer me');
  });

  it('includes partition key in response cookies', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', urlString`url`, urlString`documentURL`, null);
    request.addExtraResponseInfo({
      blockedResponseCookies: [],
      responseHeaders:
          [{name: 'Set-Cookie', value: 'foo=bar'}, {name: 'Set-Cookie', value: 'baz=qux; Secure;Partitioned'}],
      resourceIPAddressSpace: 'Public' as Protocol.Network.IPAddressSpace,
      cookiePartitionKey: {topLevelSite: 'partitionKey', hasCrossSiteAncestor: false},
    } as unknown as SDK.NetworkRequest.ExtraResponseInfo);
    assert.lengthOf(request.responseCookies, 2);
    expectCookie(request.responseCookies[0], {name: 'foo', value: 'bar', size: 8});
    expectCookie(request.responseCookies[1], {
      name: 'baz',
      value: 'qux',
      secure: true,
      partitionKey: {topLevelSite: 'partitionKey', hasCrossSiteAncestor: false},
      size: 27,
    });
  });

  it('determines whether the response headers have been overridden', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', urlString`url`, urlString`documentURL`, null);
    request.responseHeaders = [{name: 'foo', value: 'bar'}];

    request.originalResponseHeaders = [{name: 'foo', value: 'baz'}];
    assert.isTrue(request.hasOverriddenHeaders());

    request.originalResponseHeaders = [];
    assert.isFalse(request.hasOverriddenHeaders());

    request.originalResponseHeaders = [{name: 'Foo', value: 'bar'}];
    assert.isFalse(request.hasOverriddenHeaders());

    request.originalResponseHeaders = [{name: 'Foo', value: 'Bar'}];
    assert.isTrue(request.hasOverriddenHeaders());

    request.responseHeaders = [{name: 'one', value: 'first'}, {name: 'two', value: 'second'}];
    request.originalResponseHeaders = [{name: 'ONE', value: 'first'}, {name: 'Two', value: 'second'}];
    assert.isFalse(request.hasOverriddenHeaders());

    request.originalResponseHeaders = [{name: 'one', value: 'first'}];
    assert.isTrue(request.hasOverriddenHeaders());

    request.originalResponseHeaders = [{name: 'two', value: 'second'}, {name: 'one', value: 'first'}];
    assert.isFalse(request.hasOverriddenHeaders());

    request.originalResponseHeaders = [{name: 'one', value: 'second'}, {name: 'two', value: 'first'}];
    assert.isTrue(request.hasOverriddenHeaders());

    request.originalResponseHeaders =
        [{name: 'one', value: 'first'}, {name: 'two', value: 'second'}, {name: 'two', value: 'second'}];
    assert.isTrue(request.hasOverriddenHeaders());
  });

  it('considers duplicate headers which only differ in the order of their values as overridden', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', urlString`url`, urlString`documentURL`, null);
    request.responseHeaders = [{name: 'duplicate', value: 'first'}, {name: 'duplicate', value: 'second'}];
    request.originalResponseHeaders = [{name: 'duplicate', value: 'second'}, {name: 'duplicate', value: 'first'}];
    assert.isTrue(request.hasOverriddenHeaders());
  });

  it('can handle the case of duplicate cookies with only 1 of them being blocked', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`url`, urlString`documentURL`, null, null, null);
    request.addExtraResponseInfo({
      responseHeaders: [{name: 'Set-Cookie', value: 'foo=duplicate; Path=/\nfoo=duplicate; Path=/'}],
      blockedResponseCookies: [{
        blockedReasons: [Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure],
        cookie: null,
        cookieLine: 'foo=duplicate; Path=/',
      }],
      resourceIPAddressSpace: Protocol.Network.IPAddressSpace.Public,
      statusCode: undefined,
      cookiePartitionKey: undefined,
      cookiePartitionKeyOpaque: undefined,
      exemptedResponseCookies: undefined,
    });

    assert.deepEqual(
        request.responseCookies.map(cookie => cookie.getCookieLine()),
        ['foo=duplicate; Path=/', 'foo=duplicate; Path=/']);
    assert.deepEqual(request.blockedResponseCookies(), [{
                       blockedReasons: [Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure],
                       cookie: null,
                       cookieLine: 'foo=duplicate; Path=/',
                     }]);
    assert.deepEqual(
        request.nonBlockedResponseCookies().map(cookie => cookie.getCookieLine()), ['foo=duplicate; Path=/']);
  });

  it('can handle the case of exempted cookies', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`url`, urlString`documentURL`, null, null, null);

    const cookie = new SDK.Cookie.Cookie('name', 'value');
    cookie.addAttribute(SDK.Cookie.Attribute.SAME_SITE, 'None');
    cookie.addAttribute(SDK.Cookie.Attribute.SECURE, true);
    cookie.setCookieLine('name=value; Path=/; SameSite=None; Secure;');
    request.addExtraResponseInfo({
      responseHeaders: [{name: 'Set-Cookie', value: cookie.getCookieLine() as string}],
      blockedResponseCookies: [],
      resourceIPAddressSpace: Protocol.Network.IPAddressSpace.Public,
      statusCode: undefined,
      cookiePartitionKey: undefined,
      cookiePartitionKeyOpaque: undefined,
      exemptedResponseCookies: [{
        cookie,
        cookieLine: cookie.getCookieLine() as string,
        exemptionReason: Protocol.Network.CookieExemptionReason.UserSetting,
      }],
    });

    assert.deepEqual(
        request.responseCookies.map(cookie => cookie.getCookieLine()), ['name=value; Path=/; SameSite=None; Secure;']);
    assert.deepEqual(
        request.nonBlockedResponseCookies().map(cookie => cookie.getCookieLine()),
        ['name=value; Path=/; SameSite=None; Secure;']);
    assert.deepEqual(
        request.exemptedResponseCookies().map(cookie => cookie.cookie.getCookieLine()),
        ['name=value; Path=/; SameSite=None; Secure;']);
    assert.deepEqual(request.exemptedResponseCookies().map(cookie => cookie.exemptionReason),
                     [Protocol.Network.CookieExemptionReason.UserSetting]);

    request.addExtraRequestInfo({
      blockedRequestCookies: [],
      requestHeaders: [],
      includedRequestCookies: [{exemptionReason: Protocol.Network.CookieExemptionReason.EnterprisePolicy, cookie}],
      connectTiming: {requestTime: 0},
    });

    assert.deepEqual(
        request.includedRequestCookies().map(included => included.cookie.getCookieLine()),
        ['name=value; Path=/; SameSite=None; Secure;']);
    assert.deepEqual(
        request.includedRequestCookies().map(included => included.exemptionReason),
        [Protocol.Network.CookieExemptionReason.EnterprisePolicy]);
  });

  it('preserves order of headers in case of duplicates', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', urlString`url`, urlString`documentURL`, null);
    const responseHeaders = [{name: '1ab', value: 'middle'}, {name: '1aB', value: 'last'}];
    request.addExtraResponseInfo({
      blockedResponseCookies: [],
      responseHeaders,
      resourceIPAddressSpace: 'Public' as Protocol.Network.IPAddressSpace,
    } as unknown as SDK.NetworkRequest.ExtraResponseInfo);
    assert.deepEqual(request.sortedResponseHeaders, responseHeaders);
  });

  it('treats multiple headers with the same name the same as single header with comma-separated values', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', urlString`url`, urlString`documentURL`, null);
    request.responseHeaders = [{name: 'duplicate', value: 'first, second'}];
    request.originalResponseHeaders = [{name: 'duplicate', value: 'first'}, {name: 'duplicate', value: 'second'}];
    assert.isFalse(request.hasOverriddenHeaders());
  });

  it('determines whether the request is a preload request', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest('requestId', urlString`url`,
                                                                                  urlString`documentURL`, null);
    assert.isFalse(request.isPreloadRequest());

    const preloadRequest = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', urlString`url`, urlString`documentURL`, {type: Protocol.Network.InitiatorType.Preload});
    assert.isTrue(preloadRequest.isPreloadRequest());
  });
});

describe('NetworkRequest (MockConnection)', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();
  let cookie: SDK.Cookie.Cookie;
  let addBlockedCookieSpy: sinon.SinonSpy;
  let target: SDK.Target.Target;
  let universe: TestUniverse;
  let connection: MockCDPConnection;

  beforeEach(() => {
    universe = new TestUniverse();
    connection = new MockCDPConnection();
    mockResourceTree(connection);
    target = universe.createTarget({connection});
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    sinon.stub(SDK.NetworkManager.NetworkManager, 'forRequest').returns(networkManager);
    cookie = new SDK.Cookie.Cookie('name', 'value');
    addBlockedCookieSpy = sinon.spy(SDK.CookieModel.CookieModel.prototype, 'addBlockedCookie');
  });

  it('adds blocked response cookies to - and removes exempted cookies from cookieModel', async () => {
    const removeBlockedCookieSpy = sinon.spy(SDK.CookieModel.CookieModel.prototype, 'removeBlockedCookie');
    connection.setSuccessHandler('Network.getCookies', () => ({cookies: []}));
    const cookieModel = target.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel);
    const url = urlString`url`;
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, url, urlString`documentURL`, null, null, null);

    request.addExtraResponseInfo({
      responseHeaders: [{name: 'Set-Cookie', value: 'name=value; Path=/'}],
      blockedResponseCookies: [{
        blockedReasons: [Protocol.Network.SetCookieBlockedReason.ThirdPartyPhaseout],
        cookie,
        cookieLine: 'name=value; Path=/',
      }],
      resourceIPAddressSpace: Protocol.Network.IPAddressSpace.Public,
      statusCode: undefined,
      cookiePartitionKey: undefined,
      cookiePartitionKeyOpaque: undefined,
      exemptedResponseCookies: undefined,
    });
    assert.isTrue(addBlockedCookieSpy.calledOnceWith(cookie, [
      {
        attribute: null,
        uiString:
            'Setting this cookie was blocked either because of Chrome flags or browser configuration. Learn more in the Issues panel.',
      },
    ]));
    assert.deepEqual(await cookieModel.getCookiesForDomain(''), [cookie]);

    request.addExtraResponseInfo({
      responseHeaders: [{name: 'Set-Cookie', value: 'name=value; Path=/'}],
      blockedResponseCookies: [],
      resourceIPAddressSpace: Protocol.Network.IPAddressSpace.Public,
      statusCode: undefined,
      cookiePartitionKey: undefined,
      cookiePartitionKeyOpaque: undefined,
      exemptedResponseCookies: [{
        cookie,
        cookieLine: cookie.getCookieLine() as string,
        exemptionReason: Protocol.Network.CookieExemptionReason.UserSetting,
      }],
    });
    assert.isTrue(removeBlockedCookieSpy.calledOnceWith(cookie));
    assert.isEmpty(await cookieModel.getCookiesForDomain(''));
  });

  it('searches cached contentData locally without calling Network.searchInResponseBody', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        urlString`https://www.google.com/`,
        urlString`https://www.google.com/`,
        null,
        null,
        null,
    );
    request.mimeType = 'text/html';
    request.finished = true;

    connection.setSuccessHandler('Network.getResponseBody', () => ({
                                                              body: '<div>Google offered in: English</div>',
                                                              base64Encoded: false,
                                                            }));
    const searchSpy = sinon.spy(target.networkAgent(), 'invoke_searchInResponseBody');

    const contentData = await request.requestContentData();
    assert.isFalse(TextUtils.ContentData.ContentData.isError(contentData));

    const matches = await request.searchInContent('Google offered', false, false);
    sinon.assert.notCalled(searchSpy);
    assert.deepEqual(matches, [
      new TextUtils.ContentProvider.SearchMatch(0, '<div>Google offered in: English</div>', 5, 14),
    ]);
  });

  it('falls back to Network.searchInResponseBody when cached contentData is an error', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        urlString`https://www.google.com/`,
        urlString`https://www.google.com/`,
        null,
        null,
        null,
    );
    request.mimeType = 'text/html';
    request.finished = true;

    sinon.stub(target.networkAgent(), 'invoke_getResponseBody').resolves({
      body: '',
      base64Encoded: false,
      getError: () => 'No resource with given identifier found',
    });
    const searchStub = sinon.stub(target.networkAgent(), 'invoke_searchInResponseBody').resolves({
      result: [{lineNumber: 0, lineContent: '<div>Google offered in: English</div>'}],
      getError: () => undefined,
    });

    const contentData = await request.requestContentData();
    assert.isTrue(TextUtils.ContentData.ContentData.isError(contentData));

    const matches = await request.searchInContent('Google offered', false, false);
    sinon.assert.calledOnce(searchStub);
    assert.lengthOf(matches, 1);
    assert.strictEqual(matches[0].lineContent, '<div>Google offered in: English</div>');
  });

  it('falls back to Network.searchInResponseBody when cached base64 contentData has non-text MIME type', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        urlString`https://www.google.com/data.bin`,
        urlString`https://www.google.com/`,
        null,
        null,
        null,
    );
    request.mimeType = 'application/octet-stream';
    request.finished = true;

    connection.setSuccessHandler('Network.getResponseBody',
                                 () => ({
                                   body: 'PGRpdj5Hb29nbGUgb2ZmZXJlZCBpbjogRW5nbGlzaDwvZGl2Pg==',
                                   base64Encoded: true,
                                 }));
    const searchStub = sinon.stub(target.networkAgent(), 'invoke_searchInResponseBody').resolves({
      result: [{lineNumber: 0, lineContent: '<div>Google offered in: English</div>'}],
      getError: () => undefined,
    });

    const contentData = await request.requestContentData();
    if (TextUtils.ContentData.ContentData.isError(contentData)) {
      assert.fail(contentData.error);
    }
    assert.isFalse(contentData.isTextContent);

    const matches = await request.searchInContent('Google offered', false, false);
    sinon.assert.calledOnce(searchStub);
    assert.lengthOf(matches, 1);
  });

  it('searches cached base64 text contentData locally even with an unsupported charset', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        urlString`https://www.google.com/`,
        urlString`https://www.google.com/`,
        null,
        null,
        null,
    );
    request.mimeType = 'text/html';
    request.setCharset('not-a-charset');
    request.finished = true;

    connection.setSuccessHandler('Network.getResponseBody',
                                 () => ({
                                   body: 'PGRpdj5Hb29nbGUgb2ZmZXJlZCBpbjogRW5nbGlzaDwvZGl2Pg==',
                                   base64Encoded: true,
                                 }));
    const searchSpy = sinon.spy(target.networkAgent(), 'invoke_searchInResponseBody');

    const contentData = await request.requestContentData();
    assert.isFalse(TextUtils.ContentData.ContentData.isError(contentData));

    const matches = await request.searchInContent('Google offered', false, false);
    sinon.assert.notCalled(searchSpy);
    assert.deepEqual(matches, [
      new TextUtils.ContentProvider.SearchMatch(0, '<div>Google offered in: English</div>', 5, 14),
    ]);
  });

  it('does not hang on unresolved streamingContentData when request has not received headers', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        urlString`https://www.google.com/`,
        urlString`https://www.google.com/`,
        null,
        null,
        null,
    );
    request.mimeType = 'text/plain';
    request.finished = false;

    void request.requestStreamingContent();
    request.failed = true;

    const searchStub = sinon.stub(target.networkAgent(), 'invoke_searchInResponseBody').resolves({
      result: [],
      getError: () => undefined,
    });

    const matches = await request.searchInContent('test', false, false);
    sinon.assert.calledOnce(searchStub);
    assert.isEmpty(matches);
  });

  describe('requestContentDataIfAvailable', () => {
    it('returns the body of a finished request', async () => {
      const request = createNetworkRequest({mimeType: 'text/plain', finished: true});
      connection.setSuccessHandler('Network.getResponseBody', () => ({body: 'response', base64Encoded: false}));

      const contentData = await request.requestContentDataIfAvailable();

      if (TextUtils.ContentData.ContentData.isError(contentData)) {
        assert.fail(contentData.error);
      }
      assert.strictEqual(contentData.text, 'response');
    });

    it('returns the body of an unfinished request that has a content data provider', async () => {
      const request = createNetworkRequest({
        contentData: new TextUtils.ContentData.ContentData('provided', false, 'text/plain'),
      });

      const contentData = await request.requestContentDataIfAvailable();

      if (TextUtils.ContentData.ContentData.isError(contentData)) {
        assert.fail(contentData.error);
      }
      assert.strictEqual(contentData.text, 'provided');
    });

    it('returns an error for an unfinished request without a content data provider', async () => {
      const request = createNetworkRequest();
      const getResponseBodySpy = sinon.spy(target.networkAgent(), 'invoke_getResponseBody');

      const contentData = await request.requestContentDataIfAvailable();

      assert.deepEqual(contentData, {error: 'Request has not finished loading'});
      sinon.assert.notCalled(getResponseBodySpy);
    });

    it('returns an error when an earlier requestContentData() call is still waiting for the request to finish',
       async () => {
         const request = createNetworkRequest();
         void request.requestContentData();

         const contentData = await request.requestContentDataIfAvailable();

         assert.deepEqual(contentData, {error: 'Request has not finished loading'});
       });
  });
});

describe('ServerSentEvents', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();
  let target: SDK.Target.Target;
  let networkManager: SDK.NetworkManager.NetworkManager;
  let universe: TestUniverse;
  let connection: MockCDPConnection;

  beforeEach(() => {
    universe = new TestUniverse();
    connection = new MockCDPConnection();
    mockResourceTree(connection);
    target = universe.createTarget({connection});
    networkManager = target.model(SDK.NetworkManager.NetworkManager) as SDK.NetworkManager.NetworkManager;
  });

  it('sends EventSourceMessageAdded events for EventSource text/event-stream', () => {
    networkManager.dispatcher.requestWillBeSent({
      requestId: '1' as Protocol.Network.RequestId,
      request: {
        url: 'https://example.com/sse',
      },
      type: 'EventSource',
    } as Protocol.Network.RequestWillBeSentEvent);
    networkManager.dispatcher.responseReceived({
      requestId: '1' as Protocol.Network.RequestId,
      type: Protocol.Network.ResourceType.EventSource,
      response: {
        url: 'https://example.com/sse',
        mimeType: 'text/event-stream',
      } as Protocol.Network.Response,
    } as Protocol.Network.ResponseReceivedEvent);

    const networkEvents: SDK.NetworkRequest.EventSourceMessage[] = [];
    networkManager.requestForId('1')!.addEventListener(
        SDK.NetworkRequest.Events.EVENT_SOURCE_MESSAGE_ADDED, ({data}) => networkEvents.push(data));

    networkManager.dispatcher.eventSourceMessageReceived({
      requestId: '1' as Protocol.Network.RequestId,
      timestamp: 21,
      data: 'foo',
      eventId: 'fooId',
      eventName: 'fooName',
    });
    networkManager.dispatcher.eventSourceMessageReceived({
      requestId: '1' as Protocol.Network.RequestId,
      timestamp: 42,
      data: 'bar',
      eventId: 'barId',
      eventName: 'barName',
    });

    assert.lengthOf(networkEvents, 2);
    assert.deepEqual(networkEvents[0], {data: 'foo', eventId: 'fooId', eventName: 'fooName', time: 21});
    assert.deepEqual(networkEvents[1], {data: 'bar', eventId: 'barId', eventName: 'barName', time: 42});
  });

  it('preserves EventSource resource type and retrieves content after loading finishes', async () => {
    connection.setSuccessHandler('Network.getResponseBody', () => ({
                                                              body: 'data: hello\n\n',
                                                              base64Encoded: false,
                                                            }));
    const getResponseBodySpy = sinon.spy(target.networkAgent(), 'invoke_getResponseBody');
    const streamResourceContentSpy = sinon.spy(target.networkAgent(), 'invoke_streamResourceContent');

    networkManager.dispatcher.requestWillBeSent({
      requestId: '1' as Protocol.Network.RequestId,
      request: {
        url: 'https://example.com/resources/event-stream.asis',
      },
      type: Protocol.Network.ResourceType.EventSource,
    } as Protocol.Network.RequestWillBeSentEvent);
    networkManager.dispatcher.responseReceived({
      requestId: '1' as Protocol.Network.RequestId,
      type: Protocol.Network.ResourceType.EventSource,
      response: {
        url: 'https://example.com/resources/event-stream.asis',
        mimeType: 'text/event-stream',
      } as Protocol.Network.Response,
    } as Protocol.Network.ResponseReceivedEvent);

    const request = networkManager.requestForId('1')!;
    assert.strictEqual(request.url(), 'https://example.com/resources/event-stream.asis');
    assert.strictEqual(request.resourceType(), Common.ResourceType.resourceTypes.EventSource);
    assert.strictEqual(request.resourceType().name(), 'eventsource');

    networkManager.dispatcher.eventSourceMessageReceived({
      requestId: '1' as Protocol.Network.RequestId,
      timestamp: 21,
      data: 'hello',
      eventId: '',
      eventName: 'message',
    });
    networkManager.dispatcher.dataReceived({
      requestId: '1' as Protocol.Network.RequestId,
      dataLength: 13,
      encodedDataLength: 13,
      timestamp: 22,
      data: globalThis.btoa('data: hello\n\n'),
    });
    // EventSource requests get messages directly via CDP rather than parsing streamed chunks.
    await Promise.resolve();
    sinon.assert.notCalled(streamResourceContentSpy);
    assert.deepEqual(request.eventSourceMessages(), [
      {data: 'hello', eventId: '', eventName: 'message', time: 21},
    ]);

    networkManager.dispatcher.loadingFinished({
      requestId: '1' as Protocol.Network.RequestId,
    } as Protocol.Network.LoadingFinishedEvent);
    assert.isTrue(request.finished);
    assert.isFalse(Boolean(request.failed));

    const contentData = await request.requestContentData();
    if (TextUtils.ContentData.ContentData.isError(contentData)) {
      assert.fail(contentData.error);
    }
    assert.strictEqual(contentData.text, 'data: hello\n\n');
    assert.strictEqual(contentData.mimeType, 'text/event-stream');
    sinon.assert.calledOnceWithExactly(getResponseBodySpy, {requestId: '1' as Protocol.Network.RequestId});
  });

  it('returns an error when requesting content for an in-flight EventSource request with messages', async () => {
    const getResponseBodySpy = sinon.spy(target.networkAgent(), 'invoke_getResponseBody');

    networkManager.dispatcher.requestWillBeSent({
      requestId: '1' as Protocol.Network.RequestId,
      request: {
        url: 'https://example.com/sse',
      },
      type: Protocol.Network.ResourceType.EventSource,
    } as Protocol.Network.RequestWillBeSentEvent);
    networkManager.dispatcher.responseReceived({
      requestId: '1' as Protocol.Network.RequestId,
      type: Protocol.Network.ResourceType.EventSource,
      response: {
        url: 'https://example.com/sse',
        mimeType: 'text/event-stream',
      } as Protocol.Network.Response,
    } as Protocol.Network.ResponseReceivedEvent);
    networkManager.dispatcher.eventSourceMessageReceived({
      requestId: '1' as Protocol.Network.RequestId,
      timestamp: 21,
      data: 'hello',
      eventId: '',
      eventName: 'message',
    });

    const request = networkManager.requestForId('1')!;
    assert.isFalse(Boolean(request.finished));

    const contentData = await request.requestContentData();
    assert.deepEqual(contentData, {error: 'Content for Server-Sent Events (SSE) is currently not supported'});
    sinon.assert.notCalled(getResponseBodySpy);
  });

  it('sends EventSourceMessageAdded events for raw text/event-stream', async () => {
    connection.setSuccessHandler('Network.streamResourceContent', () => ({
                                                                    bufferedData: '',
                                                                  }));
    networkManager.dispatcher.requestWillBeSent({
      requestId: '1' as Protocol.Network.RequestId,
      request: {
        url: 'https://example.com/sse',
      },
      type: 'Fetch',
    } as Protocol.Network.RequestWillBeSentEvent);
    networkManager.dispatcher.responseReceived({
      requestId: '1' as Protocol.Network.RequestId,
      response: {
        url: 'https://example.com/sse',
        mimeType: 'text/event-stream',
      } as Protocol.Network.Response,
    } as Protocol.Network.ResponseReceivedEvent);

    const networkEvents: SDK.NetworkRequest.EventSourceMessage[] = [];
    const {promise: twoEventsReceivedPromise, resolve} = Promise.withResolvers<void>();
    networkManager.requestForId('1')!.addEventListener(
        SDK.NetworkRequest.Events.EVENT_SOURCE_MESSAGE_ADDED, ({data}) => {
          networkEvents.push(data);
          if (networkEvents.length === 2) {
            resolve();
          }
        });

    const message = `
id: fooId
event: fooName
data: foo

id: barId
event: barName
data: bar\n\n`;

    // Send `message` piecemeal via dataReceived events.
    let time = 0;
    for (const c of message) {
      networkManager.dispatcher.dataReceived({
        requestId: '1' as Protocol.Network.RequestId,
        dataLength: 1,
        encodedDataLength: 1,
        timestamp: time++,
        data: globalThis.btoa(c),
      });
    }

    await twoEventsReceivedPromise;

    // Omit time from expectation as the dataReceived loop is racing against the text decoder.
    assert.lengthOf(networkEvents, 2);
    assert.deepInclude(networkEvents[0], {data: 'foo', eventId: 'fooId', eventName: 'fooName'});
    assert.deepInclude(networkEvents[1], {data: 'bar', eventId: 'barId', eventName: 'barName'});
  });
});

describe('requestStreamingContent', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();
  let universe: TestUniverse;
  let target: SDK.Target.Target;
  let networkManager: SDK.NetworkManager.NetworkManager;

  beforeEach(() => {
    universe = new TestUniverse();
    target = universe.createTarget();
    networkManager = target.model(SDK.NetworkManager.NetworkManager) as SDK.NetworkManager.NetworkManager;
  });

  it('retrieves the full response body for finished requests', () => {
    networkManager.dispatcher.requestWillBeSent({
      requestId: '1' as Protocol.Network.RequestId,
      request: {
        url: 'https://example.com/index.html',
      },
      type: 'Document',
    } as Protocol.Network.RequestWillBeSentEvent);
    networkManager.dispatcher.responseReceived({
      requestId: '1' as Protocol.Network.RequestId,
      response: {
        url: 'https://example.com/index.html',
        mimeType: 'text/html',
      } as Protocol.Network.Response,
    } as Protocol.Network.ResponseReceivedEvent);
    networkManager.dispatcher.loadingFinished({
      requestId: '1' as Protocol.Network.RequestId,
    } as Protocol.Network.LoadingFinishedEvent);

    const responseBodySpy = sinon.spy(target.networkAgent(), 'invoke_getResponseBody');

    void networkManager.requestForId('1')!.requestStreamingContent();

    sinon.assert.calledOnce(responseBodySpy);
  });

  it('streams the full response body for in-flight requests', () => {
    networkManager.dispatcher.requestWillBeSent({
      requestId: '1' as Protocol.Network.RequestId,
      request: {
        url: 'https://example.com/index.html',
      },
      type: 'Document',
    } as Protocol.Network.RequestWillBeSentEvent);
    networkManager.dispatcher.responseReceived({
      requestId: '1' as Protocol.Network.RequestId,
      response: {
        url: 'https://example.com/index.html',
        mimeType: 'text/html',
      } as Protocol.Network.Response,
    } as Protocol.Network.ResponseReceivedEvent);

    const responseBodySpy = sinon.spy(target.networkAgent(), 'invoke_streamResourceContent');

    void networkManager.requestForId('1')!.requestStreamingContent();

    sinon.assert.calledOnce(responseBodySpy);
  });

  it('sends ChunkAdded events when new data is received', async () => {
    networkManager.dispatcher.requestWillBeSent({
      requestId: '1' as Protocol.Network.RequestId,
      request: {
        url: 'https://example.com/index.html',
      },
      type: 'Document',
    } as Protocol.Network.RequestWillBeSentEvent);
    networkManager.dispatcher.responseReceived({
      requestId: '1' as Protocol.Network.RequestId,
      response: {
        url: 'https://example.com/index.html',
        mimeType: 'text/html',
      } as Protocol.Network.Response,
    } as Protocol.Network.ResponseReceivedEvent);

    sinon.stub(SDK.NetworkManager.NetworkManager, 'streamResponseBody')
        .returns(Promise.resolve(new TextUtils.ContentData.ContentData('Zm9v', true, 'text/html')));

    const maybeStreamingContent = await networkManager.requestForId('1')!.requestStreamingContent();
    assert.isFalse(TextUtils.StreamingContentData.isError(maybeStreamingContent));
    const streamingContent = maybeStreamingContent as TextUtils.StreamingContentData.StreamingContentData;
    const eventPromise = streamingContent.once(TextUtils.StreamingContentData.Events.CHUNK_ADDED);

    networkManager.dispatcher.dataReceived({
      requestId: '1' as Protocol.Network.RequestId,
      data: 'YmFy',
      dataLength: 4,
      encodedDataLength: 4,
      timestamp: 42,
    });

    const {chunk} = await eventPromise;
    assert.strictEqual(chunk, 'YmFy');
    assert.strictEqual(streamingContent.content().text, 'foobar');
  });

  it('waits for "responseReceived" event to construct the StreamingContentData', async () => {
    networkManager.dispatcher.requestWillBeSent({
      requestId: '1' as Protocol.Network.RequestId,
      request: {
        url: 'https://example.com/index.html',
      },
      type: 'Document',
    } as Protocol.Network.RequestWillBeSentEvent);
    sinon.stub(target.networkAgent(), 'invoke_streamResourceContent')
        .returns(Promise.resolve({bufferedData: '', getError: () => undefined}));

    const streamingContentDataPromise = networkManager.requestForId('1')!.requestStreamingContent();

    // Trigger the "responseReceived" on the next event loop tick.
    setTimeout(() => {
      networkManager.dispatcher.responseReceived({
        requestId: '1' as Protocol.Network.RequestId,
        response: {
          url: 'https://example.com/index.html',
          mimeType: 'text/html',
        } as Protocol.Network.Response,
      } as Protocol.Network.ResponseReceivedEvent);
    }, 0);

    const maybeStreamingContent = await streamingContentDataPromise;
    assert.isFalse(TextUtils.StreamingContentData.isError(maybeStreamingContent));
    const streamingContent = maybeStreamingContent as TextUtils.StreamingContentData.StreamingContentData;
    assert.strictEqual(streamingContent.mimeType, 'text/html');
  });

  describe('WebSocketFrame', () => {
    it('adds sent and received frames and dispatches WEBSOCKET_FRAME_ADDED event', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId', urlString`ws://example.com`, urlString`documentURL`, null);
      const addedFrames: SDK.NetworkRequest.WebSocketFrame[] = [];
      request.addEventListener(SDK.NetworkRequest.Events.WEBSOCKET_FRAME_ADDED, event => {
        addedFrames.push(event.data);
      });

      request.addProtocolFrame(
          {
            opcode: 1,
            mask: true,
            payloadData: 'send-message',
          },
          1,
          true,
      );
      request.addProtocolFrame(
          {
            opcode: 1,
            mask: false,
            payloadData: 'receive-message',
          },
          2,
          false,
      );
      request.addProtocolFrameError('websocket error', 3);

      assert.lengthOf(addedFrames, 3);
      assert.deepEqual(request.frames(), [
        {
          type: SDK.NetworkRequest.WebSocketFrameType.Send,
          text: 'send-message',
          time: request.pseudoWallTime(1),
          opCode: 1,
          mask: true,
        },
        {
          type: SDK.NetworkRequest.WebSocketFrameType.Receive,
          text: 'receive-message',
          time: request.pseudoWallTime(2),
          opCode: 1,
          mask: false,
        },
        {
          type: SDK.NetworkRequest.WebSocketFrameType.Error,
          text: 'websocket error',
          time: request.pseudoWallTime(3),
          opCode: -1,
          mask: false,
        },
      ]);
    });
  });

  describe('requestURLSecurityOrigin', () => {
    it('returns standard origin matching scheme, host, and port for web URLs', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'req1',
          urlString`https://example.com:8080/api/users?id=1`,
          urlString`https://example.com:8080/index.html`,
          null,
      );
      const origin = request.requestURLSecurityOrigin();
      const expectedOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com:8080');

      assert.isFalse(origin.isOpaque());
      assert.isTrue(origin.isSameOriginWith(expectedOrigin));
      assert.strictEqual(origin.siteId(), 'https://example.com:8080');
    });

    it('returns path-scoped origin for file:// URLs', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'req1',
          urlString`file:///home/user/app.js`,
          urlString`file:///home/user/index.html`,
          null,
      );
      const origin = request.requestURLSecurityOrigin();
      const expectedOrigin = SDK.SecurityOrigin.SecurityOrigin.create('file:///home/user/app.js');

      assert.isFalse(origin.isOpaque());
      assert.isTrue(origin.isSameOriginWith(expectedOrigin));
      assert.strictEqual(origin.siteId(), 'file:///home/user/app.js');
    });

    it('returns a stable opaque origin for data: URLs', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'req1',
          urlString`data:text/html,<h1>Hello</h1>`,
          urlString`https://example.com/`,
          null,
      );
      const origin = request.requestURLSecurityOrigin();
      const anotherOrigin = request.requestURLSecurityOrigin();

      assert.isTrue(origin.isOpaque());
      assert.strictEqual(origin, anotherOrigin);
      assert.isTrue(origin.isSameOriginWith(anotherOrigin));
    });

    it('does not treat different data: requests as same-origin', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'req1',
          urlString`data:text/html,<h1>Hello</h1>`,
          urlString`https://example.com/`,
          null,
      );
      const otherRequest = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'req2',
          urlString`data:text/html,<h1>Hello</h1>`,
          urlString`https://example.com/`,
          null,
      );

      assert.isFalse(request.requestURLSecurityOrigin().isSameOriginWith(otherRequest.requestURLSecurityOrigin()));
    });

    it('recomputes the origin after setUrl() changes the URL', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'req1',
          urlString`https://a.example.com/data`,
          urlString`https://example.com/index.html`,
          null,
      );
      const originBefore = request.requestURLSecurityOrigin();
      request.setUrl(urlString`https://b.example.com/data`);
      const originAfter = request.requestURLSecurityOrigin();

      assert.isTrue(originBefore.isSameOriginWith(SDK.SecurityOrigin.SecurityOrigin.create('https://a.example.com')));
      assert.isTrue(originAfter.isSameOriginWith(SDK.SecurityOrigin.SecurityOrigin.create('https://b.example.com')));
      assert.isFalse(originAfter.isSameOriginWith(originBefore));
    });

    it('returns virtual imported-har origin for imported HAR requests', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createForImportedHar(
          'req1',
          urlString`https://api.example.com/data`,
          urlString`https://example.com/index.html`,
          null,
      );
      const origin = request.requestURLSecurityOrigin();
      const liveOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://api.example.com');
      const expectedHarOrigin = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://api.example.com');

      assert.isTrue(request.isImportedHar());
      assert.isUndefined(request.backendRequestId());
      assert.isFalse(origin.isOpaque());
      assert.isTrue(origin.isSameOriginWith(expectedHarOrigin));
      assert.isFalse(origin.isSameOriginWith(liveOrigin));
      assert.strictEqual(origin.siteId(), 'imported-har://api.example.com');
    });
  });

  describe('initiatorSecurityOrigin', () => {
    it('returns standard origin matching documentURL', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'req1',
          urlString`https://api.example.com/data`,
          urlString`https://example.com:8443/index.html`,
          null,
      );
      const initiatorOrigin = request.initiatorSecurityOrigin();
      const expectedOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com:8443');

      assert.isFalse(initiatorOrigin.isOpaque());
      assert.isTrue(initiatorOrigin.isSameOriginWith(expectedOrigin));
      assert.strictEqual(initiatorOrigin.siteId(), 'https://example.com:8443');
    });

    it('returns virtual imported-har origin for imported HAR documentURL', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createForImportedHar(
          'req1',
          urlString`https://api.example.com/data`,
          urlString`https://example.com/index.html`,
          null,
      );
      const initiatorOrigin = request.initiatorSecurityOrigin();
      const expectedHarOrigin = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://example.com');

      assert.isFalse(initiatorOrigin.isOpaque());
      assert.isTrue(initiatorOrigin.isSameOriginWith(expectedHarOrigin));
      assert.strictEqual(initiatorOrigin.siteId(), 'imported-har://example.com');
    });

    it('returns opaque origin when documentURL is empty or opaque', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'req1',
          urlString`https://api.example.com/data`,
          urlString``,
          null,
      );
      const initiatorOrigin = request.initiatorSecurityOrigin();

      assert.isTrue(initiatorOrigin.isOpaque());
    });

    it('returns stable initiatorSecurityOrigin instance across multiple calls', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'req1',
          urlString`https://api.example.com/data`,
          urlString``,
          null,
      );
      const origin1 = request.initiatorSecurityOrigin();
      const origin2 = request.initiatorSecurityOrigin();

      assert.strictEqual(origin1, origin2);
      assert.isTrue(origin1.isSameOriginWith(origin2));
    });
  });
});

describe('NetworkRequest name() and path()', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();
  const dataURL = urlString`data:text/html,<html><body><img src="data:,foobar" /></body></html>`;
  let target: SDK.Target.Target;
  let networkManager: SDK.NetworkManager.NetworkManager;
  let requestCount: number;

  beforeEach(() => {
    const universe = new TestUniverse();
    target = universe.createTarget();
    const manager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(manager);
    networkManager = manager;
    requestCount = 0;
    target.setInspectedURL(urlString`http://127.0.0.1/aFolder/aTest.html`);
  });

  function nameAndPath(url: string): {name: string, path: string, inspectedURL: string|undefined} {
    const requestId = String(++requestCount) as Protocol.Network.RequestId;
    networkManager.dispatcher.requestWillBeSent({requestId, request: {url}} as Protocol.Network.RequestWillBeSentEvent);
    const request = networkManager.requestForId(requestId);
    assert.exists(request);
    return {
      name: request.name(),
      path: request.path(),
      inspectedURL: SDK.NetworkManager.NetworkManager.forRequest(request)?.target().inspectedURL(),
    };
  }

  it('derives name and path from URLs on other hosts', () => {
    assert.deepEqual(nameAndPath('http://www.example.com/foo/bar/baz?key=value'), {
      name: 'baz?key=value',
      path: 'www.example.com/foo/bar',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://www.example.com/foo/bar/?key=value'), {
      name: 'bar/?key=value',
      path: 'www.example.com/foo/bar',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://www.example.com/foo/bar/baz'), {
      name: 'baz',
      path: 'www.example.com/foo/bar',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://www.example.com/foo/bar/'), {
      name: 'bar/',
      path: 'www.example.com/foo/bar',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://www.example.com/baz?key=value'), {
      name: 'baz?key=value',
      path: 'www.example.com',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://www.example.com/?key=value'), {
      name: '?key=value',
      path: 'www.example.com',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://www.example.com/baz'), {
      name: 'baz',
      path: 'www.example.com',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://www.example.com/'), {
      name: 'www.example.com',
      path: '',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
  });

  it('omits the inspected host from the path of URLs on that host', () => {
    assert.deepEqual(nameAndPath('http://127.0.0.1/foo/bar/baz?key=value'), {
      name: 'baz?key=value',
      path: '/foo/bar',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://127.0.0.1/foo/bar/?key=value'), {
      name: 'bar/?key=value',
      path: '/foo/bar',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://127.0.0.1/foo/bar/baz'), {
      name: 'baz',
      path: '/foo/bar',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://127.0.0.1/foo/bar/'), {
      name: 'bar/',
      path: '/foo/bar',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://127.0.0.1/baz?key=value'), {
      name: 'baz?key=value',
      path: '',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://127.0.0.1/?key=value'), {
      name: '?key=value',
      path: '',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://127.0.0.1/baz'), {
      name: 'baz',
      path: '',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
    assert.deepEqual(nameAndPath('http://127.0.0.1/'), {
      name: '127.0.0.1',
      path: '',
      inspectedURL: 'http://127.0.0.1/aFolder/aTest.html',
    });
  });

  it('derives name and path when the inspected URL is a data: URL', () => {
    target.setInspectedURL(dataURL);
    assert.deepEqual(nameAndPath('http://127.0.0.1/'), {
      name: '127.0.0.1',
      path: '',
      inspectedURL: 'data:text/html,<html><body><img src="data:,foobar" /></body></html>',
    });
  });

  it('derives name and path from data: URLs', () => {
    target.setInspectedURL(dataURL);
    assert.deepEqual(nameAndPath(dataURL), {
      name: 'data:text/html,<htm…',
      path: '',
      inspectedURL: 'data:text/html,<html><body><img src="data:,foobar" /></body></html>',
    });
    target.setInspectedURL(urlString`http://127.0.0.1/`);
    assert.deepEqual(nameAndPath(dataURL), {
      name: 'data:text/html,<htm…',
      path: '',
      inspectedURL: 'http://127.0.0.1/',
    });
  });
});
