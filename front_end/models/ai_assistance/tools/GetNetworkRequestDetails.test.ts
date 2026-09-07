// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import type * as Protocol from '../../../generated/protocol.js';
import {
  assertIsError,
  assertIsResult,
} from '../../../testing/AiAssistanceHelpers.js';
import {deinitializeGlobalVars} from '../../../testing/EnvironmentHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import type * as Logs from '../../logs/logs.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

interface CreateNetworkRequestOptions {
  url: string;
  documentURL?: string;
  requestId?: string;
  statusCode?: number;
  responseHeaders?: Array<{name: string, value: string}>;
  requestHeaders?: Array<{name: string, value: string}>;
  contentData?: TextUtils.ContentData.ContentData;
  isImportedHar?: boolean;
}

function createNetworkRequest(options: CreateNetworkRequestOptions): SDK.NetworkRequest.NetworkRequest {
  const request = SDK.NetworkRequest.NetworkRequest.create(
      (options.requestId ?? 'requestId') as Protocol.Network.RequestId,
      urlString`${options.url}`,
      urlString`${options.documentURL ?? options.url}`,
      null,
      null,
      null,
  );
  if (options.statusCode !== undefined) {
    request.statusCode = options.statusCode;
  }
  if (options.responseHeaders) {
    request.responseHeaders = options.responseHeaders;
  }
  if (options.requestHeaders) {
    request.setRequestHeaders(options.requestHeaders);
  }
  if (options.contentData) {
    const contentData = options.contentData;
    request.requestContentData = () => Promise.resolve(contentData);
  }
  if (options.isImportedHar) {
    request.setIsImportedHar(true);
  }
  return request;
}

describe('GetNetworkRequestDetailsTool', () => {
  let universe: TestUniverse;
  let networkLog: Logs.NetworkLog.NetworkLog;

  beforeEach(() => {
    universe = new TestUniverse();
    networkLog = universe.networkLog;
  });

  after(async () => {
    await deinitializeGlobalVars();
  });

  it('returns displayInfoFromArgs correctly', () => {
    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool(networkLog);
    const displayInfo = tool.displayInfoFromArgs({id: 'req123'});

    assert.strictEqual(displayInfo.title, 'Getting network request details');
    assert.strictEqual(displayInfo.action, 'getNetworkRequestDetails(req123)');
  });

  it('retrieves details successfully', async () => {
    const request = createNetworkRequest({
      url: 'https://example.com/api/users',
      documentURL: 'https://example.com/',
      statusCode: 200,
      responseHeaders: [{name: 'Content-Type', value: 'application/json'}],
      requestHeaders: [{name: 'Accept', value: 'application/json'}],
      contentData: new TextUtils.ContentData.ContentData('{}', false, 'application/json', 'utf-8'),
    });

    sinon.stub(networkLog, 'requests').returns([request]);

    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool(networkLog);
    const context = {
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

    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({id: 'requestId'}, context);
    assertIsError(response);
    assert.strictEqual(response.error, 'No request found');
  });

  it('returns error if request origin does not match established origin', async () => {
    const request = createNetworkRequest({
      url: 'https://another.com/api/users',
      documentURL: 'https://another.com/',
    });

    sinon.stub(networkLog, 'requests').returns([request]);

    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({id: 'requestId'}, context);
    assertIsError(response);
    assert.strictEqual(response.error, 'No request found');
  });

  it('returns error for opaque origins', async () => {
    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => 'null',
    };

    const response = await tool.handler({id: 'requestId'}, context);
    assertIsError(response);
    assert.strictEqual(response.error, 'Opaque origin not allowed');
  });

  it('redacts cross-origin response body and non-safelisted headers for opaque cross-origin requests', async () => {
    const request = createNetworkRequest({
      url: 'https://victim.com/sensitive-data',
      documentURL: 'https://attacker.com/index.html',
      statusCode: 200,
      responseHeaders: [
        {name: 'Content-Type', value: 'application/json'},
        {name: 'Location', value: '/secret-redirect'},
        {name: 'WWW-Authenticate', value: 'Bearer realm="secret"'},
      ],
      requestHeaders: [{name: 'Accept', value: 'application/json'}],
      contentData: new TextUtils.ContentData.ContentData('{"sensitive":"secret"}', false, 'application/json', 'utf-8'),
    });

    sinon.stub(networkLog, 'requests').returns([request]);

    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => 'https://attacker.com',
    };

    const response = await tool.handler({id: 'requestId'}, context);
    assertIsResult(response);
    assert.exists(response.widgets);

    const result = response.result as string;
    assert.include(result, 'Request: https://victim.com/sensitive-data');
    assert.include(result, 'Content-Type: application/json');
    assert.include(result, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
    assert.notInclude(result, '{"sensitive":"secret"}');
    assert.notInclude(result, 'Location');
    assert.notInclude(result, 'secret-redirect');
    assert.notInclude(result, 'WWW-Authenticate');
  });

  it('includes response body and exposed headers for CORS_ALLOWED cross-origin requests', async () => {
    const request = createNetworkRequest({
      url: 'https://victim.com/api/data',
      documentURL: 'https://attacker.com/index.html',
      statusCode: 200,
      responseHeaders: [
        {name: 'Content-Type', value: 'application/json'},
        {name: 'Access-Control-Allow-Origin', value: 'https://attacker.com'},
        {name: 'Access-Control-Expose-Headers', value: 'Location'},
        {name: 'Location', value: '/allowed-redirect'},
      ],
      requestHeaders: [{name: 'Accept', value: 'application/json'}],
      contentData: new TextUtils.ContentData.ContentData('{"user":"alice"}', false, 'application/json', 'utf-8'),
    });

    sinon.stub(networkLog, 'requests').returns([request]);

    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => 'https://attacker.com',
    };

    const response = await tool.handler({id: 'requestId'}, context);
    assertIsResult(response);

    const result = response.result as string;
    assert.include(result, '{"user":"alice"}');
    assert.include(result, 'Location: /allowed-redirect');
    assert.notInclude(result, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
  });

  it('allows inspecting same-origin requests in an imported HAR session', async () => {
    const request = createNetworkRequest({
      requestId: 'harRequestId',
      url: 'https://example.com/api/users',
      documentURL: 'https://example.com/index.html',
      statusCode: 200,
      responseHeaders: [{name: 'Content-Type', value: 'application/json'}],
      contentData: new TextUtils.ContentData.ContentData('{"har":"data"}', false, 'application/json', 'utf-8'),
      isImportedHar: true,
    });

    sinon.stub(networkLog, 'requests').returns([request]);

    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => 'imported-har://example.com',
    };

    const response = await tool.handler({id: 'harRequestId'}, context);
    assertIsResult(response);

    const result = response.result as string;
    assert.include(result, '{"har":"data"}');
    assert.notInclude(result, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
  });

  it('redacts cross-origin requests in an imported HAR session without CORS', async () => {
    const request = createNetworkRequest({
      requestId: 'harRequestId',
      url: 'https://third-party.com/api/data',
      documentURL: 'https://example.com/index.html',
      statusCode: 200,
      responseHeaders: [{name: 'Content-Type', value: 'application/json'}],
      contentData: new TextUtils.ContentData.ContentData('{"secret":"har-leak"}', false, 'application/json', 'utf-8'),
      isImportedHar: true,
    });

    sinon.stub(networkLog, 'requests').returns([request]);

    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => 'imported-har://example.com',
    };

    const response = await tool.handler({id: 'harRequestId'}, context);
    assertIsResult(response);

    const result = response.result as string;
    assert.include(result, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
    assert.notInclude(result, '{"secret":"har-leak"}');
  });

  it('redacts response body when request documentURL is empty', async () => {
    const request = createNetworkRequest({
      url: 'https://example.com/api/data',
      documentURL: '',
      statusCode: 200,
      responseHeaders: [{name: 'Content-Type', value: 'application/json'}],
      contentData: new TextUtils.ContentData.ContentData('{"data":"ok"}', false, 'application/json', 'utf-8'),
    });

    sinon.stub(networkLog, 'requests').returns([request]);

    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => undefined,
    };

    const response = await tool.handler({id: 'requestId'}, context);
    assertIsResult(response);

    const result = response.result as string;
    assert.include(result, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
    assert.notInclude(result, '{"data":"ok"}');
  });

  it('rejects inspecting imported HAR requests from a live web session origin', async () => {
    const request = createNetworkRequest({
      requestId: 'harRequestId',
      url: 'https://example.com/api/users',
      documentURL: 'https://example.com/index.html',
      isImportedHar: true,
    });
    sinon.stub(networkLog, 'requests').returns([request]);

    const tool = new AiAssistance.GetNetworkRequestDetails.GetNetworkRequestDetailsTool(networkLog);
    const context = {
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({id: 'harRequestId'}, context);
    assertIsError(response);
    assert.strictEqual(response.error, 'No request found');
  });
});
