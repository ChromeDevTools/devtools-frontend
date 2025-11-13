// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as AiCodeCompletion from '../../../models/ai_code_completion/ai_code_completion.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';

import {AiCodeCompletionProvider, Config, TextEditor} from './text_editor.js';

function createEditorWithProvider(doc: string, config: AiCodeCompletionProvider.AiCodeCompletionConfig = {
  completionContext: {},
  onFeatureEnabled: () => {},
  onFeatureDisabled: () => {},
  onSuggestionAccepted: () => {},
  onRequestTriggered: () => {},
  onResponseReceived: () => {},
  panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
}): {editor: TextEditor.TextEditor, provider: AiCodeCompletionProvider.AiCodeCompletionProvider} {
  const provider = AiCodeCompletionProvider.AiCodeCompletionProvider.createInstance(config);
  const editor = new TextEditor.TextEditor(
      CodeMirror.EditorState.create({
        doc,
        extensions: [
          provider.extension(),
        ],
      }),
  );
  renderElementIntoDOM(editor);
  provider.editorInitialized(editor);
  return {editor, provider};
}

describeWithEnvironment('AiCodeCompletionProvider', () => {
  let clock: sinon.SinonFakeTimers;
  let checkAccessPreconditionsStub: sinon.SinonStub;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    updateHostConfig({
      devToolsAiCodeCompletion: {
        enabled: true,
      },
      aidaAvailability: {
        enabled: true,
        blockedByAge: false,
        blockedByGeo: false,
      }
    });

    checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
  });

  afterEach(() => {
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-teaser-dismissed').set(false);
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(false);
    clock.restore();
  });

  it('does not create a provider when the feature is disabled', () => {
    updateHostConfig({
      devToolsAiCodeCompletion: {
        enabled: false,
      },
    });
    assert.throws(() => createEditorWithProvider(''), 'AI code completion feature is not enabled.');
  });

  describe('Teaser decoration', () => {
    beforeEach(() => {
      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    });

    it('shows teaser when mode is ON', async () => {
      const {editor, provider} = createEditorWithProvider('');
      editor.dispatch({
        effects: AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(
            AiCodeCompletionProvider.AiCodeCompletionTeaserMode.ON),
      });
      await clock.tickAsync(0);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('shows teaser when mode is ON and cursor is at the end of the line', async () => {
      const {editor, provider} = createEditorWithProvider('Hello');
      editor.dispatch({
        effects: AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(
            AiCodeCompletionProvider.AiCodeCompletionTeaserMode.ON),
      });
      editor.dispatch({changes: {from: 5, insert: 'W'}, selection: {anchor: 6}});
      await clock.tickAsync(
          AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
          AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('hides teaser when mode is ON and cursor is not at the end of the line', async () => {
      const {editor, provider} = createEditorWithProvider('Hello');
      editor.dispatch({
        effects: AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(
            AiCodeCompletionProvider.AiCodeCompletionTeaserMode.ON),
      });
      editor.dispatch({changes: {from: 5, insert: 'W'}, selection: {anchor: 6}});
      await clock.tickAsync(
          AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
          AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({changes: {from: 0, insert: '!'}, selection: {anchor: 1}});
      await clock.tickAsync(
          AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
          AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('hides teaser when mode is ON and text is selected', async () => {
      const {editor, provider} = createEditorWithProvider('Hello');
      editor.dispatch({
        effects: AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(
            AiCodeCompletionProvider.AiCodeCompletionTeaserMode.ON),
      });
      editor.dispatch({changes: {from: 5, insert: 'W'}, selection: {anchor: 6}});
      await clock.tickAsync(
          AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
          AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({selection: {anchor: 2, head: 4}});
      assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('hides teaser when mode is OFF', async () => {
      const {editor, provider} = createEditorWithProvider('');
      editor.dispatch({
        effects: AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(
            AiCodeCompletionProvider.AiCodeCompletionTeaserMode.ON),
      });
      await clock.tickAsync(0);

      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({
        effects: AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(
            AiCodeCompletionProvider.AiCodeCompletionTeaserMode.OFF),
      });
      await clock.tickAsync(0);

      assert.isNull(editor.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('shows teaser when mode is ONLY_SHOW_ON_EMPTY and editor is empty', async () => {
      const {editor, provider} = createEditorWithProvider('');
      editor.dispatch({
        effects: AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(
            AiCodeCompletionProvider.AiCodeCompletionTeaserMode.ONLY_SHOW_ON_EMPTY),
      });
      await clock.tickAsync(0);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('hides teaser when mode is ONLY_SHOW_ON_EMPTY and editor is not empty', async () => {
      const {editor, provider} = createEditorWithProvider('');
      editor.dispatch({
        effects: AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(
            AiCodeCompletionProvider.AiCodeCompletionTeaserMode.ONLY_SHOW_ON_EMPTY),
      });
      await clock.tickAsync(0);

      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({changes: {from: 0, insert: 'H'}});

      await clock.tickAsync(0);
      assert.isNull(editor.querySelector('.cm-placeholder'));
      provider.dispose();
    });
  });

  describe('Triggers code completion', () => {
    it('triggers code completion on text change', async () => {
      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
      const {editor, provider} = createEditorWithProvider('');
      const completeCodeStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'completeCode');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({changes: {from: 0, insert: 'Hello'}, selection: {anchor: 5}});
      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);

      sinon.assert.called(completeCodeStub);
      assert.deepEqual(completeCodeStub.firstCall.args, ['Hello', '', 5, undefined, undefined]);
      provider.dispose();
    });

    it('triggers code completion when AIDA becomes available', async () => {
      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
      const completeCodeStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'completeCode');
      Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({changes: {from: 0, insert: 'Hello'}, selection: {anchor: 5}});
      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);

      sinon.assert.notCalled(completeCodeStub);

      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      await Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
          Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
      await clock.tickAsync(0);

      editor.dispatch({changes: {from: 5, insert: 'Bye'}, selection: {anchor: 8}});
      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);

      sinon.assert.calledOnce(completeCodeStub);
      assert.deepEqual(completeCodeStub.firstCall.args, ['HelloBye', '', 8, undefined, undefined]);
      provider.dispose();
    });

    it('does not trigger code completion when AIDA becomes unavailable', async () => {
      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      const completeCodeStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'completeCode');
      Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({changes: {from: 0, insert: 'Hello'}, selection: {anchor: 5}});
      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);

      sinon.assert.calledOnce(completeCodeStub);

      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
      await Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
          Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
      await clock.tickAsync(0);

      editor.dispatch({changes: {from: 5, insert: 'Bye'}, selection: {anchor: 8}});
      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);

      sinon.assert.calledOnce(completeCodeStub);
      assert.deepEqual(completeCodeStub.firstCall.args, ['Hello', '', 5, undefined, undefined]);
      provider.dispose();
    });

    it('debounces requests for code completion', async () => {
      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      const completeCodeStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'completeCode');
      Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({changes: {from: 0, insert: 'p'}, selection: {anchor: 1}});
      editor.dispatch({changes: {from: 1, insert: 'r'}, selection: {anchor: 2}});
      editor.dispatch({changes: {from: 2, insert: 'e'}, selection: {anchor: 3}});
      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);

      sinon.assert.calledOnce(completeCodeStub);
      assert.deepEqual(completeCodeStub.firstCall.args, ['pre', '', 3, undefined, undefined]);
      provider.dispose();
    });
  });

  describe('Dispatches', () => {
    beforeEach(() => {
      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
    });

    it('dispatches a suggestion to the editor when AIDA returns one', async () => {
      const completeCodeStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'completeCode')
                                   .returns(Promise.resolve({
                                     response: {
                                       generatedSamples: [{
                                         generationString: 'suggestion',
                                         sampleId: 1,
                                         score: 1,
                                       }],
                                       metadata: {rpcGlobalId: 1},
                                     },
                                     fromCache: false,
                                   }));
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({changes: {from: 0, insert: 'prefix'}, selection: {anchor: 6}});

      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
      sinon.assert.calledOnce(completeCodeStub);
      const dispatchSpy = sinon.spy(editor, 'dispatch');
      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      const suggestion = editor.editor.state.field(Config.aiAutoCompleteSuggestionState);
      assert.strictEqual(suggestion?.text, 'suggestion');
      assert.strictEqual(suggestion?.from, 6);
      assert.strictEqual(suggestion?.sampleId, 1);
      assert.strictEqual(suggestion?.rpcGlobalId, 1);
      sinon.assert.calledOnce(dispatchSpy);
      provider.dispose();
    });

    it('trims a suggestion with suffix overlap and dispatches it to the editor', async () => {
      const completeCodeStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'completeCode')
                                   .returns(Promise.resolve({
                                     response: {
                                       generatedSamples: [{
                                         generationString: 'Hello World");',
                                         sampleId: 1,
                                         score: 1,
                                       }],
                                       metadata: {rpcGlobalId: 1},
                                     },
                                     fromCache: false,
                                   }));
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({changes: {from: 0, insert: 'console.log("");\n'}, selection: {anchor: 13}});

      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
      sinon.assert.calledOnce(completeCodeStub);
      const dispatchSpy = sinon.spy(editor, 'dispatch');
      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      const suggestion = editor.editor.state.field(Config.aiAutoCompleteSuggestionState);
      assert.strictEqual(suggestion?.text, 'Hello World');
      assert.strictEqual(suggestion?.from, 13);
      assert.strictEqual(suggestion?.sampleId, 1);
      assert.strictEqual(suggestion?.rpcGlobalId, 1);
      sinon.assert.calledOnce(dispatchSpy);
      provider.dispose();
    });

    it('does not dispatch suggestion or citation if recitation action is BLOCK', async () => {
      const completeCodeStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'completeCode')
                                   .returns(Promise.resolve({
                                     response: {
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
                                     },
                                     fromCache: false,
                                   }));
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({changes: {from: 0, insert: 'prefix'}, selection: {anchor: 6}});

      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
      sinon.assert.calledOnce(completeCodeStub);
      const dispatchSpy = sinon.spy(editor, 'dispatch');
      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      sinon.assert.notCalled(dispatchSpy);
      provider.dispose();
    });

    it('does not dispatch suggestion or citation if generated suggestion repeats existing text', async () => {
      const completeCodeStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'completeCode')
                                   .returns(Promise.resolve({
                                     response: {
                                       generatedSamples: [{
                                         generationString: 'suggestion',
                                         sampleId: 1,
                                         score: 1,
                                       }],
                                       metadata: {},
                                     },
                                     fromCache: false,
                                   }));
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({changes: {from: 0, insert: 'prefix suggestion'}, selection: {anchor: 17}});

      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
      sinon.assert.calledOnce(completeCodeStub);
      const dispatchSpy = sinon.spy(editor, 'dispatch');
      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      sinon.assert.notCalled(dispatchSpy);
      provider.dispose();
    });

    it('does not dispatch if cursor position changes', async () => {
      const completeCodeStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'completeCode')
                                   .returns(Promise.resolve({
                                     response: {
                                       generatedSamples: [{
                                         generationString: 'suggestion',
                                         sampleId: 1,
                                         score: 1,
                                       }],
                                       metadata: {},
                                     },
                                     fromCache: false,
                                   }));
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({changes: {from: 0, insert: 'prefix'}, selection: {anchor: 6}});

      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);
      sinon.assert.calledOnce(completeCodeStub);
      editor.editor.dispatch({
        selection: CodeMirror.EditorSelection.cursor(1),
      });
      const dispatchSpy = sinon.spy(editor, 'dispatch');
      await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      sinon.assert.notCalled(dispatchSpy);
      provider.dispose();
    });
  });

  describe('Editor keymap', () => {
    beforeEach(() => {
      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    });

    it('accepts suggestion on Tab', async () => {
      Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({
        effects: Config.setAiAutoCompleteSuggestion.of({
          text: 'suggestion',
          from: 0,
          rpcGlobalId: 1,
          sampleId: 1,
          startTime: performance.now(),
          clearCachedRequest: () => {},
          onImpression: () => {},
        }),
      });
      editor.editor.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab'}));

      assert.strictEqual(editor.state.doc.toString(), 'suggestion');
      provider.dispose();
    });

    it('dismisses suggestion on Escape', async () => {
      Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({
        effects: Config.setAiAutoCompleteSuggestion.of({
          text: 'suggestion',
          from: 0,
          rpcGlobalId: 1,
          sampleId: 1,
          startTime: performance.now(),
          clearCachedRequest: () => {},
          onImpression: () => {},
        }),
      });

      assert.isNotNull(editor.editor.state.field(Config.aiAutoCompleteSuggestionState));

      editor.editor.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

      assert.isNull(editor.editor.state.field(Config.aiAutoCompleteSuggestionState));
      provider.dispose();
    });
  });
});
