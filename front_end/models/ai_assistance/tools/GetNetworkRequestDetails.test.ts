// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {
  assertIsError,
  assertIsResult,
} from '../../../testing/AiAssistanceHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Logs from '../../logs/logs.js';
import * as TextUtils from '../../text_utils/text_utils.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('GetNetworkRequestDetailsTool', () => {
  let networkLog: Logs.NetworkLog.NetworkLog;

  beforeEach(() => {
    networkLog = Logs.NetworkLog.NetworkLog.instance();
  });

  it('retrieves details successfully', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        urlString`https://example.com/api/users`,
        urlString`https://example.com/`,
        null,
        null,
        null,
    );
    request.responseHeaders = [{name: 'Content-Type', value: 'application/json'}];
    request.setRequestHeaders([{name: 'Accept', value: 'application/json'}]);
    request.statusCode = 200;
    request.requestContentData = () => {
      return Promise.resolve(new TextUtils.ContentData.ContentData('{}', false, 'application/json', 'utf-8'));
    };

    sinon.stub(networkLog, 'requests').returns([request]);

    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool();
    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({id: 'requestId'}, context);
    assertIsResult(response);
    assert.exists(response.widgets);
    assert.strictEqual(response.widgets![0].name, 'NETWORK_REQUEST_GENERAL_HEADERS');

    assert.include(response.result as string, 'Request: https://example.com/api/users');
    assert.include(response.result as string, 'Response status: 200');
  });

  it('returns error if request is not found', async () => {
    sinon.stub(networkLog, 'requests').returns([]);

    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool();
    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({id: 'requestId'}, context);
    assertIsError(response);
    assert.strictEqual(response.error, 'No request found');
  });

  it('returns error if request origin does not match established origin', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        urlString`https://another.com/api/users`,
        urlString`https://another.com/`,
        null,
        null,
        null,
    );

    sinon.stub(networkLog, 'requests').returns([request]);

    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool();
    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({id: 'requestId'}, context);
    assertIsError(response);
    assert.strictEqual(response.error, 'No request found');
  });

  it('returns error for opaque origins', async () => {
    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool();
    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'null',
    };

    const response = await tool.handler({id: 'requestId'}, context);
    assertIsError(response);
    assert.strictEqual(response.error, 'Opaque origin not allowed');
  });
});
