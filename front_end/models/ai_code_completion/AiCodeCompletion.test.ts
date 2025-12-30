// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import {
  describeWithEnvironment,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';

import * as AiCodeCompletion from './ai_code_completion.js';

const DEFAULT_CURSOR_POSITION = 0;

function createCallbacks(editor: TextEditor.TextEditor.TextEditor): AiCodeCompletion.AiCodeCompletion.Callbacks {
  return {
    getSelectionHead: () => editor.editor.state.selection.main.head,
    getCompletionHint: () => editor.editor.plugin(TextEditor.Config.showCompletionHint)?.currentHint,
    setAiAutoCompletion: (args: {
      text: string,
      from: number,
      startTime: number,
      onImpression: (rpcGlobalId: Host.AidaClient.RpcGlobalId, latency: number, sampleId?: number) => void,
      clearCachedRequest: () => void,
      rpcGlobalId?: Host.AidaClient.RpcGlobalId,
      sampleId?: number,
    }|null) => editor.dispatch({effects: TextEditor.Config.setAiAutoCompleteSuggestion.of(args)}),
  };
}

describeWithEnvironment('AiCodeCompletion', () => {
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
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
        createCallbacks(sinon.createStubInstance(TextEditor.TextEditor.TextEditor)),
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
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
        createCallbacks(sinon.createStubInstance(TextEditor.TextEditor.TextEditor)),
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
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
        createCallbacks(sinon.createStubInstance(TextEditor.TextEditor.TextEditor)),
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
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
        createCallbacks(sinon.createStubInstance(TextEditor.TextEditor.TextEditor)),
    );

    await aiCodeCompletion.completeCode('prefix', 'suffix', DEFAULT_CURSOR_POSITION);
    await aiCodeCompletion.completeCode('prefix', 'suffixes', DEFAULT_CURSOR_POSITION);

    sinon.assert.calledTwice(mockAidaClient.completeCode);
  });
});
