// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as HAR from '../har/har.js';

describe('HAR', () => {
  describe('Log', () => {
    describe('Entry', () => {
      describe('build', () => {
        const requestId = 'r0' as Protocol.Network.RequestId;
        const {build} = HAR.Log.Entry;
        const url = 'p0.com' as Platform.DevToolsPath.UrlString;

        it('exports request cookies and authorization headers by default', async () => {
          const request = SDK.NetworkRequest.NetworkRequest.create(
              requestId, url, Platform.DevToolsPath.EmptyUrlString, null, null, null);
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
          const request = SDK.NetworkRequest.NetworkRequest.create(
              requestId, url, Platform.DevToolsPath.EmptyUrlString, null, null, null);
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
          const request = SDK.NetworkRequest.NetworkRequest.create(
              requestId, url, Platform.DevToolsPath.EmptyUrlString, null, null, null);
          request.responseHeaders = [{name: 'Set-Cookie', value: 'Foo=Bar'}];

          const entry = await build(request, {sanitize: false});

          assert.deepEqual(entry.response.headers, [
            {name: 'Set-Cookie', value: 'Foo=Bar'},
          ]);
          assert.lengthOf(entry.response.cookies, 1);
          assert.strictEqual(entry.response.cookies[0].name, 'Foo');
          assert.strictEqual(entry.response.cookies[0].value, 'Bar');
        });

        it('removes response cookies when requested', async () => {
          const request = SDK.NetworkRequest.NetworkRequest.create(
              requestId, url, Platform.DevToolsPath.EmptyUrlString, null, null, null);
          request.responseHeaders = [
            {name: 'Content-Type', value: 'text/html'},
            {name: 'Set-Cookie', value: 'Foo=Bar'},
          ];

          const entry = await build(request, {sanitize: true});

          assert.deepEqual(entry.response.headers, [{name: 'Content-Type', value: 'text/html'}]);
          assert.deepEqual(entry.response.cookies, []);
        });

        it('returns blocked time when no response is received in milliseconds', async () => {
          const request = SDK.NetworkRequest.NetworkRequest.create(
              requestId, url, Platform.DevToolsPath.EmptyUrlString, null, null, null);
          const issueTime = new Date(2020, 1, 3).getTime() / 1000;
          request.setIssueTime(issueTime, issueTime);
          request.endTime = issueTime + 5;

          const entry = await build(request, {sanitize: false});

          assert.strictEqual(entry.timings.blocked, 5000, 'HARLog entry\'s blocked time is incorrect');
        });

        it('exports initiator request ID', async () => {
          const request = SDK.NetworkRequest.NetworkRequest.create(
              requestId, url, Platform.DevToolsPath.EmptyUrlString, null, null,
              {requestId, type: Protocol.Network.InitiatorType.Script});

          const entry = await build(request, {sanitize: false});

          assert.strictEqual(entry._initiator?.requestId, requestId);
        });

        it('exports Service Worker info', async () => {
          const request = SDK.NetworkRequest.NetworkRequest.create(
              requestId, url, Platform.DevToolsPath.EmptyUrlString, null, null,
              {requestId, type: Protocol.Network.InitiatorType.Script});

          const cacheName = 'v1';
          request.fetchedViaServiceWorker = true;
          request.setResponseCacheStorageCacheName(cacheName);
          request.setServiceWorkerResponseSource(Protocol.Network.ServiceWorkerResponseSource.CacheStorage);

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
          };
          request.timing = timingInfo;

          const entry = await build(request, {sanitize: false});

          assert.strictEqual(entry.response._fetchedViaServiceWorker, true);
          assert.strictEqual(entry.response._responseCacheStorageCacheName, cacheName);
          assert.strictEqual(
              entry.response._serviceWorkerResponseSource, Protocol.Network.ServiceWorkerResponseSource.CacheStorage);

          assert.strictEqual(entry.timings._workerStart, timingInfo.workerStart);
          assert.strictEqual(entry.timings._workerReady, timingInfo.workerReady);
          assert.strictEqual(entry.timings._workerFetchStart, timingInfo.workerFetchStart);
          assert.strictEqual(entry.timings._workerRespondWithSettled, timingInfo.workerRespondWithSettled);
        });
      });
    });
  });
});
