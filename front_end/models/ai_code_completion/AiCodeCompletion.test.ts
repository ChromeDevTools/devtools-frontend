// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {
  describeWithEnvironment,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';

import * as AiCodeCompletion from './AiCodeCompletion.js';

describeWithEnvironment('AiCodeCompletion', () => {
  let throttler: Common.Throttler.Throttler;
  beforeEach(() => {
    updateHostConfig({
      devToolsAiCodeCompletion: {
        enabled: true,
        temperature: 0.5,
        modelId: 'test-model',
        userTier: 'BETA',
      },
    });
    throttler = new Common.Throttler.Throttler(0);
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
        throttler,
    );

    aiCodeCompletion.onTextChanged('prefix', 'suffix');

    await throttler.processCompleted;
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    const request = mockAidaClient.completeCode.firstCall.args[0];
    assert.strictEqual(request.client, 'CHROME_DEVTOOLS');
    assert.strictEqual(request.prefix, 'prefix');
    assert.strictEqual(request.suffix, 'suffix');
    assert.deepEqual(request.options, {
      temperature: 0.5,
      model_id: 'test-model',
      inference_language: Host.AidaClient.AidaInferenceLanguage.JAVASCRIPT,
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
        throttler,
    );

    aiCodeCompletion.onTextChanged('prefix', '\n');

    await throttler.processCompleted;
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    sinon.assert.calledOnce(editor.dispatch);
    assert.deepEqual(
        editor.dispatch.firstCall.args[0], {effects: TextEditor.Config.setAiAutoCompleteSuggestion.of('suggestion')});
  });

  it('throttles requests to AIDA', async () => {
    const throttlerScheduleSpy = sinon.spy(throttler, 'schedule');
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve(null),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        sinon.createStubInstance(TextEditor.TextEditor.TextEditor),
        throttler,
    );

    aiCodeCompletion.onTextChanged('p', '');
    sinon.assert.calledOnce(throttlerScheduleSpy);
    aiCodeCompletion.onTextChanged('pr', '');
    sinon.assert.calledTwice(throttlerScheduleSpy);
    aiCodeCompletion.onTextChanged('pre', '');
    sinon.assert.calledThrice(throttlerScheduleSpy);

    await throttler.processCompleted;
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    assert.strictEqual(mockAidaClient.completeCode.firstCall.args[0].prefix, 'pre');
  });
});
