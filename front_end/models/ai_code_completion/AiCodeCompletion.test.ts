// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import {
  describeWithEnvironment,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';

import * as AiCodeCompletion from './AiCodeCompletion.js';

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
    sinon.restore();
  });

  it('builds a request and calls the AIDA client on text changed', async () => {
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve(null),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        sinon.createStubInstance(TextEditor.TextEditor.TextEditor),
    );

    aiCodeCompletion.onTextChanged('prefix', 'suffix', 6);

    await clock.tickAsync(AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    const request = mockAidaClient.completeCode.firstCall.args[0];
    assert.strictEqual(request.client, 'CHROME_DEVTOOLS');
    assert.strictEqual(request.prefix, 'prefix');
    assert.strictEqual(request.suffix, 'suffix');
    assert.deepEqual(request.options, {
      temperature: 0.5,
      model_id: 'test-model',
      inference_language: Host.AidaClient.AidaInferenceLanguage.JAVASCRIPT,
      stop_sequences: ['\n'],
    });
  });

  it('dispatches a suggestion to the editor when AIDA returns one', async () => {
    const editor = sinon.createStubInstance(TextEditor.TextEditor.TextEditor);
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
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        editor,
    );

    aiCodeCompletion.onTextChanged('prefix', '\n', 1);

    await clock.tickAsync(AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    await clock.tickAsync(AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
    sinon.assert.calledOnce(editor.dispatch);
    assert.deepEqual(editor.dispatch.firstCall.args[0], {
      effects: TextEditor.Config.setAiAutoCompleteSuggestion.of(
          {text: 'suggestion', from: 1, sampleId: 1, rpcGlobalId: undefined})
    });
  });

  it('throttles requests to AIDA', async () => {
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve(null),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        sinon.createStubInstance(TextEditor.TextEditor.TextEditor),
    );

    aiCodeCompletion.onTextChanged('p', '', 1);
    aiCodeCompletion.onTextChanged('pr', '', 2);
    aiCodeCompletion.onTextChanged('pre', '', 3);

    await clock.tickAsync(AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    assert.strictEqual(mockAidaClient.completeCode.firstCall.args[0].prefix, 'pre');
  });

  it('does not dispatch suggestion or citation if recitation action is BLOCK', async () => {
    const editor = sinon.createStubInstance(TextEditor.TextEditor.TextEditor);
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve({
        generatedSamples: [{
          generationString: 'suggestion',
          sampleId: 1,
          score: 1,
          attributionMetadata: {
            attributionAction: Host.AidaClient.RecitationAction.BLOCK,
            citations: [{uri: 'https://www.example.com'}],
          }
        }],
        metadata: {},
      }),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        editor,
    );
    const dispatchSpy = sinon.spy(aiCodeCompletion, 'dispatchEventToListeners');

    aiCodeCompletion.onTextChanged('prefix', '\n', 1);

    await clock.tickAsync(AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    await clock.tickAsync(AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
    sinon.assert.notCalled(editor.dispatch);
    sinon.assert.calledWith(dispatchSpy, sinon.match(AiCodeCompletion.Events.RESPONSE_RECEIVED), sinon.match({}));
  });

  it('dispatches response received event with citations', async () => {
    const editor = sinon.createStubInstance(TextEditor.TextEditor.TextEditor);
    const citations = [{uri: 'https://example.com'}];
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve({
        generatedSamples: [{
          generationString: 'suggestion',
          sampleId: 1,
          score: 1,
          attributionMetadata: {
            attributionAction: Host.AidaClient.RecitationAction.CITE,
            citations,
          },
        }],
        metadata: {},
      }),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        editor,
    );
    const dispatchSpy = sinon.spy(aiCodeCompletion, 'dispatchEventToListeners');

    aiCodeCompletion.onTextChanged('prefix', '\n', 1);

    await clock.tickAsync(AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
    await clock.tickAsync(AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);

    sinon.assert.calledWith(
        dispatchSpy, sinon.match(AiCodeCompletion.Events.RESPONSE_RECEIVED), sinon.match({citations}));
  });
});
