// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import {
  describeWithEnvironment,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';

import * as AiCodeGeneration from './ai_code_generation.js';

describeWithEnvironment('AiCodeGeneration', () => {
  beforeEach(() => {
    updateHostConfig({
      devToolsAiCodeGeneration: {
        enabled: true,
        temperature: 0.5,
        modelId: 'test-model',
        userTier: 'BETA',
      },
    });
  });

  it('builds a request and calls the AIDA client', async () => {
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      generateCode: Promise.resolve(null),
    });
    const aiCodeGeneration = new AiCodeGeneration.AiCodeGeneration.AiCodeGeneration(
        {aidaClient: mockAidaClient},
    );

    await aiCodeGeneration.generateCode('prompt', 'preamble');

    sinon.assert.calledOnce(mockAidaClient.generateCode);
    const request = mockAidaClient.generateCode.firstCall.args[0];
    assert.strictEqual(request.client, 'CHROME_DEVTOOLS');
    assert.strictEqual(request.preamble, 'preamble');
    assert.deepEqual(request.current_message, {
      parts: [{
        text: 'prompt',
      }],
      role: Host.AidaClient.Role.USER,
    });
    assert.strictEqual(request.use_case, Host.AidaClient.UseCase.CODE_GENERATION);
    assert.deepEqual(request.options, {
      temperature: 0.5,
      model_id: 'test-model',
      inference_language: Host.AidaClient.AidaInferenceLanguage.JAVASCRIPT,
    });
    assert.isTrue(request.metadata.disable_user_content_logging);
    assert.strictEqual(request.metadata.user_tier, Host.AidaClient.UserTier.BETA);
  });

  it('returns the response from the AIDA client', async () => {
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      generateCode: Promise.resolve({
        samples: [{
          generationString: 'suggestion',
          sampleId: 1,
          score: 1,
        }],
        metadata: {rpcGlobalId: 1},
      }),
    });
    const aiCodeGeneration = new AiCodeGeneration.AiCodeGeneration.AiCodeGeneration(
        {aidaClient: mockAidaClient},
    );

    const response = await aiCodeGeneration.generateCode('prompt', 'preamble');

    assert.deepEqual(response, {
      samples: [{
        generationString: 'suggestion',
        sampleId: 1,
        score: 1,
      }],
      metadata: {rpcGlobalId: 1},
    });
  });
});
