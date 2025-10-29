// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';

import {AiCodeCompletionProvider, TextEditor} from './text_editor.js';

function createEditorWithProvider(doc: string, config: AiCodeCompletionProvider.AiCodeCompletionConfig = {
  completionContext: {},
  onFeatureEnabled: () => {},
  onFeatureDisabled: () => {},
  onSuggestionAccepted: () => {},
  onRequestTriggered: () => {},
  onResponseReceived: () => {},
}): {editor: TextEditor.TextEditor, provider: AiCodeCompletionProvider.AiCodeCompletionProvider} {
  const provider = new AiCodeCompletionProvider.AiCodeCompletionProvider(config);
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
          AiCodeCompletionProvider.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
          AiCodeCompletionProvider.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
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
          AiCodeCompletionProvider.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
          AiCodeCompletionProvider.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({changes: {from: 0, insert: '!'}, selection: {anchor: 1}});
      await clock.tickAsync(
          AiCodeCompletionProvider.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
          AiCodeCompletionProvider.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
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
          AiCodeCompletionProvider.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
          AiCodeCompletionProvider.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
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
});
