// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {expectCookie} from '../../testing/Cookies.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import type * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

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
        'requestId', 'url' as Platform.DevToolsPath.UrlString, 'documentURL' as Platform.DevToolsPath.UrlString, null);
    request.addExtraResponseInfo({
      blockedResponseCookies: [],
      responseHeaders: [{name: 'Set-Cookie', value: 'foo=bar'}, {name: 'Set-Cookie', value: 'baz=qux'}],
      resourceIPAddressSpace: 'Public' as Protocol.Network.IPAddressSpace,
    } as unknown as SDK.NetworkRequest.ExtraResponseInfo);
    assert.strictEqual(request.responseCookies.length, 2);
    expectCookie(request.responseCookies[0], {name: 'foo', value: 'bar', size: 8});
    expectCookie(request.responseCookies[1], {name: 'baz', value: 'qux', size: 7});
  });

  it('infers status text from status code if none given', () => {
    const fakeRequest = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'fakeRequestId',
        'url1' as Platform.DevToolsPath.UrlString,
        'documentURL' as Platform.DevToolsPath.UrlString,
        null,
    );
    fakeRequest.statusCode = 200;

    assert.strictEqual(fakeRequest.statusText, '');
    assert.strictEqual(fakeRequest.getInferredStatusText(), 'OK');
  });

  it('does not infer status text from unknown status code', () => {
    const fakeRequest = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'fakeRequestId',
        'url1' as Platform.DevToolsPath.UrlString,
        'documentURL' as Platform.DevToolsPath.UrlString,
        null,
    );
    fakeRequest.statusCode = 999;

    assert.strictEqual(fakeRequest.statusText, '');
    assert.strictEqual(fakeRequest.getInferredStatusText(), '');
  });

  it('infers status text only when no status text given', () => {
    const fakeRequest = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'fakeRequestId',
        'url1' as Platform.DevToolsPath.UrlString,
        'documentURL' as Platform.DevToolsPath.UrlString,
        null,
    );
    fakeRequest.statusCode = 200;
    fakeRequest.statusText = 'Prefer me';

    assert.strictEqual(fakeRequest.statusText, 'Prefer me');
    assert.strictEqual(fakeRequest.getInferredStatusText(), 'Prefer me');
  });

  it('includes partition key in response cookies', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', 'url' as Platform.DevToolsPath.UrlString, 'documentURL' as Platform.DevToolsPath.UrlString, null);
    request.addExtraResponseInfo({
      blockedResponseCookies: [],
      responseHeaders:
          [{name: 'Set-Cookie', value: 'foo=bar'}, {name: 'Set-Cookie', value: 'baz=qux; Secure;Partitioned'}],
      resourceIPAddressSpace: 'Public' as Protocol.Network.IPAddressSpace,
      cookiePartitionKey: {topLevelSite: 'partitionKey', hasCrossSiteAncestor: false},
    } as unknown as SDK.NetworkRequest.ExtraResponseInfo);
    assert.strictEqual(request.responseCookies.length, 2);
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
        'requestId', 'url' as Platform.DevToolsPath.UrlString, 'documentURL' as Platform.DevToolsPath.UrlString, null);
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
        'requestId', 'url' as Platform.DevToolsPath.UrlString, 'documentURL' as Platform.DevToolsPath.UrlString, null);
    request.responseHeaders = [{name: 'duplicate', value: 'first'}, {name: 'duplicate', value: 'second'}];
    request.originalResponseHeaders = [{name: 'duplicate', value: 'second'}, {name: 'duplicate', value: 'first'}];
    assert.isTrue(request.hasOverriddenHeaders());
  });

  it('can handle the case of duplicate cookies with only 1 of them being blocked', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, 'url' as Platform.DevToolsPath.UrlString,
        'documentURL' as Platform.DevToolsPath.UrlString, null, null, null);
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
        'requestId' as Protocol.Network.RequestId, 'url' as Platform.DevToolsPath.UrlString,
        'documentURL' as Platform.DevToolsPath.UrlString, null, null, null);

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
        exemptionReason: Protocol.Network.CookieExemptionReason.TPCDHeuristics,
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
    assert.deepEqual(
        request.exemptedResponseCookies().map(cookie => cookie.exemptionReason),
        [Protocol.Network.CookieExemptionReason.TPCDHeuristics]);

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
        'requestId', 'url' as Platform.DevToolsPath.UrlString, 'documentURL' as Platform.DevToolsPath.UrlString, null);
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
        'requestId', 'url' as Platform.DevToolsPath.UrlString, 'documentURL' as Platform.DevToolsPath.UrlString, null);
    request.responseHeaders = [{name: 'duplicate', value: 'first, second'}];
    request.originalResponseHeaders = [{name: 'duplicate', value: 'first'}, {name: 'duplicate', value: 'second'}];
    assert.isFalse(request.hasOverriddenHeaders());
  });
});

describeWithMockConnection('NetworkRequest', () => {
  let networkManagerForRequestStub: sinon.SinonStub;
  let cookie: SDK.Cookie.Cookie;
  let addBlockedCookieSpy: sinon.SinonSpy;
  let target: SDK.Target.Target;

  beforeEach(() => {
    target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    networkManagerForRequestStub = sinon.stub(SDK.NetworkManager.NetworkManager, 'forRequest').returns(networkManager);
    cookie = new SDK.Cookie.Cookie('name', 'value');
    addBlockedCookieSpy = sinon.spy(SDK.CookieModel.CookieModel.prototype, 'addBlockedCookie');
  });

  afterEach(() => {
    networkManagerForRequestStub.restore();
  });

  it('adds blocked response cookies to - and removes exempted cookies from cookieModel', async () => {
    const removeBlockedCookieSpy = sinon.spy(SDK.CookieModel.CookieModel.prototype, 'removeBlockedCookie');
    setMockConnectionResponseHandler('Network.getCookies', () => ({cookies: []}));
    const cookieModel = target.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel);
    const url = 'url' as Platform.DevToolsPath.UrlString;
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, url, 'documentURL' as Platform.DevToolsPath.UrlString, null, null,
        null);

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
    assert.deepStrictEqual(await cookieModel.getCookiesForDomain(''), [cookie]);

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
        exemptionReason: Protocol.Network.CookieExemptionReason.TPCDHeuristics,
      }],
    });
    assert.isTrue(removeBlockedCookieSpy.calledOnceWith(cookie));
    assert.isEmpty(await cookieModel.getCookiesForDomain(''));
  });
});

describeWithMockConnection('ServerSentEvents', () => {
  let target: SDK.Target.Target;
  let networkManager: SDK.NetworkManager.NetworkManager;

  beforeEach(() => {
    target = createTarget();
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
    assert.deepStrictEqual(networkEvents[0], {data: 'foo', eventId: 'fooId', eventName: 'fooName', time: 21});
    assert.deepStrictEqual(networkEvents[1], {data: 'bar', eventId: 'barId', eventName: 'barName', time: 42});
  });

  it('sends EventSourceMessageAdded events for raw text/event-stream', async () => {
    setMockConnectionResponseHandler('Network.streamResourceContent', () => ({
                                                                        getError() {
                                                                          return undefined;
                                                                        },
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
        data: window.btoa(c),
      });
    }

    await twoEventsReceivedPromise;

    // Omit time from expectation as the dataReceived loop is racing against the text decoder.
    assert.lengthOf(networkEvents, 2);
    assert.deepInclude(networkEvents[0], {data: 'foo', eventId: 'fooId', eventName: 'fooName'});
    assert.deepInclude(networkEvents[1], {data: 'bar', eventId: 'barId', eventName: 'barName'});
  });
});

describeWithMockConnection('requestStreamingContent', () => {
  let target: SDK.Target.Target;
  let networkManager: SDK.NetworkManager.NetworkManager;

  beforeEach(() => {
    target = createTarget();
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

    assert.isTrue(responseBodySpy.calledOnce);
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

    assert.isTrue(responseBodySpy.calledOnce);
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
});
