// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';

import * as AiCodeCompletion from './ai_code_completion.js';

const DEFAULT_CURSOR_POSITION = 0;

function createCallbacks(): AiCodeCompletion.AiCodeCompletion.Callbacks {
  return {
    getSelectionHead: () => 0,
    getCompletionHint: () => null,
    setAiAutoCompletion: () => {},
  };
}

describe('AiCodeCompletion', () => {
  setupLocaleHooks();
  setupRuntimeHooks();

  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    updateHostConfig({
      devToolsAiCodeCompletion: {
        enabled: true,
        temperature: 0.5,
        modelId: 'test-model',
        userTier: 'BETA',
      },
    });
  });

  afterEach(() => {
    clock.restore();
  });

  it('builds a request and calls the AIDA client on text changed', async () => {
    const completeCodeResponse = {
      generatedSamples: [{
        generationString: 'suggestion',
        sampleId: 1,
        score: 1,
        attributionMetadata: {
          attributionAction: Host.AidaClient.RecitationAction.CITE,
          citations: [{uri: 'https://example.com'}],
        },
      }],
      metadata: {rpcGlobalId: 1},
    };
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve(completeCodeResponse),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        createCallbacks(),
        ['\n'],
    );

    const actualResponse = await aiCodeCompletion.completeCode('prefix', 'suffix', 6);

    sinon.assert.calledOnce(mockAidaClient.completeCode);
    const request = mockAidaClient.completeCode.firstCall.args[0];
    assert.strictEqual(request.client, 'CHROME_DEVTOOLS');
    assert.strictEqual(request.prefix, '\nprefix');
    assert.strictEqual(request.suffix, 'suffix');
    assert.deepEqual(request.options, {
      temperature: 0.5,
      model_id: 'test-model',
      inference_language: Host.AidaClient.AidaInferenceLanguage.JAVASCRIPT,
      stop_sequences: ['\n'],
    });
    assert.isFalse(actualResponse.fromCache);
    assert.deepEqual(actualResponse.response, completeCodeResponse);
  });

  it('caches suggestions from AIDA', async () => {
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve({
        generatedSamples: [{
          generationString: 'suggestion',
          sampleId: 1,
          score: 1,
        }],
        metadata: {
          rpcGlobalId: 1,
        },
      }),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        createCallbacks(),
    );

    await aiCodeCompletion.completeCode('prefix', 'suffix', DEFAULT_CURSOR_POSITION);
    await aiCodeCompletion.completeCode('prefix', 'suffix', DEFAULT_CURSOR_POSITION);

    sinon.assert.calledOnce(mockAidaClient.completeCode);
  });

  it('does not use cache for different requests', async () => {
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve({
        generatedSamples: [{
          generationString: 'suggestion',
          sampleId: 1,
          score: 1,
        }],
        metadata: {},
      }),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        createCallbacks(),
    );

    await aiCodeCompletion.completeCode('prefix', 'suffix', DEFAULT_CURSOR_POSITION);
    await aiCodeCompletion.completeCode('prefix re', 'suffix', DEFAULT_CURSOR_POSITION);

    sinon.assert.calledTwice(mockAidaClient.completeCode);
  });

  it('does not use cache for different suffix', async () => {
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve({
        generatedSamples: [{
          generationString: 'suggestion',
          sampleId: 1,
          score: 1,
        }],
        metadata: {},
      }),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        createCallbacks(),
    );

    await aiCodeCompletion.completeCode('prefix', 'suffix', DEFAULT_CURSOR_POSITION);
    await aiCodeCompletion.completeCode('prefix', 'suffixes', DEFAULT_CURSOR_POSITION);

    sinon.assert.calledTwice(mockAidaClient.completeCode);
  });

  it('does not call AIDA if combined length is less than 5', async () => {
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient);
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient, serverSideLoggingEnabled: false},
        createCallbacks(),
    );

    const response = await aiCodeCompletion.completeCode('ab', 'cd', DEFAULT_CURSOR_POSITION);

    sinon.assert.notCalled(mockAidaClient.completeCode);
    assert.deepEqual(response, {response: null, fromCache: false});
  });

  it('delays subsequent requests after an empty response if change is small', async () => {
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient);
    mockAidaClient.completeCode.onFirstCall().resolves({generatedSamples: [], metadata: {}});
    const nonEmptyResponse = {
      generatedSamples: [{
        generationString: 'suggestion',
        sampleId: 1,
        score: 1,
      }],
      metadata: {},
    };
    mockAidaClient.completeCode.onSecondCall().resolves(nonEmptyResponse);

    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient, serverSideLoggingEnabled: false},
        createCallbacks(),
    );

    await aiCodeCompletion.completeCode('prefix', 'suffix', DEFAULT_CURSOR_POSITION);
    sinon.assert.calledOnce(mockAidaClient.completeCode);

    let response = await aiCodeCompletion.completeCode('prefix1', 'suffix', DEFAULT_CURSOR_POSITION);
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    assert.deepEqual(response, {response: null, fromCache: false});

    response = await aiCodeCompletion.completeCode('prefix123', 'suffix', DEFAULT_CURSOR_POSITION);
    sinon.assert.calledTwice(mockAidaClient.completeCode);
    assert.deepEqual(response, {response: nonEmptyResponse, fromCache: false});
  });
});
