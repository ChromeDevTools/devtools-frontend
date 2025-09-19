// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import {
  describeWithEnvironment,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';

import * as AiCodeCompletion from './ai_code_completion.js';

const DEFAULT_CURSOR_POSITION = 0;

function makeState(doc: string, extensions: CodeMirror.Extension = []) {
  return CodeMirror.EditorState.create({
    doc,
    extensions: [
      extensions,
      TextEditor.Config.baseConfiguration(doc),
      TextEditor.Config.autocompletion.instance(),
    ],
    selection: CodeMirror.EditorSelection.cursor(DEFAULT_CURSOR_POSITION),
  });
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
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve(null),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        sinon.createStubInstance(TextEditor.TextEditor.TextEditor),
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
        ['\n'],
    );

    aiCodeCompletion.onTextChanged('prefix', 'suffix', 6);

    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
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
  });

  it('dispatches a suggestion to the editor when AIDA returns one', async () => {
    const editor = new TextEditor.TextEditor.TextEditor(makeState('', TextEditor.Config.aiAutoCompleteSuggestion));
    const dispatchSpy = sinon.spy(editor, 'dispatch');
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve({
        generatedSamples: [{
          generationString: 'suggestion',
          sampleId: 1,
          score: 1,
        }],
        metadata: {rpcGlobalId: 1},
      }),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        editor,
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
    );

    aiCodeCompletion.onTextChanged('prefix', '\n', DEFAULT_CURSOR_POSITION);

    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
    const suggestion = editor.editor.state.field(TextEditor.Config.aiAutoCompleteSuggestionState);
    assert.strictEqual(suggestion?.text, 'suggestion');
    assert.strictEqual(suggestion?.from, DEFAULT_CURSOR_POSITION);
    assert.strictEqual(suggestion?.sampleId, 1);
    assert.strictEqual(suggestion?.rpcGlobalId, 1);
    sinon.assert.calledOnce(dispatchSpy);
  });

  it('trims a suggestion with suffix overlap and dispatches it to the editor', async () => {
    const editor = new TextEditor.TextEditor.TextEditor(makeState('', TextEditor.Config.aiAutoCompleteSuggestion));
    const dispatchSpy = sinon.spy(editor, 'dispatch');
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve({
        generatedSamples: [{
          generationString: 'Hello World");',
          sampleId: 1,
          score: 1,
        }],
        metadata: {rpcGlobalId: 1},
      }),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        editor,
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
    );

    aiCodeCompletion.onTextChanged('console.log("', '");\n', DEFAULT_CURSOR_POSITION);

    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
    const suggestion = editor.editor.state.field(TextEditor.Config.aiAutoCompleteSuggestionState);
    assert.strictEqual(suggestion?.text, 'Hello World');
    assert.strictEqual(suggestion?.from, DEFAULT_CURSOR_POSITION);
    assert.strictEqual(suggestion?.sampleId, 1);
    assert.strictEqual(suggestion?.rpcGlobalId, 1);
    sinon.assert.calledOnce(dispatchSpy);
  });

  it('debounces requests to AIDA', async () => {
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve(null),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        sinon.createStubInstance(TextEditor.TextEditor.TextEditor),
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
    );

    aiCodeCompletion.onTextChanged('p', '', 1);
    aiCodeCompletion.onTextChanged('pr', '', 2);
    aiCodeCompletion.onTextChanged('pre', '', 3);

    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    assert.strictEqual(mockAidaClient.completeCode.firstCall.args[0].prefix, '\npre');
  });

  it('does not dispatch suggestion or citation if recitation action is BLOCK', async () => {
    const editor = new TextEditor.TextEditor.TextEditor(makeState('', TextEditor.Config.aiAutoCompleteSuggestion));
    const dispatchSpy = sinon.spy(editor, 'dispatch');
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
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        editor,
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
    );
    const dispatchEventSpy = sinon.spy(aiCodeCompletion, 'dispatchEventToListeners');

    aiCodeCompletion.onTextChanged('prefix', '\n', DEFAULT_CURSOR_POSITION);

    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
    sinon.assert.notCalled(dispatchSpy);
    sinon.assert.calledWith(
        dispatchEventSpy, sinon.match(AiCodeCompletion.AiCodeCompletion.Events.RESPONSE_RECEIVED), sinon.match({}));
  });

  it('does not dispatch if cursor position changes', async () => {
    const editor =
        new TextEditor.TextEditor.TextEditor(makeState('prefix', TextEditor.Config.aiAutoCompleteSuggestion));
    const dispatchSpy = sinon.spy(editor, 'dispatch');
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
        editor,
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
    );
    const dispatchEventSpy = sinon.spy(aiCodeCompletion, 'dispatchEventToListeners');

    aiCodeCompletion.onTextChanged('prefix', '\n', DEFAULT_CURSOR_POSITION);

    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
    sinon.assert.calledOnce(mockAidaClient.completeCode);
    editor.editor.dispatch({
      selection: CodeMirror.EditorSelection.cursor(1),
    });
    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
    sinon.assert.notCalled(dispatchSpy);
    sinon.assert.calledWith(
        dispatchEventSpy, sinon.match(AiCodeCompletion.AiCodeCompletion.Events.RESPONSE_RECEIVED), sinon.match({}));
  });

  it('dispatches response received event with citations', async () => {
    const editor = new TextEditor.TextEditor.TextEditor(makeState('', TextEditor.Config.aiAutoCompleteSuggestion));
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
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        editor,
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
    );
    const dispatchSpy = sinon.spy(aiCodeCompletion, 'dispatchEventToListeners');

    aiCodeCompletion.onTextChanged('prefix', '\n', DEFAULT_CURSOR_POSITION);

    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);

    assert.deepEqual(dispatchSpy.secondCall.args[0], AiCodeCompletion.AiCodeCompletion.Events.RESPONSE_RECEIVED);
    assert.deepEqual(dispatchSpy.secondCall.args[1], {citations});
  });

  it('caches suggestions from AIDA', async () => {
    const editor = new TextEditor.TextEditor.TextEditor(makeState('', TextEditor.Config.aiAutoCompleteSuggestion));
    const dispatchSpy = sinon.spy(editor, 'dispatch');
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
        editor,
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
    );

    aiCodeCompletion.onTextChanged('prefix', 'suffix', DEFAULT_CURSOR_POSITION);
    await clock.tickAsync(
        AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
        AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
    let suggestion = editor.editor.state.field(TextEditor.Config.aiAutoCompleteSuggestionState);
    assert.strictEqual(suggestion?.text, 'suggestion');
    assert.strictEqual(suggestion?.from, DEFAULT_CURSOR_POSITION);
    assert.strictEqual(suggestion?.sampleId, 1);
    assert.strictEqual(suggestion?.rpcGlobalId, 1);

    aiCodeCompletion.onTextChanged('prefix', 'suffix', DEFAULT_CURSOR_POSITION);
    await clock.tickAsync(
        AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
        AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);

    sinon.assert.calledOnce(mockAidaClient.completeCode);
    suggestion = editor.editor.state.field(TextEditor.Config.aiAutoCompleteSuggestionState);
    assert.strictEqual(suggestion?.text, 'suggestion');
    assert.strictEqual(suggestion?.from, DEFAULT_CURSOR_POSITION);
    assert.strictEqual(suggestion?.sampleId, 1);
    assert.strictEqual(suggestion?.rpcGlobalId, 1);
    sinon.assert.calledTwice(dispatchSpy);
  });

  it('caches suggestions from AIDA and returns only valid generated samples from cache', async () => {
    const editor = new TextEditor.TextEditor.TextEditor(makeState('', TextEditor.Config.aiAutoCompleteSuggestion));
    const dispatchSpy = sinon.spy(editor, 'dispatch');
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve({
        generatedSamples: [
          {
            generationString: 'suggestion',
            sampleId: 1,
            score: 1,
          },
          {
            generationString: 'recommendation',
            sampleId: 2,
            score: 0.5,
          }
        ],
        metadata: {},
      }),
    });
    const aiCodeCompletion = new AiCodeCompletion.AiCodeCompletion.AiCodeCompletion(
        {aidaClient: mockAidaClient},
        editor,
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
    );

    aiCodeCompletion.onTextChanged('prefix ', 'suffix', DEFAULT_CURSOR_POSITION);
    await clock.tickAsync(
        AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
        AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);

    let suggestion = editor.editor.state.field(TextEditor.Config.aiAutoCompleteSuggestionState);
    assert.strictEqual(suggestion?.text, 'suggestion');
    assert.strictEqual(suggestion?.from, DEFAULT_CURSOR_POSITION);
    assert.strictEqual(suggestion?.sampleId, 1);

    aiCodeCompletion.onTextChanged('prefix re', 'suffix', DEFAULT_CURSOR_POSITION);
    await clock.tickAsync(
        AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
        AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);

    sinon.assert.calledOnce(mockAidaClient.completeCode);
    suggestion = editor.editor.state.field(TextEditor.Config.aiAutoCompleteSuggestionState);
    assert.strictEqual(suggestion?.text, 'commendation');
    assert.strictEqual(suggestion?.from, DEFAULT_CURSOR_POSITION);
    assert.strictEqual(suggestion?.sampleId, 2);
    sinon.assert.calledTwice(dispatchSpy);
  });

  it('does not use cache for different requests', async () => {
    const editor = new TextEditor.TextEditor.TextEditor(makeState('', TextEditor.Config.aiAutoCompleteSuggestion));
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
        editor,
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
    );

    aiCodeCompletion.onTextChanged('prefix', 'suffix', DEFAULT_CURSOR_POSITION);
    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);

    aiCodeCompletion.onTextChanged('prefix re', 'suffix', DEFAULT_CURSOR_POSITION);
    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);

    sinon.assert.calledTwice(mockAidaClient.completeCode);
  });

  it('does not use cache for different suffix', async () => {
    const editor = new TextEditor.TextEditor.TextEditor(makeState('', TextEditor.Config.aiAutoCompleteSuggestion));
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
        editor,
        AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
    );

    aiCodeCompletion.onTextChanged('prefix', 'suffix', DEFAULT_CURSOR_POSITION);
    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);

    aiCodeCompletion.onTextChanged('prefix', 'suffixes', DEFAULT_CURSOR_POSITION);
    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);

    sinon.assert.calledTwice(mockAidaClient.completeCode);
  });
});
