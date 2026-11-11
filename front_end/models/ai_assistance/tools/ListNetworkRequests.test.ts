// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../../core/sdk/sdk.js';
import {
  assertIsError,
  assertIsResult,
} from '../../../testing/AiAssistanceHelpers.js';
import {createNetworkRequest} from '../../../testing/NetworkRequestHelpers.js';
import * as Logs from '../../logs/logs.js';
import * as AiAssistance from '../ai_assistance.js';

describe('ListNetworkRequestsTool', () => {
  let networkLog: sinon.SinonStubbedInstance<Logs.NetworkLog.NetworkLog>;

  beforeEach(() => {
    networkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
  });

  it('lists same-origin root, path, and third-party subresource requests successfully', async () => {
    const request1 = createNetworkRequest({
      requestId: 'requestId1',
      url: 'https://example.com/',
      documentURL: 'https://example.com/',
      statusCode: 200,
    });
    request1.setTransferSize(3000);
    request1.setIssueTime(0, 0);
    request1.endTime = 2;

    const request2 = createNetworkRequest({
      requestId: 'requestId2',
      url: 'https://example.com/ads.js',
      documentURL: 'https://example.com/',
      statusCode: 404,
    });
    request2.setTransferSize(1500);
    request2.setIssueTime(0, 0);
    request2.endTime = 1;

    const request3 = createNetworkRequest({
      requestId: 'requestId3',
      url: 'https://3rdparty.com/jquery.js',
      documentURL: 'https://example.com/',
      statusCode: 200,
    });
    request3.setTransferSize(5000);
    request3.setIssueTime(0, 0);
    request3.endTime = 3;

    networkLog.requests.returns([request1, request2, request3]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);

    const expectedResult = `origin: https://example.com (omitted from same-origin /... URLs)
id;url;status;duration;size
requestId1;/;200;2\xA0s;3.0\xA0kB
requestId2;/ads.js;404;1\xA0s;1.5\xA0kB
requestId3;https://3rdparty.com/jquery.js;200;3\xA0s;5.0\xA0kB`;
    assert.strictEqual(response.result, expectedResult);
    assert.deepEqual(response.widgets, [{
                       name: 'NETWORK_REQUESTS_LIST',
                       data: {
                         requests: [request1, request2, request3],
                       },
                     }]);
  });

  it('filters out cross-origin requests', async () => {
    const request1 = createNetworkRequest({
      requestId: 'requestId1',
      url: 'https://example.com/',
      documentURL: 'https://example.com/',
      statusCode: 200,
    });
    request1.setTransferSize(0);
    request1.setIssueTime(0, 0);
    request1.endTime = 0;

    const request2 = createNetworkRequest({
      requestId: 'requestId2',
      url: 'https://another.com/',
      documentURL: 'https://another.com/',
      statusCode: 200,
    });

    networkLog.requests.returns([request1, request2]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);

    const expectedResult = `origin: https://example.com (omitted from same-origin /... URLs)
id;url;status;duration;size
requestId1;/;200;0\xA0s;0.0\xA0kB`;
    assert.strictEqual(response.result, expectedResult);
    assert.deepEqual(response.widgets, [{
                       name: 'NETWORK_REQUESTS_LIST',
                       data: {
                         requests: [request1],
                       },
                     }]);
  });

  it('maintains boundary safety (different port, host suffix, scheme, blob:)', async () => {
    const urls = [
      'https://example.com:8443/api',
      'https://example.com.evil.com/x',
      'http://example.com/mixed.js',
      'wss://example.com/ws',
      'blob:https://example.com/id',
    ];
    const requests = urls.map((url, i) => {
      const request = createNetworkRequest({
        requestId: `requestId${i}`,
        url,
        documentURL: 'https://example.com/',
        statusCode: 200,
      });
      request.setTransferSize(0);
      request.setIssueTime(0, 0);
      request.endTime = 0;
      return request;
    });

    networkLog.requests.returns(requests);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);

    const expectedResult = `origin: https://example.com (omitted from same-origin /... URLs)
id;url;status;duration;size
requestId0;https://example.com:8443/api;200;0\xA0s;0.0\xA0kB
requestId1;https://example.com.evil.com/x;200;0\xA0s;0.0\xA0kB
requestId2;http://example.com/mixed.js;200;0\xA0s;0.0\xA0kB
requestId3;wss://example.com/ws;200;0\xA0s;0.0\xA0kB
requestId4;blob:https://example.com/id;200;0\xA0s;0.0\xA0kB`;
    assert.strictEqual(response.result, expectedResult);
  });

  it('handles imported HAR origin resolution', async () => {
    const request1 = createNetworkRequest({
      requestId: 'requestId1',
      url: 'https://example.com/api/users',
      documentURL: 'https://example.com/index.html',
      statusCode: 200,
      isImportedHar: true,
    });
    request1.setTransferSize(0);
    request1.setIssueTime(0, 0);
    request1.endTime = 0;

    networkLog.requests.returns([request1]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('imported-har://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);

    const expectedResult = `origin: https://example.com (omitted from same-origin /... URLs)
id;url;status;duration;size
requestId1;/api/users;200;0\xA0s;0.0\xA0kB`;
    assert.strictEqual(response.result, expectedResult);
  });

  it('handles local file:// origin', async () => {
    const request1 = createNetworkRequest({
      requestId: 'requestId1',
      url: 'file:///Users/dev/app.js',
      documentURL: 'file:///Users/dev/index.html',
      statusCode: 200,
    });
    request1.setTransferSize(0);
    request1.setIssueTime(0, 0);
    request1.endTime = 0;

    networkLog.requests.returns([request1]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('file:///Users/dev/index.html'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);

    const expectedResult = `id;url;status;duration;size
requestId1;file:///Users/dev/app.js;200;0\xA0s;0.0\xA0kB`;
    assert.strictEqual(response.result, expectedResult);
  });

  it('truncates long ?query or #fragment suffix', async () => {
    const querySuffix = 'a'.repeat(120);
    const request1 = createNetworkRequest({
      requestId: 'requestId1',
      url: `https://example.com/api/search?${querySuffix}`,
      documentURL: 'https://example.com/',
      statusCode: 200,
    });
    request1.setTransferSize(0);
    request1.setIssueTime(0, 0);
    request1.endTime = 0;

    networkLog.requests.returns([request1]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);

    const truncatedSuffix = 'a'.repeat(99);
    const expectedResult = `origin: https://example.com (omitted from same-origin /... URLs)
id;url;status;duration;size
requestId1;/api/search?${truncatedSuffix}...<truncated>;200;0\xA0s;0.0\xA0kB`;
    assert.strictEqual(response.result, expectedResult);
  });

  it('applies long path safety cap and omits query', async () => {
    const longPath = 'p'.repeat(310);
    const request1 = createNetworkRequest({
      requestId: 'requestId1',
      url: `https://3rdparty.com/${longPath}?cb=1`,
      documentURL: 'https://example.com/',
      statusCode: 200,
    });
    request1.setTransferSize(0);
    request1.setIssueTime(0, 0);
    request1.endTime = 0;

    networkLog.requests.returns([request1]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);

    const expectedPrefix = `https://3rdparty.com/${longPath}`.slice(0, 300);
    const expectedResult = `origin: https://example.com (omitted from same-origin /... URLs)
id;url;status;duration;size
requestId1;${expectedPrefix}...<truncated>;200;0\xA0s;0.0\xA0kB`;
    assert.strictEqual(response.result, expectedResult);
  });

  it('handles uppercase same-origin scheme and host', async () => {
    const request1 = createNetworkRequest({
      requestId: 'requestId1',
      url: 'HTTPS://EXAMPLE.COM/upper.js',
      documentURL: 'https://example.com/',
      statusCode: 200,
    });
    request1.setTransferSize(0);
    request1.setIssueTime(0, 0);
    request1.endTime = 0;

    networkLog.requests.returns([request1]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);

    const expectedResult = `origin: https://example.com (omitted from same-origin /... URLs)
id;url;status;duration;size
requestId1;/upper.js;200;0\xA0s;0.0\xA0kB`;
    assert.strictEqual(response.result, expectedResult);
  });

  it('handles short vs. long data: URLs', async () => {
    const request1 = createNetworkRequest({
      requestId: 'requestId1',
      url: 'data:text/plain,hello',
      documentURL: 'https://example.com/',
      statusCode: 200,
    });
    request1.setTransferSize(0);
    request1.setIssueTime(0, 0);
    request1.endTime = 0;

    const request2 = createNetworkRequest({
      requestId: 'requestId2',
      url: `data:image/png;base64,${'A'.repeat(100)}`,
      documentURL: 'https://example.com/',
      statusCode: 200,
    });
    request2.setTransferSize(0);
    request2.setIssueTime(0, 0);
    request2.endTime = 0;

    const request3 = createNetworkRequest({
      requestId: 'requestId3',
      url: `data:text/plain;charset=utf-8;${'x'.repeat(60)},payload`,
      documentURL: 'https://example.com/',
      statusCode: 200,
    });
    request3.setTransferSize(0);
    request3.setIssueTime(0, 0);
    request3.endTime = 0;

    networkLog.requests.returns([request1, request2, request3]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);

    const expectedResult = `origin: https://example.com (omitted from same-origin /... URLs)
id;url;status;duration;size
requestId1;data:text/plain,hello;200;0\xA0s;0.0\xA0kB
requestId2;data:image/png;base64,...<truncated>;200;0\xA0s;0.0\xA0kB
requestId3;data:text/plain;charset=utf-8;xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...<truncated>;200;0\xA0s;0.0\xA0kB`;
    assert.strictEqual(response.result, expectedResult);
  });

  it('sanitizes control characters in URL and ID', async () => {
    const request1 = createNetworkRequest({
      requestId: 'req\r\nuestId1',
      url: 'https://example.com/foo\r\nbar',
      documentURL: 'https://example.com/',
      statusCode: 200,
    });
    request1.setTransferSize(0);
    request1.setIssueTime(0, 0);
    request1.endTime = 0;

    networkLog.requests.returns([request1]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);

    const expectedResult = `origin: https://example.com (omitted from same-origin /... URLs)
id;url;status;duration;size
requestId1;/foobar;200;0\xA0s;0.0\xA0kB`;
    assert.strictEqual(response.result, expectedResult);
  });

  it('returns an error telling the model to ask the user to reload when no requests are recorded', async () => {
    networkLog.requests.returns([]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      conversationContext: null,
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsError(
        response,
        'No network requests have been recorded. DevTools only records requests made while DevTools is open and network recording is enabled (and the log has not been cleared). Ask the user to ensure network recording is enabled, reload the page or repeat the action that triggers the request, and try again.');
    assert.notProperty(response, 'widgets');
  });

  it('returns error for opaque origins', async () => {
    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState =>
          ({status: 'ESTABLISHED_ORIGIN', origin: SDK.SecurityOrigin.SecurityOrigin.create('null')}),
    };

    const response = await tool.handler({}, context);
    assertIsError(response, 'No origin available or not allowed.');
  });

  it('returns error when requests exist but none match established origin', async () => {
    const request = createNetworkRequest({
      requestId: 'requestId',
      url: 'https://cross-origin.com/api',
      documentURL: 'https://cross-origin.com/',
    });
    networkLog.requests.returns([request]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsError(response, 'No requests showing with origin https://example.com. Tell the user to start a new chat');
    assert.notProperty(response, 'widgets');
  });

  it('returns error if origin lock is uninitialized', async () => {
    const request = createNetworkRequest({
      requestId: 'requestId',
      url: 'https://example.com/api',
      documentURL: 'https://example.com/',
    });
    networkLog.requests.returns([request]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({status: 'UNINITIALIZED'}),
    };

    const response = await tool.handler({}, context);
    assertIsError(response, 'No origin established for this conversation.');
  });

  it('returns error when cross-origin navigation occurred during run', async () => {
    const request = createNetworkRequest({
      requestId: 'requestId',
      url: 'https://example.com/api',
      documentURL: 'https://example.com/',
    });
    networkLog.requests.returns([request]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({status: 'BLOCKED_BY_NAVIGATION'}),
    };

    const response = await tool.handler({}, context);
    assertIsError(response, 'Cross-origin access blocked due to navigation.');
  });
});
