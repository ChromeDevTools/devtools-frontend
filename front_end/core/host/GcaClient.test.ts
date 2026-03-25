// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Host from './host.js';

describeWithEnvironment('GcaClient', () => {
  let gcaClient: Host.GcaClient.GcaClient;

  beforeEach(() => {
    gcaClient = new Host.GcaClient.GcaClient();
  });

  it('returns null for completeCode when request fails', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
        .callsFake((_request, callback) => {
          callback({statusCode: 500, error: 'Internal Server Error'});
        });

    const result = await gcaClient.completeCode(
        {client: 'test', prefix: 'test', metadata: {disable_user_content_logging: true, client_version: '1.2.3'}});

    assert.isNull(result);
  });

  it('returns null for generateCode when request fails', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
        .callsFake((_request, callback) => {
          callback({statusCode: 500, error: 'Internal Server Error'});
        });

    const result = await gcaClient.generateCode({
      client: 'test',
      preamble: 'test',
      current_message: {parts: [{text: 'test'}], role: Host.AidaClient.Role.USER},
      use_case: Host.AidaClient.UseCase.CODE_GENERATION,
      metadata: {disable_user_content_logging: true, client_version: '1.2.3'}
    });

    assert.isNull(result);
  });

  it('handles successful completeCode', async () => {
    const mockResponse = {
      candidates: [{
        index: 0,
        content: {role: 'model', parts: [{text: 'result'}]},
      }],
      responseId: '123'
    };
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
        .callsFake((_request, callback) => {
          callback({statusCode: 200, response: JSON.stringify(mockResponse)});
        });

    const result = await gcaClient.completeCode(
        {client: 'test', prefix: 'test', metadata: {disable_user_content_logging: true, client_version: '1.2.3'}});

    assert.isNotNull(result);
    assert.strictEqual(result?.generatedSamples[0].generationString, 'result');
    assert.strictEqual(result?.metadata.rpcGlobalId, '123');
  });

  it('handles successful generateCode', async () => {
    const mockResponse = {
      candidates: [{
        index: 0,
        content: {role: 'model', parts: [{text: 'generated code'}]},
      }],
      responseId: '456'
    };
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
        .callsFake((_request, callback) => {
          callback({statusCode: 200, response: JSON.stringify(mockResponse)});
        });

    const result = await gcaClient.generateCode({
      client: 'test',
      preamble: 'test',
      current_message: {parts: [{text: 'test'}], role: Host.AidaClient.Role.USER},
      use_case: Host.AidaClient.UseCase.CODE_GENERATION,
      metadata: {disable_user_content_logging: true, client_version: '1.2.3'}
    });

    assert.isNotNull(result);
    assert.strictEqual(result?.samples[0].generationString, 'generated code');
    assert.strictEqual(result?.metadata.rpcGlobalId, '456');
  });

  it('handles successful conversationRequest', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
        .callsFake((_request, callback) => {
          callback({statusCode: 200, response: '{}'});
        });

    await gcaClient.conversationRequest(
        {
          client: 'test',
          current_message: {parts: [{text: 'test'}], role: Host.AidaClient.Role.USER},
          metadata: {disable_user_content_logging: true, client_version: '1.2.3'}
        },
        1);
  });

  it('throws for conversationRequest when request fails', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
        .callsFake((_request, callback) => {
          callback({statusCode: 500, error: 'Internal Server Error'});
        });

    try {
      await gcaClient.conversationRequest(
          {
            client: 'test',
            current_message: {parts: [{text: 'test'}], role: Host.AidaClient.Role.USER},
            metadata: {disable_user_content_logging: true, client_version: '1.2.3'}
          },
          1);
      assert.fail('Should have thrown');
    } catch (err) {
      assert.instanceOf(err, Error);
    }
  });

  it('handles successful registerClientEvent', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
        .callsFake((_request, callback) => {
          callback({statusCode: 200, response: '{}'});
        });

    const result = await gcaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: '123',
      disable_user_content_logging: true,
    });

    assert.deepEqual(result, {});
  });

  it('returns error for registerClientEvent when request fails', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
        .callsFake((_request, callback) => {
          callback({statusCode: 500, error: 'Internal Server Error'});
        });

    const result = await gcaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: '123',
      disable_user_content_logging: true,
    });

    assert.property(result, 'error');
  });
});
