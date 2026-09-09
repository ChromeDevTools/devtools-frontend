// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import {SnapshotTester} from '../../testing/SnapshotTester.js';

import * as HAR from './har.js';

const {urlString} = Platform.DevToolsPath;

describe('HAR', function() {
  describe('Log', function() {
    const snapshotTester = new SnapshotTester(this, import.meta);

    describe('build', function() {
      it('converts network requests into a complete HAR log with pages and entries', async function() {
        const mainRequestId = 'r0';
        const postRequestId = 'r1';
        const mainUrl = 'http://127.0.0.1:8000/devtools/resources/inspected-page.html';
        const postUrl = 'http://127.0.0.1:8000/devtools/resources/post-target.cgi';

        const mainRequest = createNetworkRequest({
          requestId: mainRequestId,
          url: mainUrl,
          documentURL: '',
          requestMethod: 'GET',
          resourceType: Common.ResourceType.resourceTypes.Document,
          responseHeaders: [{
            name: 'Set-Cookie',
            value: 'x=y; Path=/path; Domain=example.com; httpOnly; Secure\nx1=y1; SameSite=Strict\nz2=y2; SameSite=Lax',
          }],
          fetchedViaServiceWorker: true,
          serviceWorkerRouterInfo: {
            ruleIdMatched: 3,
            matchedSourceType: Protocol.Network.ServiceWorkerRouterSource.Cache,
            actualSourceType: Protocol.Network.ServiceWorkerRouterSource.Cache,
          },
        });

        const cookie1 = new SDK.Cookie.Cookie('a', 'b', SDK.Cookie.Type.REQUEST);
        cookie1.addAttribute(SDK.Cookie.Attribute.PATH, '/path');
        cookie1.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
        const cookie2 = new SDK.Cookie.Cookie('a1', 'b1', SDK.Cookie.Type.REQUEST);
        const cookie3 = new SDK.Cookie.Cookie('c1', 'd1', SDK.Cookie.Type.REQUEST);

        mainRequest.addExtraRequestInfo({
          includedRequestCookies: [
            {cookie: cookie1, exemptionReason: undefined},
            {cookie: cookie2, exemptionReason: undefined},
            {cookie: cookie3, exemptionReason: undefined},
          ],
          blockedRequestCookies: [],
          requestHeaders: [{name: 'version', value: 'HTTP/1.1'}],
          connectTiming: {requestTime: 1},
        });

        mainRequest.setResponseCacheStorageCacheName('v1');
        mainRequest.setServiceWorkerResponseSource(Protocol.Network.ServiceWorkerResponseSource.CacheStorage);

        const pageLoad = new SDK.PageLoad.PageLoad(mainRequest);
        pageLoad.id = 1;
        pageLoad.contentLoadTime = 10;
        pageLoad.loadTime = 15;
        pageLoad.bindRequest(mainRequest);

        const postRequest = createNetworkRequest({
          requestId: postRequestId,
          url: postUrl,
          documentURL: '',
          requestMethod: 'POST',
          resourceType: Common.ResourceType.resourceTypes.XHR,
          requestHeaders: [{name: 'Content-Type', value: 'text/xml'}],
          mimeType: 'application/xml',
        });
        postRequest.setRequestFormData(true, '<xml></xml>');
        pageLoad.bindRequest(postRequest);

        const log = await HAR.Log.Log.build([mainRequest, postRequest], {sanitize: false});
        log.creator.version = 'VERSION';

        snapshotTester.assert(this, JSON.stringify(log, null, 2));
      });
    });

    describe('Entry', () => {
      describe('build', () => {
        const requestId = 'r0' as Protocol.Network.RequestId;
        const {build} = HAR.Log.Entry;
        const url = urlString`p0.com`;

        it('exports request cookies and authorization headers by default', async () => {
          const request = createNetworkRequest({
            requestId,
            url,
            documentURL: '',
          });
          request.addExtraRequestInfo({
            blockedRequestCookies: [],
            requestHeaders: [
              {name: 'Authorization', value: 'Basic YWxhZGRpbjpvcGVuc2VzYW1l'},
              {name: 'Cookie', value: 'Foo=Bar'},
            ],
            includedRequestCookies: [{
              cookie: new SDK.Cookie.Cookie('Foo', 'Bar', SDK.Cookie.Type.REQUEST),
              exemptionReason: undefined,
            }],
            connectTiming: {requestTime: 1},
          });

          const entry = await build(request, {sanitize: false});

          assert.deepEqual(entry.request.headers, [
            {name: 'Authorization', value: 'Basic YWxhZGRpbjpvcGVuc2VzYW1l'},
            {name: 'Cookie', value: 'Foo=Bar'},
          ]);
          assert.lengthOf(entry.request.cookies, 1);
          assert.strictEqual(entry.request.cookies[0].name, 'Foo');
          assert.strictEqual(entry.request.cookies[0].value, 'Bar');
        });

        it('removes request cookies and authorization headers when requested', async () => {
          const request = createNetworkRequest({
            requestId,
            url,
            documentURL: '',
          });
          request.addExtraRequestInfo({
            blockedRequestCookies: [],
            requestHeaders: [
              {name: 'Authorization', value: 'Basic YWxhZGRpbjpvcGVuc2VzYW1l'},
              {name: 'Cookie', value: 'Foo=Bar'},
              {name: 'Origin', value: 'null'},
            ],
            includedRequestCookies: [{
              cookie: new SDK.Cookie.Cookie('Foo', 'Bar', SDK.Cookie.Type.REQUEST),
              exemptionReason: undefined,
            }],
            connectTiming: {requestTime: 1},
          });

          const entry = await build(request, {sanitize: true});

          assert.deepEqual(entry.request.headers, [{name: 'Origin', value: 'null'}]);
          assert.deepEqual(entry.request.cookies, []);
        });

        it('exports response cookies by default', async () => {
          const request = createNetworkRequest({
            requestId,
            url,
            documentURL: '',
            responseHeaders: [{name: 'Set-Cookie', value: 'Foo=Bar'}],
          });

          const entry = await build(request, {sanitize: false});

          assert.deepEqual(entry.response.headers, [
            {name: 'Set-Cookie', value: 'Foo=Bar'},
          ]);
          assert.lengthOf(entry.response.cookies, 1);
          assert.strictEqual(entry.response.cookies[0].name, 'Foo');
          assert.strictEqual(entry.response.cookies[0].value, 'Bar');
        });

        it('removes response cookies when requested', async () => {
          const request = createNetworkRequest({
            requestId,
            url,
            documentURL: '',
            responseHeaders: [
              {name: 'Content-Type', value: 'text/html'},
              {name: 'Set-Cookie', value: 'Foo=Bar'},
            ],
          });

          const entry = await build(request, {sanitize: true});

          assert.deepEqual(entry.response.headers, [{name: 'Content-Type', value: 'text/html'}]);
          assert.deepEqual(entry.response.cookies, []);
        });

        it('returns blocked time when no response is received in milliseconds', async () => {
          const request = createNetworkRequest({
            requestId,
            url,
            documentURL: '',
          });
          const issueTime = new Date(2020, 1, 3).getTime() / 1000;
          request.setIssueTime(issueTime, issueTime);
          request.endTime = issueTime + 5;

          const entry = await build(request, {sanitize: false});

          assert.strictEqual(entry.timings.blocked, 5000, 'HARLog entry\'s blocked time is incorrect');
        });

        it('exports initiator request ID', async () => {
          const request = createNetworkRequest({
            requestId,
            url,
            documentURL: '',
            initiator: {requestId, type: Protocol.Network.InitiatorType.Script},
          });

          const entry = await build(request, {sanitize: false});

          assert.strictEqual(entry._initiator?.requestId, requestId);
        });

        it('exports remote address', async () => {
          const request = createNetworkRequest({
            requestId,
            url,
            documentURL: '',
            initiator: {requestId, type: Protocol.Network.InitiatorType.Script},
          });
          request.setRemoteAddress('127.0.0.1', 6789);

          const entry = await build(request, {sanitize: false});

          assert.strictEqual(entry.serverIPAddress, '127.0.0.1');
          assert.strictEqual(entry.connection, '6789');
        });

        it('exports Chrome-specific connection ID', async () => {
          const request = createNetworkRequest({
            requestId,
            url,
            documentURL: '',
            initiator: {requestId, type: Protocol.Network.InitiatorType.Script},
          });
          request.connectionId = 'foobar';

          const entry = await build(request, {sanitize: false});

          assert.strictEqual(entry._connectionId, 'foobar');
        });

        it('exports Service Worker info', async () => {
          const cacheName = 'v1';
          const serviceWorkerRouterInfo: Protocol.Network.ServiceWorkerRouterInfo = {
            ruleIdMatched: 1,
            matchedSourceType: Protocol.Network.ServiceWorkerRouterSource.Cache,
            actualSourceType: Protocol.Network.ServiceWorkerRouterSource.Network,
          };
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
            workerStart: 500,
            workerReady: 1000,
            workerFetchStart: 1050,
            workerRespondWithSettled: 3000,
            sendStart: 0,
            sendEnd: 0,
            pushStart: 0,
            pushEnd: 0,
            receiveHeadersStart: 0,
            receiveHeadersEnd: 0,
            workerRouterEvaluationStart: 200,
            workerCacheLookupStart: 100,
          };
          const request = createNetworkRequest({
            requestId,
            url,
            documentURL: '',
            initiator: {requestId, type: Protocol.Network.InitiatorType.Script},
            fetchedViaServiceWorker: true,
            serviceWorkerRouterInfo,
            timing: timingInfo,
          });

          request.setResponseCacheStorageCacheName(cacheName);
          request.setServiceWorkerResponseSource(Protocol.Network.ServiceWorkerResponseSource.CacheStorage);

          const entry = await build(request, {sanitize: false});

          assert.isTrue(entry.response._fetchedViaServiceWorker);
          assert.strictEqual(entry.response._responseCacheStorageCacheName, cacheName);
          assert.strictEqual(
              entry.response._serviceWorkerResponseSource, Protocol.Network.ServiceWorkerResponseSource.CacheStorage);
          assert.strictEqual(entry.response._serviceWorkerRouterRuleIdMatched, serviceWorkerRouterInfo.ruleIdMatched);
          assert.strictEqual(
              entry.response._serviceWorkerRouterMatchedSourceType, serviceWorkerRouterInfo.matchedSourceType);
          assert.strictEqual(
              entry.response._serviceWorkerRouterActualSourceType, serviceWorkerRouterInfo.actualSourceType);

          assert.strictEqual(entry.timings._workerStart, timingInfo.workerStart);
          assert.strictEqual(entry.timings._workerReady, timingInfo.workerReady);
          assert.strictEqual(entry.timings._workerFetchStart, timingInfo.workerFetchStart);
          assert.strictEqual(entry.timings._workerRespondWithSettled, timingInfo.workerRespondWithSettled);
          assert.strictEqual(entry.timings._workerRouterEvaluationStart, timingInfo.workerRouterEvaluationStart);
          assert.strictEqual(entry.timings._workerCacheLookupStart, timingInfo.workerCacheLookupStart);
        });

        it('exports WebSocket messages', async () => {
          const request = createNetworkRequest({
            requestId,
            url,
            documentURL: '',
            resourceType: Common.ResourceType.resourceTypes.WebSocket,
          });

          const time = Date.now() / 1000;
          request.addFrame({
            type: SDK.NetworkRequest.WebSocketFrameType.Send,
            text: 'text message',
            time,
            opCode: 1,
            mask: true,
          });
          request.addFrame({
            type: SDK.NetworkRequest.WebSocketFrameType.Receive,
            text: 'YmluYXJ5IG1lc3NhZ2U=',
            time: time + 1,
            opCode: 2,
            mask: false,
          });
          request.addFrame({
            type: SDK.NetworkRequest.WebSocketFrameType.Receive,
            text: 'last message',
            time: time + 2,
            opCode: 1,
            mask: false,
          });

          const entry = await build(request, {sanitize: false});

          assert.exists(entry._webSocketMessages);
          assert.lengthOf(entry._webSocketMessages, 3);

          assert.deepEqual(entry._webSocketMessages[0], {
            type: SDK.NetworkRequest.WebSocketFrameType.Send,
            time,
            opcode: 1,
            data: 'text message',
          });
          assert.deepEqual(entry._webSocketMessages[1], {
            type: SDK.NetworkRequest.WebSocketFrameType.Receive,
            time: time + 1,
            opcode: 2,
            data: 'YmluYXJ5IG1lc3NhZ2U=',
          });
          assert.deepEqual(entry._webSocketMessages[2], {
            type: SDK.NetworkRequest.WebSocketFrameType.Receive,
            time: time + 2,
            opcode: 1,
            data: 'last message',
          });
        });

        it('exports form data parameters, query parameters, and IPv6 address', async () => {
          const requestUrl =
              'http://[::1]:8000/devtools/resources/post-target.cgi?queryParam1=queryValue1&queryParam2=#fragmentParam1=fragmentValue1&fragmentParam2=';
          const request = createNetworkRequest({
            requestId,
            url: requestUrl,
            documentURL: '',
            requestMethod: 'POST',
            requestHeaders: [{name: 'Content-Type', value: 'application/x-www-form-urlencoded'}],
          });
          request.setRemoteAddress('[::1]', 8000);
          request.setRequestFormData(true, 'formParam1=formValue1&formParam2=');

          const entry = await build(request, {sanitize: false});

          assert.strictEqual(
              entry.request.url,
              'http://[::1]:8000/devtools/resources/post-target.cgi?queryParam1=queryValue1&queryParam2=');
          assert.strictEqual(entry.request.method, 'POST');
          assert.deepEqual(entry.request.queryString, [
            {name: 'queryParam1', value: 'queryValue1'},
            {name: 'queryParam2', value: ''},
          ]);
          assert.deepEqual(entry.request.postData, {
            mimeType: 'application/x-www-form-urlencoded',
            text: 'formParam1=formValue1&formParam2=',
            params: [
              {name: 'formParam1', value: 'formValue1'},
              {name: 'formParam2', value: ''},
            ],
          });
          assert.strictEqual(entry.serverIPAddress, '[::1]');
          assert.strictEqual(entry.connection, '8000');
        });
      });
    });
  });
});
