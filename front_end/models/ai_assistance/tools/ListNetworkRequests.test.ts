// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
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

  it('lists network requests successfully', async () => {
    const request = createNetworkRequest({
      requestId: 'requestId',
      url: 'https://example.com/',
      documentURL: 'https://example.com/',
      statusCode: 200,
    });
    request.setTransferSize(3000);
    request.setIssueTime(0, 0);
    request.endTime = 2;

    networkLog.requests.returns([request]);

    const tool = new AiAssistance.ListNetworkRequests.ListNetworkRequestsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
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
    const request1 = createNetworkRequest({
      requestId: 'requestId1',
      url: 'https://example.com/',
      documentURL: 'https://example.com/',
      statusCode: 200,
    });
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
      getEstablishedOrigin: () => SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
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
      getEstablishedOrigin: () => SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
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
      getEstablishedOrigin: () => SDK.SecurityOrigin.SecurityOrigin.create('null'),
    };

    const response = await tool.handler({}, context);
    assertIsError(response);
    assert.strictEqual(response.error, 'Opaque origin not allowed');
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
      getEstablishedOrigin: () => SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
    };

    const response = await tool.handler({}, context);
    assertIsError(response);
    assert.strictEqual(response.error,
                       'No requests showing with origin https://example.com. Tell the user to start a new chat');
  });
});
