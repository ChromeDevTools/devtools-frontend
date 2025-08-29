// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as HAR from '../har/har.js';

const exampleLog = new HAR.HARFormat.HARLog({
  version: '1.2',
  creator: {
    name: 'WebInspector',
    version: '537.36',
  },
  pages: [{
    startedDateTime: '2009-04-16T12:07:25.123+01:00',
    id: 'page_0',
    title: 'Test Page',
    pageTimings: {
      onContentLoad: 1720,
      onLoad: 2500,
      comment: '',
    },
    comment: '',
  }],
  entries: [
    {
      _connectionId: '1',
      _initiator: {
        type: 'script',
        requestId: '12',
        stack: {
          callFrames: [
            {
              functionName: 'testFunction',
              scriptId: '52',
              url: 'https://example.com/script.js',
              lineNumber: 0,
              columnNumber: 1,
            },
          ],
          description: 'wow',
          parentId: {
            id: '34',
            debuggerId: '36',
          },
          parent: {
            callFrames: [
              {
                functionName: 'testFunction1',
                scriptId: '53',
                url: 'https://example.com/script1.js',
                lineNumber: 1,
                columnNumber: 2,
              },
            ],
          },
        },
      },
      _priority: 'High',
      _resourceType: 'xhr',
      cache: {},
      connection: '6789',
      request: {
        method: 'POST',
        url: 'https://example.com/api/testEndpoint?param1=test',
        httpVersion: 'http/2.0',
        headers: [
          {
            name: ':method',
            value: 'POST',
          },
        ],
        queryString: [
          {
            name: 'param1',
            value: 'test',
          },
        ],
        headersSize: -1,
        bodySize: 109,
        cookies: [
          {
            name: 'Foo',
            value: 'bar',
          },
        ],
      },
      response: {
        status: 200,
        statusText: '',
        httpVersion: 'http/2.0',
        headers: [],
        content: {
          size: 3697,
          mimeType: 'application/json',
          text: 'console.log(\'hello world\');',
        },
        cookies: [
          {
            name: 'MyAwesomeCookie',
            value: 'Secret!',
          },
        ],
        redirectURL: '',
        headersSize: -1,
        bodySize: -1,
        _transferSize: 2903,
        _error: null,
        _fetchedViaServiceWorker: true,
        _responseCacheStorageCacheName: 'v1',
        _serviceWorkerResponseSource: 'cache-storage',
        _serviceWorkerRouterRuleIdMatched: 1,
        _serviceWorkerRouterMatchedSourceType: 'cache',
        _serviceWorkerRouterActualSourceType: 'network',
      },
      serverIPAddress: '127.0.0.1',
      startedDateTime: '2020-12-14T17:35:53.241Z',
      time: 512.348,
      timings: {
        blocked: 0.7580000340715051,
        dns: -1,
        ssl: -1,
        connect: -1,
        send: 0.378,
        wait: 510.48699999354034,
        receive: 0.7249999907799065,
        _blocked_queueing: 0.5090000340715051,
        _workerStart: 30,
        _workerReady: 2,
        _workerFetchStart: 10,
        _workerRespondWithSettled: 300,
        _workerRouterEvaluationStart: 100,
        _workerCacheLookupStart: 200,
      },
    },
    {
      pageref: 'page_0',
      _connectionId: '1',
      _initiator: {
        type: 'script',
        stack: {
          callframes: [
            {
              functionName: 'testFunction',
              scriptId: '52',
              url: 'https://example.com/script2.js',
              lineNumber: 0,
              columnNumber: 1,
            },
          ],
        },
      },
      cache: {},
      connection: '6789',
      request: {
        method: 'POST',
        url: 'https://example.com/api/testEndpoint?param2=test2',
        httpVersion: 'http/2.0',
        headers: [
          {
            name: ':method',
            value: 'POST',
          },
        ],
        queryString: [
          {
            name: 'param1',
            value: 'test',
          },
        ],
        headersSize: -1,
        bodySize: 109,
        cookies: [
          {
            name: 'Foo',
            value: 'bar',
          },
        ],
      },
      response: {
        status: 200,
        statusText: '',
        httpVersion: 'http/2.0',
        headers: [],
        content: {
          size: 1234,
          mimeType: 'text/plain',
          text: '<html>Hello, World!</html>',
        },
        cookies: [
          {
            name: 'MyAwesomeCookie',
            value: 'Secret!',
          },
        ],
        redirectURL: '',
        headersSize: -1,
        bodySize: -1,
        _transferSize: 2903,
        _error: null,
      },
      serverIPAddress: '127.0.0.1',
      startedDateTime: '2020-12-14T20:35:53.241Z',
      time: 500,
      timings: {
        blocked: 0.7580000340715051,
        dns: -1,
        ssl: -1,
        connect: -1,
        send: 0.378,
        wait: 510.48699999354034,
        receive: 0.7249999907799065,
        _blocked_queueing: 0.5090000340715051,
      },
    },
  ],
});

describe('HAR Importer', () => {
  let requests: SDK.NetworkRequest.NetworkRequest[];
  before(async () => {
    requests = HAR.Importer.Importer.requestsFromHARLog(exampleLog);
  });

  it('Parses the correct number of Network Requests from HAR file', () => {
    assert.lengthOf(requests, 2);
  });

  it('Parses the main parts of a Network Request', () => {
    const parsedRequest = requests[0];
    // Validate constructor params of NetworkRequest
    assert.strictEqual(parsedRequest.requestId(), 'har-0');
    assert.strictEqual(parsedRequest.url(), 'https://example.com/api/testEndpoint?param1=test');
    assert.strictEqual(parsedRequest.documentURL, 'https://example.com/api/testEndpoint?param1=test');
    assert.isNull(parsedRequest.frameId);
    assert.isNull(parsedRequest.loaderId);
    assert.deepEqual(
        parsedRequest.initiator() as HAR.HARFormat.HARInitiator,
        {
          type: Protocol.Network.InitiatorType.Script,
          requestId: '12' as Protocol.Network.RequestId,
          stack: {
            callFrames: [
              {
                custom: new Map(),
                functionName: 'testFunction',
                scriptId: '52' as Protocol.Runtime.ScriptId,
                url: 'https://example.com/script.js',
                lineNumber: 0,
                columnNumber: 1,
              } as HAR.HARFormat.HARCallFrame,
            ],
            custom: new Map(),
            description: 'wow',
            parentId: {
              id: '34',
              debuggerId: '36' as Protocol.Runtime.UniqueDebuggerId,
            },
            parent: {
              callFrames: [
                {
                  custom: new Map(),
                  functionName: 'testFunction1',
                  scriptId: '53' as Protocol.Runtime.ScriptId,
                  url: 'https://example.com/script1.js',
                  lineNumber: 1,
                  columnNumber: 2,
                } as HAR.HARFormat.HARCallFrame,
              ],
              custom: new Map(),
              description: undefined,
              parent: undefined,
              parentId: undefined,
            } as HAR.HARFormat.HARStack,
          } as HAR.HARFormat.HARStack,
          url: undefined,
          lineNumber: undefined,
        } as HAR.HARFormat.HARInitiator,
    );
  });

  it('Creates documents for entries with a pageref', () => {
    const pageLoadRequest = requests[1];
    assert.isTrue(pageLoadRequest.resourceType().isDocument());
  });

  it('Parses service worker info in entries', () => {
    const parsedRequest = requests[0];
    assert.isTrue(parsedRequest.fetchedViaServiceWorker);
    assert.strictEqual(parsedRequest.getResponseCacheStorageCacheName(), 'v1');
    assert.strictEqual(parsedRequest.serviceWorkerResponseSource(), 'cache-storage');
    assert.strictEqual(parsedRequest.serviceWorkerRouterInfo?.ruleIdMatched, 1);
    assert.strictEqual(parsedRequest.serviceWorkerRouterInfo?.matchedSourceType, 'cache');
    assert.strictEqual(parsedRequest.serviceWorkerRouterInfo?.actualSourceType, 'network');
  });

  it('Parses the request timings', () => {
    const parsedRequest = requests[0];
    const timing = parsedRequest.timing;
    assert.deepEqual(timing, {
      connectEnd: -1,
      connectStart: -1,
      dnsEnd: -1,
      dnsStart: -1,
      proxyEnd: -1,
      proxyStart: -1,
      pushEnd: 0,
      pushStart: 0,
      receiveHeadersEnd: 511.11399999354035,
      receiveHeadersStart: 0.627,
      requestTime: 1607967353.241509,
      sendEnd: 0.627,
      sendStart: 0.249,
      sslEnd: -1,
      sslStart: -1,
      workerReady: 2,
      workerFetchStart: 10,
      workerRespondWithSettled: 300,
      workerStart: 30,
      workerRouterEvaluationStart: 100,
      workerCacheLookupStart: 200,
    });
  });

  it('Parses the remote address correctly', () => {
    for (const request of requests) {
      assert.strictEqual(request.remoteAddress(), '127.0.0.1:6789');
    }
  });

  it('Parses the Chrome-specific connection ID', () => {
    for (const request of requests) {
      assert.strictEqual(request.connectionId, '1');
    }
  });

  it('Parses the request cookies correctly', () => {
    for (const request of requests) {
      assert.lengthOf(request.includedRequestCookies(), 1);
      assert.strictEqual(request.includedRequestCookies()[0].cookie.name(), 'Foo');
      assert.strictEqual(request.includedRequestCookies()[0].cookie.value(), 'bar');
    }
  });

  it('Parses the response cookies correctly', () => {
    for (const request of requests) {
      assert.lengthOf(request.responseCookies, 1);
      assert.strictEqual(request.responseCookies[0].name(), 'MyAwesomeCookie');
      assert.strictEqual(request.responseCookies[0].value(), 'Secret!');
    }
  });
});
