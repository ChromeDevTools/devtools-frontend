// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {
  assertIsError,
  assertIsResult,
} from '../../../testing/AiAssistanceHelpers.js';
import * as Logs from '../../logs/logs.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('ListNetworkRequestsTool', () => {
  let networkLog: sinon.SinonStubbedInstance<Logs.NetworkLog.NetworkLog>;

  beforeEach(() => {
    networkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
  });

  it('lists network requests successfully', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        urlString`https://example.com/`,
        urlString`https://example.com/`,
        null,
        null,
        null,
    );
    request.statusCode = 200;
    request.setIssueTime(0, 0);
    request.setTransferSize(3000);
    request.endTime = 2;

    networkLog.requests.returns([request]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);

    const expectedResult = JSON.stringify([
      {
        id: 'requestId',
        url: 'https://example.com/',
        statusCode: 200,
        duration: '2\xA0s',
        transferSize: '3.0\xA0kB',
      },
    ]);
    assert.strictEqual(response.result, expectedResult);
  });

  it('filters out cross-origin requests', async () => {
    const request1 = SDK.NetworkRequest.NetworkRequest.create(
        'requestId1' as Protocol.Network.RequestId,
        urlString`https://example.com/`,
        urlString`https://example.com/`,
        null,
        null,
        null,
    );
    request1.statusCode = 200;
    request1.setIssueTime(0, 0);
    request1.endTime = 0;

    const request2 = SDK.NetworkRequest.NetworkRequest.create(
        'requestId2' as Protocol.Network.RequestId,
        urlString`https://another.com/`,
        urlString`https://another.com/`,
        null,
        null,
        null,
    );
    request2.statusCode = 200;

    networkLog.requests.returns([request1, request2]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);

    const expectedResult = JSON.stringify([
      {
        id: 'requestId1',
        url: 'https://example.com/',
        statusCode: 200,
        duration: '0\xA0s',
        transferSize: '0.0\xA0kB',
      },
    ]);
    assert.strictEqual(response.result, expectedResult);
  });

  it('returns empty array when no requests are recorded', async () => {
    networkLog.requests.returns([]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);
    assert.strictEqual(response.result, JSON.stringify([]));
    assert.deepEqual(response.widgets, [{
                       name: 'NETWORK_REQUESTS_LIST',
                       data: {
                         requests: [],
                       },
                     }]);
  });

  it('returns error for opaque origins', async () => {
    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => 'null',
    };

    const response = await tool.handler({}, context);
    assertIsError(response);
    assert.strictEqual(response.error, 'Opaque origin not allowed');
  });
});
