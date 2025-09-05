// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';

import {AiCodeCompletionPlugin} from './sources.js';

describeWithEnvironment('AiCodeCompletionPlugin', () => {
  let uiSourceCode: sinon.SinonStubbedInstance<Workspace.UISourceCode.UISourceCode>;
  let clock: sinon.SinonFakeTimers;
  let checkAccessPreconditionsStub: sinon.SinonStub;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    updateHostConfig({
      devToolsAiCodeCompletion: {
        enabled: true,
      },
    });

    uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    uiSourceCode.contentType.returns(Common.ResourceType.resourceTypes.Script);

    checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
  });

  afterEach(() => {
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-teaser-dismissed').set(false);
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(false);
    clock.restore();
  });

  function createEditorWithPlugin(doc: string):
      {editor: TextEditor.TextEditor.TextEditor, plugin: AiCodeCompletionPlugin.AiCodeCompletionPlugin} {
    const plugin = new AiCodeCompletionPlugin.AiCodeCompletionPlugin(uiSourceCode);
    const editor = new TextEditor.TextEditor.TextEditor(
        CodeMirror.EditorState.create({
          doc,
          extensions: [
            plugin.editorExtension(),
          ],
        }),
    );
    plugin.editorInitialized(editor);
    renderElementIntoDOM(editor);
    return {editor, plugin};
  }

  describe('accepts', () => {
    it('holds true for scripts', () => {
      uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
      uiSourceCode.contentType.returns(Common.ResourceType.resourceTypes.Script);
      assert.isTrue(AiCodeCompletionPlugin.AiCodeCompletionPlugin.accepts(uiSourceCode));
    });

    it('holds true for stylesheets', () => {
      uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
      uiSourceCode.contentType.returns(Common.ResourceType.resourceTypes.Stylesheet);
      assert.isTrue(AiCodeCompletionPlugin.AiCodeCompletionPlugin.accepts(uiSourceCode));
    });

    it('holds true for documents', () => {
      uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
      uiSourceCode.contentType.returns(Common.ResourceType.resourceTypes.Document);
      assert.isTrue(AiCodeCompletionPlugin.AiCodeCompletionPlugin.accepts(uiSourceCode));
    });
  });

  describe('teaser decoration', () => {
    it('shows teaser when cursor is at the end of the line', async () => {
      const {editor} = createEditorWithPlugin('Hello');
      editor.dispatch({changes: {from: 5, insert: 'W'}, selection: {anchor: 6}});
      await clock.tickAsync(
          AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
          AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));
    });

    it('hides teaser when cursor is not at the end of the line', async () => {
      const {editor} = createEditorWithPlugin('Hello');
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
    });

    it('hides teaser when text is selected', async () => {
      const {editor} = createEditorWithPlugin('Hello');
      editor.dispatch({changes: {from: 5, insert: 'W'}, selection: {anchor: 6}});
      await clock.tickAsync(
          AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
          AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({selection: {anchor: 2, head: 4}});
      assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));
    });
  });

  it('triggers code completion on text change', async () => {
    const {editor} = createEditorWithPlugin('');
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
    const onTextChangedStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'onTextChanged');

    editor.dispatch({changes: {from: 0, insert: 'Hello'}, selection: {anchor: 5}});
    sinon.assert.called(onTextChangedStub);
    assert.deepEqual(onTextChangedStub.firstCall.args, ['Hello', '', 5, undefined]);
  });

  it('triggers code completion when AIDA becomes available', async () => {
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
    const onTextChangedStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'onTextChanged');
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
    const {editor} = createEditorWithPlugin('');
    await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

    editor.dispatch({changes: {from: 0, insert: 'Hello'}, selection: {anchor: 5}});

    sinon.assert.notCalled(onTextChangedStub);

    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    await Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
    await clock.tickAsync(0);

    editor.dispatch({changes: {from: 5, insert: 'Bye'}, selection: {anchor: 8}});

    sinon.assert.calledOnce(onTextChangedStub);
    assert.deepEqual(onTextChangedStub.firstCall.args, ['HelloBye', '', 8, undefined]);
  });

  it('does not trigger code completion when AIDA becomes unavailable', async () => {
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    const onTextChangedStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'onTextChanged');
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
    const {editor} = createEditorWithPlugin('');
    await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

    editor.dispatch({changes: {from: 0, insert: 'Hello'}, selection: {anchor: 5}});

    sinon.assert.calledOnce(onTextChangedStub);

    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
    await Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
    await clock.tickAsync(0);

    editor.dispatch({changes: {from: 5, insert: 'Bye'}, selection: {anchor: 8}});

    sinon.assert.calledOnce(onTextChangedStub);
    assert.deepEqual(onTextChangedStub.firstCall.args, ['Hello', '', 5, undefined]);
  });
});
