// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as PanelCommon from '../../../panels/common/common.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';

import {AiCodeGenerationProvider, TextEditor} from './text_editor.js';

function createEditorWithProvider(doc: string):
    {editor: TextEditor.TextEditor, provider: AiCodeGenerationProvider.AiCodeGenerationProvider} {
  const provider = AiCodeGenerationProvider.AiCodeGenerationProvider.createInstance();
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

describeWithEnvironment('AiCodeGenerationProvider', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    updateHostConfig({
      devToolsAiCodeGeneration: {
        enabled: true,
      },
      aidaAvailability: {
        enabled: true,
        blockedByAge: false,
        blockedByGeo: false,
      }
    });
    sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions')
        .resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    sinon.stub(Host.AidaClient.HostConfigTracker, 'instance').returns({
      addEventListener: () => {},
      removeEventListener: () => {},
      dispose: () => {},
    } as unknown as Host.AidaClient.HostConfigTracker);
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
  });

  afterEach(() => {
    clock.restore();
  });

  it('does not create a provider when the feature is disabled', () => {
    updateHostConfig({
      devToolsAiCodeGeneration: {
        enabled: false,
      },
    });
    assert.throws(() => createEditorWithProvider(''), 'AI code generation feature is not enabled.');
  });

  describe('Teaser decoration', () => {
    it('shows teaser when cursor is at the end of a comment line', async () => {
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('hides teaser when cursor is not at the end of the line', async () => {
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 5}});
      await clock.tickAsync(0);
      assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('hides teaser when the line is not a comment', async () => {
      const {editor, provider} = createEditorWithProvider('console');
      editor.dispatch({selection: {anchor: 7}});
      await clock.tickAsync(0);
      assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('hides teaser when mode is DISMISSED', async () => {
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({
        effects: AiCodeGenerationProvider.setAiCodeGenerationTeaserMode.of(
            AiCodeGenerationProvider.AiCodeGenerationTeaserMode.DISMISSED)
      });
      await clock.tickAsync(0);
      assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('shows teaser again after a document change', async () => {
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({
        effects: AiCodeGenerationProvider.setAiCodeGenerationTeaserMode.of(
            AiCodeGenerationProvider.AiCodeGenerationTeaserMode.DISMISSED)
      });
      await clock.tickAsync(0);
      assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({changes: {from: 8, insert: 'W'}, selection: {anchor: 9}});
      await clock.tickAsync(0);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });
  });

  describe('Editor keymap', () => {
    it('dismisses teaser on Escape when loading', async () => {
      const {editor, provider} = createEditorWithProvider('// Hello');
      sinon.stub(PanelCommon.AiCodeGenerationTeaser.prototype, 'loading').value(true);
      sinon.stub(PanelCommon.AiCodeGenerationTeaser.prototype, 'isShowing').returns(true);
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);

      const dispatchSpy = sinon.spy(editor, 'dispatch');
      editor.editor.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

      sinon.assert.calledOnce(dispatchSpy);
      sinon.assert.calledWith(dispatchSpy, {
        effects: AiCodeGenerationProvider.setAiCodeGenerationTeaserMode.of(
            AiCodeGenerationProvider.AiCodeGenerationTeaserMode.DISMISSED)
      });
      provider.dispose();
    });

    it('triggers loading state on Ctrl+I', async () => {
      const {editor, provider} = createEditorWithProvider('// Hello');
      const generationTeaser = sinon.spy(PanelCommon.AiCodeGenerationTeaser.prototype, 'loading', ['set']);
      sinon.stub(PanelCommon.AiCodeGenerationTeaser.prototype, 'isShowing').returns(true);
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);

      const event = new KeyboardEvent('keydown', {
        key: 'i',
        ctrlKey: Host.Platform.isMac() ? false : true,
        metaKey: Host.Platform.isMac() ? true : false,
      });
      editor.editor.contentDOM.dispatchEvent(event);

      sinon.assert.calledOnce(generationTeaser.set);
      sinon.assert.calledWith(generationTeaser.set, true);
      provider.dispose();
    });
  });
});
