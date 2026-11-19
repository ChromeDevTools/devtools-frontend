// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {before, describe, it} from 'mocha';

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';

import * as HAR from './har.js';

const harPreamble = {
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
};

const exampleLog = new HAR.HARFormat.HARLog({
  ...harPreamble,
  entries: [
    {
      _connectionId: '1',
      _initialPriority: 'Low',
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

  it('Parses the Chrome-specific initial priority', () => {
    assert.strictEqual(requests[0].initialPriority(), Protocol.Network.ResourcePriority.Low);
    assert.strictEqual(requests[0].priority(), Protocol.Network.ResourcePriority.High);
  });

  it('Leaves both priorities unset for an entry that has neither field', () => {
    assert.isNull(requests[1].initialPriority());
    assert.isNull(requests[1].priority());
  });

  it('Only accepts an initial priority that is a protocol value', () => {
    const entry = {
      _priority: 'High',
      cache: {},
      request: {
        method: 'GET',
        url: 'https://example.com/image.png',
        httpVersion: 'http/1.1',
        headers: [],
        queryString: [],
        cookies: [],
        headersSize: -1,
        bodySize: 0,
      },
      response: {
        status: 200,
        statusText: 'OK',
        httpVersion: 'http/1.1',
        headers: [],
        cookies: [],
        content: {size: 0, mimeType: 'image/png'},
        redirectURL: '',
        headersSize: -1,
        bodySize: 0,
      },
      startedDateTime: '2020-12-14T20:36:00.000Z',
      time: 100,
      timings: {blocked: 0, dns: -1, ssl: -1, connect: -1, send: 0, wait: 50, receive: 50},
    };

    // 'Highest' is the label the UI shows for VeryHigh rather than a protocol value, and
    // 'constructor' and 'hasOwnProperty' live on the enum object's prototype, not on the object.
    const cases: Array<[unknown, Protocol.Network.ResourcePriority | null]> = [
      ['VeryLow', Protocol.Network.ResourcePriority.VeryLow],
      ['VeryHigh', Protocol.Network.ResourcePriority.VeryHigh],
      ['Highest', null],
      ['Veryhigh', null],
      ['', null],
      [12345, null],
      [null, null],
      ['constructor', null],
      ['hasOwnProperty', null],
      [{}, null],
      [['Low', 'High'], null],
    ];

    for (const [initialPriority, expected] of cases) {
      const log = new HAR.HARFormat.HARLog({...harPreamble, entries: [{...entry, _initialPriority: initialPriority}]});
      const requests = HAR.Importer.Importer.requestsFromHARLog(log);

      assert.lengthOf(requests, 1);
      assert.strictEqual(requests[0].initialPriority(), expected, `for ${JSON.stringify(initialPriority)}`);
      assert.strictEqual(requests[0].priority(), Protocol.Network.ResourcePriority.High);
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

  it('Parses EventSource messages from HAR', () => {
    const sseReq = {
      _connectionId: '2',
      _initiator: {
        type: 'script',
        stack: {
          callframes: [
            {
              functionName: 'fetchEvents',
              scriptId: '54',
              url: 'https://example.com/event-script.js',
              lineNumber: 5,
              columnNumber: 10,
            },
          ],
        },
      },
      _priority: 'High',
      _resourceType: 'fetch',
      cache: {},
      connection: '6790',
      request: {
        method: 'GET',
        url: 'https://example.com/events',
        httpVersion: 'http/1.1',
        headers: [],
        queryString: [],
        headersSize: -1,
        bodySize: 0,
        cookies: [],
      },
      response: {
        status: 200,
        statusText: 'OK',
        httpVersion: 'http/1.1',
        headers: [
          {
            name: 'Content-Type',
            value: 'text/event-stream',
          },
        ],
        content: {
          size: 100,
          mimeType: 'text/event-stream',
          text: 'id: 1\n' +
              'event: greeting\n' +
              'data: Hello World!\n\n' +
              'data: Another message\n' +
              'id: 2\n' +
              'event: update\n' +
              'data: This is an update.\n\n' +
              ': this is a comment\n' +
              'id: 3\n' +
              'data: Final message.\n' +
              '\n',
        },
        cookies: [],
        redirectURL: '',
        headersSize: -1,
        bodySize: -1,
        _transferSize: 150,
        _error: null,
      },
      serverIPAddress: '127.0.0.1',
      startedDateTime: '2020-12-14T20:36:00.000Z',
      time: 100,
      timings: {
        blocked: 0.1,
        dns: -1,
        ssl: -1,
        connect: -1,
        send: 0.1,
        wait: 50,
        receive: 49.8,
        _blocked_queueing: 0.05,
      },
    };
    const exampleLog = new HAR.HARFormat.HARLog({...harPreamble, entries: [sseReq]});
    const requests = HAR.Importer.Importer.requestsFromHARLog(exampleLog);

    assert.lengthOf(requests, 1);
    const eventStreamRequest = requests[0];
    assert.strictEqual(eventStreamRequest.mimeType, 'text/event-stream');

    const messages = eventStreamRequest.eventSourceMessages();
    assert.lengthOf(messages, 3);

    const expected = [
      {
        data: 'Hello World!',
        eventId: '1',
        eventName: 'greeting',
        time: 1607978160,
      },
      {
        data: 'Another message\nThis is an update.',
        eventId: '2',
        eventName: 'update',
        time: 1607978160,
      },
      {
        data: 'Final message.',
        eventId: '3',
        eventName: 'message',
        time: 1607978160,
      },
    ];
    assert.deepEqual(messages, expected);
  });

  it('Parses multiple EventSource messages from HAR', () => {
    const sseEntry = {
      _initiator: {
        type: 'script',
        stack: {
          callframes: [
            {
              functionName: 'subscribe',
              scriptId: '412',
              url: 'https://example.com/coworker.js',
              lineNumber: 0,
              columnNumber: 79005,
            },
          ],
        },
      },
      _priority: 'High',
      _resourceType: 'fetch',
      cache: {},
      connection: '443',
      request: {
        method: 'POST',
        url: 'https://example.com/v1/subscribe',
        httpVersion: 'http/2.0',
        headers: [
          {
            name: 'accept',
            value: 'text/event-stream',
          },
          {
            name: 'content-type',
            value: 'application/json',
          },
        ],
        queryString: [],
        cookies: [],
        headersSize: -1,
        bodySize: 242,
      },
      response: {
        status: 200,
        statusText: 'OK',
        httpVersion: 'http/2.0',
        headers: [
          {
            name: 'content-type',
            value: 'text/event-stream; charset=utf-8',
          },
        ],
        cookies: [],
        content: {
          size: 220,
          mimeType: 'text/event-stream',
        },
        redirectURL: '',
        headersSize: -1,
        bodySize: -1,
        _transferSize: 389,
        _error: 'net::ERR_ABORTED',
      },
      serverIPAddress: '172.212.241.38',
      startedDateTime: '2026-03-12T21:53:10.360Z',
      time: 5968.845000024885,
      timings: {
        blocked: 167.93600008004904,
        dns: -1,
        ssl: -1,
        connect: -1,
        send: 0.23700000000000002,
        wait: 59.53399990358949,
        receive: 5741.138000041246,
        _blocked_queueing: 167.72700008004904,
      },
      _connectionId: '3435',
      _eventSourceMessages: [
        {
          time: 1773352390.598671,
          eventName: 'session',
          eventId: '',
          data: '{"sid":"11111111-2222-3333-4444-555555555555","tenant":"66666666-7777-8888-9999-000000000000"}',
        },
        {
          time: 1773352391.102345,
          eventName: 'message',
          eventId: '2',
          data: '{"role":"assistant","content":"hello"}',
        },
      ],
    };

    const exampleLog = new HAR.HARFormat.HARLog({
      version: '1.2',
      creator: {
        name: 'WebInspector',
        version: '537.36',
      },
      pages: [],
      entries: [sseEntry],
    });

    const parsedRequests = HAR.Importer.Importer.requestsFromHARLog(exampleLog);
    assert.lengthOf(parsedRequests, 1);

    const parsedRequest = parsedRequests[0];
    assert.strictEqual(parsedRequest.mimeType, 'text/event-stream');
    const messages = parsedRequest.eventSourceMessages();
    assert.lengthOf(messages, 2);
    assert.strictEqual(messages[0].eventName, 'session');
    assert.strictEqual(messages[0].eventId, '');
    assert.strictEqual(messages[1].eventName, 'message');
    assert.strictEqual(messages[1].eventId, '2');
  });

  it('sets the isImportedHar flag to true on imported requests', () => {
    const parsedRequests = HAR.Importer.Importer.requestsFromHARLog(exampleLog);
    assert.lengthOf(parsedRequests, 2);
    assert.isTrue(parsedRequests[0].isImportedHar());
    assert.isTrue(parsedRequests[1].isImportedHar());
  });

  it('preserves URLs in HARInitiator and HARCallFrame for display as inert text', () => {
    const initiator = new HAR.HARFormat.HARInitiator({
      type: 'parser',
      url: 'chrome-extension://nnkmpipfcdgmkgepigmhifcgbddoohgk/secret.html',
    });
    assert.strictEqual(initiator.url, 'chrome-extension://nnkmpipfcdgmkgepigmhifcgbddoohgk/secret.html');

    const callFrame = new HAR.HARFormat.HARCallFrame({
      url: 'chrome-extension://nnkmpipfcdgmkgepigmhifcgbddoohgk/secret.js',
    });
    assert.strictEqual(callFrame.url, 'chrome-extension://nnkmpipfcdgmkgepigmhifcgbddoohgk/secret.js');
  });

  it('imports network requests from a HARRoot log', async () => {
    const harJson = {
      log: {
        version: '1.2',
        creator: {name: 'WebInspector', version: '537.36'},
        pages: [{
          startedDateTime: '2018-11-20T20:43:07.756Z',
          id: 'page_1',
          title: 'http://localhost:8000/',
          pageTimings: {onContentLoad: 67.84599996171892, onLoad: 112.05600015819073},
        }],
        entries: [
          {
            startedDateTime: '2018-11-20T20:43:07.755Z',
            time: 11.14144808263518,
            request: {
              method: 'GET',
              url: 'http://localhost:8000/',
              httpVersion: 'HTTP/1.1',
              headers: [{name: 'Host', value: 'localhost:8000'}],
              queryString: [],
              cookies: [],
              headersSize: 418,
              bodySize: 0,
            },
            response: {
              status: 200,
              statusText: 'OK',
              httpVersion: 'HTTP/1.1',
              headers: [{name: 'Content-Type', value: 'text/html;charset=ISO-8859-1'}],
              cookies: [{
                name: 'test-cookie-name',
                value: '1',
                path: '/',
                domain: '.localhost',
                expires: '2018-11-19T18:17:22.000Z',
                httpOnly: false,
                secure: false,
              }],
              content: {size: 4633, mimeType: 'text/html', text: 'fake page data'},
              redirectURL: '',
              headersSize: 188,
              bodySize: 4633,
              _transferSize: 4821,
            },
            cache: {},
            timings: {
              blocked: 2.4644479999188333,
              dns: -1,
              ssl: -1,
              connect: -1,
              send: 0.06999999999999984,
              wait: 3.089999983072281,
              receive: 5.517000099644065,
              _blocked_queueing: 0.447999918833375,
              _blocked_proxy: 0.44899999999999984,
            },
            serverIPAddress: '[::1]',
            _initiator: {type: 'other'},
            _priority: 'VeryHigh',
            _connectionId: '2945',
            pageref: 'page_1',
          },
          {
            startedDateTime: '2018-11-20T20:43:07.870Z',
            time: 3.8945360814686865,
            request: {
              method: 'POST',
              url: 'http://localhost:8000/post-endpoint',
              httpVersion: 'HTTP/1.1',
              headers: [],
              queryString: [],
              cookies: [],
              headersSize: 386,
              bodySize: 0,
              postData: {
                mimeType: 'application/x-www-form-urlencoded',
                text: 'one=urlencodedvalueone&two=urlencodedvaluetwo',
                params: [{name: 'one', value: 'urlencodedvalueone'}, {name: 'two', value: 'urlencodedvaluetwo'}],
              },
            },
            response: {
              status: 200,
              statusText: 'OK',
              httpVersion: 'HTTP/1.1',
              headers: [],
              cookies: [],
              content: {size: 1150, mimeType: 'image/x-icon', compression: 0},
              redirectURL: '',
              headersSize: 267,
              bodySize: 1150,
              _transferSize: 1417,
            },
            cache: {},
            timings: {
              blocked: 2.2485360001232477,
              dns: -1,
              ssl: -1,
              connect: -1,
              send: 0.06099999999999994,
              wait: 0.5190001133680342,
              receive: 1.0659999679774046,
              _blocked_queueing: 0.5360001232475042,
              _blocked_proxy: 0.4910000000000001,
            },
            serverIPAddress: '[::1]',
            _initiator: {type: 'parser', url: 'http://localhost/', lineNumber: 1},
            _priority: 'Low',
            _connectionId: '2945',
            pageref: 'page_1',
          },
          {
            startedDateTime: '2018-11-20T20:43:07.870Z',
            time: 3.8945360814686865,
            request: {
              method: 'GET',
              url: 'http://localhost:8000/js_file.js',
              httpVersion: 'HTTP/1.1',
              headers: [],
              queryString: [],
              cookies: [],
              headersSize: 386,
              bodySize: 0,
            },
            response: {
              status: 200,
              statusText: 'OK',
              httpVersion: 'HTTP/1.1',
              headers: [],
              cookies: [],
              content: {size: 1150, compression: 0},
              redirectURL: '',
              headersSize: 267,
              bodySize: 1150,
              _transferSize: 1417,
            },
            cache: {},
            timings: {
              blocked: 2.2485360001232477,
              dns: -1,
              ssl: -1,
              connect: -1,
              send: 0.06099999999999994,
              wait: 0.5190001133680342,
              receive: 1.0659999679774046,
              _blocked_queueing: 0.5360001232475042,
              _blocked_proxy: 0.4910000000000001,
            },
            serverIPAddress: '[::1]',
            _initiator: 'bad_initiator_string',
            _priority: 'Low',
            _connectionId: '2945',
            pageref: 'page_1',
          },
          {
            startedDateTime: '2018-11-20T20:43:07.870Z',
            time: 3.8945360814686865,
            request: {
              method: 'GET',
              url: 'http://localhost:8000/endpoint',
              httpVersion: 'HTTP/1.1',
              headers: [],
              queryString: [],
              cookies: [],
              headersSize: 386,
              bodySize: 0,
            },
            response: {
              status: 200,
              statusText: 'OK',
              httpVersion: 'HTTP/1.1',
              headers: [],
              cookies: [],
              content: {size: 1150, compression: 0},
              redirectURL: '',
              headersSize: 267,
              bodySize: 1150,
              _transferSize: 1417,
            },
            cache: {},
            timings: {
              blocked: 2.2485360001232477,
              dns: -1,
              ssl: -1,
              connect: -1,
              send: 0.06099999999999994,
              wait: 0.5190001133680342,
              receive: 1.0659999679774046,
              _blocked_queueing: 0.5360001232475042,
              _blocked_proxy: 0.4910000000000001,
            },
            serverIPAddress: '[::1]',
            _initiator: {
              type: 'script',
              stack: {
                callFrames: {
                  functionName: '',
                  scriptId: '32',
                  url: 'http://localhost:8000/script.js',
                  lineNumber: 5,
                  colNumber: 2,
                },
              },
            },
            _priority: 'Low',
            _resourceType: 'fetch',
            _connectionId: '2945',
            pageref: 'page_1',
          },
          {
            startedDateTime: '2019-04-18T17:23:48.174Z',
            time: 33045.93599960208,
            request: {
              method: 'GET',
              url: 'ws://localhost:8880/echo',
              httpVersion: 'HTTP/1.1',
              headers: [
                {name: 'Pragma', value: 'no-cache'},
                {name: 'Origin', value: 'http://localhost:8000'},
                {name: 'Accept-Encoding', value: 'gzip, deflate, br'},
                {name: 'Host', value: 'localhost:8880'},
                {name: 'Accept-Language', value: 'en-US,en;q=0.9'},
                {name: 'Sec-WebSocket-Key', value: 'EBTeYTo1PMrIJhQV3KCyLA=='},
                {
                  name: 'User-Agent',
                  value:
                      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3762.0 Safari/537.36',
                },
                {name: 'Upgrade', value: 'websocket'},
                {name: 'Sec-WebSocket-Extensions', value: 'permessage-deflate; client_max_window_bits'},
                {name: 'Cache-Control', value: 'no-cache'},
                {name: 'Connection', value: 'Upgrade'},
                {name: 'Sec-WebSocket-Version', value: '13'},
              ],
              queryString: [],
              cookies: [],
              headersSize: 506,
              bodySize: 0,
            },
            response: {
              status: 101,
              statusText: 'Switching Protocols',
              httpVersion: 'HTTP/1.1',
              headers: [
                {name: 'Sec-WebSocket-Accept', value: 'U81HpQbqlT7cIvlTLbf4dTv7m5w='},
                {name: 'Connection', value: 'Upgrade'},
                {name: 'Sec-WebSocket-Extensions', value: 'permessage-deflate'},
                {name: 'Upgrade', value: 'websocket'},
              ],
              cookies: [],
              content: {size: 0, mimeType: 'x-unknown', compression: 175},
              redirectURL: '',
              headersSize: 175,
              bodySize: -175,
              _transferSize: 0,
            },
            cache: {},
            timings: {
              blocked: -1,
              dns: -1,
              ssl: -1,
              connect: -1,
              send: 0,
              wait: 33045.93599960208,
              receive: 0,
              _blocked_queueing: -1,
            },
            serverIPAddress: '',
            _initiator: {
              type: 'script',
              stack: {
                callFrames: [{functionName: '', scriptId: '73', url: '', lineNumber: 0, columnNumber: 5}],
              },
            },
            _priority: null,
            _resourceType: 'websocket',
            _webSocketMessages: [
              {type: 'send', time: 1555608234.452854, opcode: 1, data: 'message one'},
              {type: 'receive', time: 1555608234.454548, opcode: 1, data: 'message one'},
              {type: 'send', time: 1555608237.98099, opcode: 1, data: 'message two'},
              {type: 'receive', time: 1555608237.9821968, opcode: 1, data: 'message two'},
              {type: 'send', time: 1555608261.219595, opcode: 2, data: 'YmluYXJ5IG1lc3NhZ2U='},
              {type: 'receive', time: 1555608261.2207098, opcode: 2, data: 'YmluYXJ5IG1lc3NhZ2U='},
            ],
          },
        ],
      },
    };

    const harRoot = new HAR.HARFormat.HARRoot(harJson);
    const importedRequests = HAR.Importer.Importer.requestsFromHARLog(harRoot.log);
    const formattedRequests = await Promise.all(importedRequests.map(async request => {
      const contentData = await request.requestContentData();
      assert.isFalse(TextUtils.ContentData.ContentData.isError(contentData));
      if (TextUtils.ContentData.ContentData.isError(contentData)) {
        throw new Error(`Unexpected ContentData error: ${contentData.error}`);
      }
      return {
        url: request.url(),
        documentURL: request.documentURL,
        initiator: request.initiator(),
        requestFormData: await request.requestFormData(),
        connectionId: request.connectionId,
        requestMethod: request.requestMethod,
        requestHeaders: request.requestHeaders(),
        mimeType: request.mimeType,
        responseHeaders: request.responseHeaders,
        statusCode: request.statusCode,
        statusText: request.statusText,
        protocol: request.protocol,
        resourceSize: request.resourceSize,
        transferSize: request.transferSize,
        cached: request.cached(),
        cachedInMemory: request.cachedInMemory(),
        contentData: {
          text: contentData.text,
          mimeType: contentData.mimeType,
          createdFromBase64: contentData.createdFromBase64,
        },
        remoteAddress: request.remoteAddress(),
        resourceType: request.resourceType(),
        priority: request.priority(),
        finished: request.finished,
        timing: request.timing,
        endTime: request.endTime,
        frames: request.frames(),
      };
    }));

    assert.sameOrderedMembers(
        importedRequests.map(request => request.resourceType()),
        [
          Common.ResourceType.resourceTypes.Document,
          Common.ResourceType.resourceTypes.Image,
          Common.ResourceType.resourceTypes.Script,
          Common.ResourceType.resourceTypes.Fetch,
          Common.ResourceType.resourceTypes.WebSocket,
        ],
    );
    assert.deepEqual(JSON.parse(JSON.stringify(formattedRequests)), [
      {
        url: 'http://localhost:8000/',
        documentURL: 'http://localhost:8000/',
        initiator: {type: 'other'},
        requestFormData: null,
        connectionId: '2945',
        requestMethod: 'GET',
        requestHeaders: [{custom: {}, name: 'Host', value: 'localhost:8000'}],
        mimeType: 'text/html',
        responseHeaders: [{custom: {}, name: 'Content-Type', value: 'text/html;charset=ISO-8859-1'}],
        statusCode: 200,
        statusText: 'OK',
        protocol: 'http/1.1',
        resourceSize: 4633,
        transferSize: 4821,
        cached: false,
        cachedInMemory: false,
        contentData: {text: 'fake page data', mimeType: 'text/html', createdFromBase64: false},
        remoteAddress: '[::1]:80',
        resourceType: {},
        priority: 'VeryHigh',
        finished: true,
        timing: {
          proxyStart: 1.5674480810854585,
          proxyEnd: 2.0164480810854584,
          requestTime: 1542746587.755448,
          dnsStart: -1,
          dnsEnd: -1,
          connectStart: -1,
          connectEnd: -1,
          sslStart: -1,
          sslEnd: -1,
          workerStart: -1,
          workerReady: -1,
          workerFetchStart: -1,
          workerRespondWithSettled: -1,
          sendStart: 2.0164480810854584,
          sendEnd: 2.086448081085458,
          pushStart: 0,
          pushEnd: 0,
          receiveHeadersStart: 2.086448081085458,
          receiveHeadersEnd: 5.176448064157739,
        },
        endTime: 1542746587.7661417,
        frames: [],
      },
      {
        url: 'http://localhost:8000/post-endpoint',
        documentURL: 'http://localhost:8000/',
        initiator: {type: 'parser', url: 'http://localhost/', lineNumber: 1},
        requestFormData: 'one=urlencodedvalueone&two=urlencodedvaluetwo',
        connectionId: '2945',
        requestMethod: 'POST',
        requestHeaders: [],
        mimeType: 'image/x-icon',
        responseHeaders: [],
        statusCode: 200,
        statusText: 'OK',
        protocol: 'http/1.1',
        resourceSize: 1150,
        transferSize: 1417,
        cached: false,
        cachedInMemory: false,
        contentData: {text: '', mimeType: 'image/x-icon', createdFromBase64: false},
        remoteAddress: '[::1]:80',
        resourceType: {},
        priority: 'Low',
        finished: true,
        timing: {
          proxyStart: 1.2215358768757434,
          proxyEnd: 1.7125358768757435,
          requestTime: 1542746587.8705359,
          dnsStart: -1,
          dnsEnd: -1,
          connectStart: -1,
          connectEnd: -1,
          sslStart: -1,
          sslEnd: -1,
          workerStart: -1,
          workerReady: -1,
          workerFetchStart: -1,
          workerRespondWithSettled: -1,
          sendStart: 1.7125358768757435,
          sendEnd: 1.7735358768757434,
          pushStart: 0,
          pushEnd: 0,
          receiveHeadersStart: 1.7735358768757434,
          receiveHeadersEnd: 2.2925359902437776,
        },
        endTime: 1542746587.8738945,
        frames: [],
      },
      {
        url: 'http://localhost:8000/js_file.js',
        documentURL: 'http://localhost:8000/',
        initiator: null,
        requestFormData: null,
        connectionId: '2945',
        requestMethod: 'GET',
        requestHeaders: [],
        mimeType: 'undefined',
        responseHeaders: [],
        statusCode: 200,
        statusText: 'OK',
        protocol: 'http/1.1',
        resourceSize: 1150,
        transferSize: 1417,
        cached: false,
        cachedInMemory: false,
        contentData: {text: '', mimeType: 'text/plain', createdFromBase64: false},
        remoteAddress: '[::1]:80',
        resourceType: {},
        priority: 'Low',
        finished: true,
        timing: {
          proxyStart: 1.2215358768757434,
          proxyEnd: 1.7125358768757435,
          requestTime: 1542746587.8705359,
          dnsStart: -1,
          dnsEnd: -1,
          connectStart: -1,
          connectEnd: -1,
          sslStart: -1,
          sslEnd: -1,
          workerStart: -1,
          workerReady: -1,
          workerFetchStart: -1,
          workerRespondWithSettled: -1,
          sendStart: 1.7125358768757435,
          sendEnd: 1.7735358768757434,
          pushStart: 0,
          pushEnd: 0,
          receiveHeadersStart: 1.7735358768757434,
          receiveHeadersEnd: 2.2925359902437776,
        },
        endTime: 1542746587.8738945,
        frames: [],
      },
      {
        url: 'http://localhost:8000/endpoint',
        documentURL: 'http://localhost:8000/',
        initiator: {type: 'script', stack: {custom: {}, callFrames: []}},
        requestFormData: null,
        connectionId: '2945',
        requestMethod: 'GET',
        requestHeaders: [],
        mimeType: 'undefined',
        responseHeaders: [],
        statusCode: 200,
        statusText: 'OK',
        protocol: 'http/1.1',
        resourceSize: 1150,
        transferSize: 1417,
        cached: false,
        cachedInMemory: false,
        contentData: {text: '', mimeType: 'text/plain', createdFromBase64: false},
        remoteAddress: '[::1]:80',
        resourceType: {},
        priority: 'Low',
        finished: true,
        timing: {
          proxyStart: 1.2215358768757434,
          proxyEnd: 1.7125358768757435,
          requestTime: 1542746587.8705359,
          dnsStart: -1,
          dnsEnd: -1,
          connectStart: -1,
          connectEnd: -1,
          sslStart: -1,
          sslEnd: -1,
          workerStart: -1,
          workerReady: -1,
          workerFetchStart: -1,
          workerRespondWithSettled: -1,
          sendStart: 1.7125358768757435,
          sendEnd: 1.7735358768757434,
          pushStart: 0,
          pushEnd: 0,
          receiveHeadersStart: 1.7735358768757434,
          receiveHeadersEnd: 2.2925359902437776,
        },
        endTime: 1542746587.8738945,
        frames: [],
      },
      {
        url: 'ws://localhost:8880/echo',
        documentURL: 'ws://localhost:8880/echo',
        initiator: {
          type: 'script',
          stack: {
            custom: {},
            callFrames: [{custom: {}, functionName: '', scriptId: '73', url: '', lineNumber: 0, columnNumber: 5}],
          },
        },
        requestFormData: null,
        connectionId: '',
        requestMethod: 'GET',
        requestHeaders: [
          {custom: {}, name: 'Pragma', value: 'no-cache'},
          {custom: {}, name: 'Origin', value: 'http://localhost:8000'},
          {custom: {}, name: 'Accept-Encoding', value: 'gzip, deflate, br'},
          {custom: {}, name: 'Host', value: 'localhost:8880'},
          {custom: {}, name: 'Accept-Language', value: 'en-US,en;q=0.9'},
          {custom: {}, name: 'Sec-WebSocket-Key', value: 'EBTeYTo1PMrIJhQV3KCyLA=='},
          {
            custom: {},
            name: 'User-Agent',
            value:
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3762.0 Safari/537.36',
          },
          {custom: {}, name: 'Upgrade', value: 'websocket'},
          {custom: {}, name: 'Sec-WebSocket-Extensions', value: 'permessage-deflate; client_max_window_bits'},
          {custom: {}, name: 'Cache-Control', value: 'no-cache'},
          {custom: {}, name: 'Connection', value: 'Upgrade'},
          {custom: {}, name: 'Sec-WebSocket-Version', value: '13'},
        ],
        responseHeaders: [
          {custom: {}, name: 'Sec-WebSocket-Accept', value: 'U81HpQbqlT7cIvlTLbf4dTv7m5w='},
          {custom: {}, name: 'Connection', value: 'Upgrade'},
          {custom: {}, name: 'Sec-WebSocket-Extensions', value: 'permessage-deflate'},
          {custom: {}, name: 'Upgrade', value: 'websocket'},
        ],
        statusCode: 101,
        statusText: 'Switching Protocols',
        protocol: 'http/1.1',
        resourceSize: 175,
        transferSize: 0,
        cached: false,
        cachedInMemory: false,
        contentData: {text: '', mimeType: 'text/plain', createdFromBase64: false},
        remoteAddress: ':80',
        resourceType: {},
        priority: null,
        finished: true,
        timing: {
          proxyStart: -1,
          proxyEnd: -1,
          requestTime: 1555608228.174,
          dnsStart: -1,
          dnsEnd: -1,
          connectStart: -1,
          connectEnd: -1,
          sslStart: -1,
          sslEnd: -1,
          workerStart: -1,
          workerReady: -1,
          workerFetchStart: -1,
          workerRespondWithSettled: -1,
          sendStart: 0,
          sendEnd: 0,
          pushStart: 0,
          pushEnd: 0,
          receiveHeadersStart: 0,
          receiveHeadersEnd: 33045.93599960208,
        },
        endTime: 1555608261.2199361,
        frames: [
          {time: 1555608234.452854, text: 'message one', opCode: 1, mask: true, type: 'send'},
          {time: 1555608234.454548, text: 'message one', opCode: 1, mask: false, type: 'receive'},
          {time: 1555608237.98099, text: 'message two', opCode: 1, mask: true, type: 'send'},
          {time: 1555608237.9821968, text: 'message two', opCode: 1, mask: false, type: 'receive'},
          {time: 1555608261.219595, text: 'YmluYXJ5IG1lc3NhZ2U=', opCode: 2, mask: true, type: 'send'},
          {time: 1555608261.2207098, text: 'YmluYXJ5IG1lc3NhZ2U=', opCode: 2, mask: false, type: 'receive'},
        ],
      },
    ]);
  });
});
