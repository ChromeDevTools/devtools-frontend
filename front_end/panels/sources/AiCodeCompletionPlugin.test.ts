// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';

import {AiCodeCompletionPlugin} from './sources.js';

const {urlString} = Platform.DevToolsPath;

function createEditorWithPlugin(doc: string, uiSourceCode: Workspace.UISourceCode.UISourceCode):
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

function createUiSourceCodeStub({
  url = urlString`file://`,
  contentType = Common.ResourceType.resourceTypes.Script,
}: {
  url?: Platform.DevToolsPath.UrlString,
  contentType?: Common.ResourceType.ResourceType,
} = {}): sinon.SinonStubbedInstance<Workspace.UISourceCode.UISourceCode> {
  return sinon.createStubInstance(Workspace.UISourceCode.UISourceCode, {
    url,
    contentType,
  });
}

describeWithEnvironment('AiCodeCompletionPlugin', () => {
  let clock: sinon.SinonFakeTimers;
  let checkAccessPreconditionsStub: sinon.SinonStub;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    updateHostConfig({
      devToolsAiCodeCompletion: {
        enabled: true,
      },
    });

    checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
  });

  afterEach(() => {
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-teaser-dismissed').set(false);
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(false);
    clock.restore();
  });

  describe('accepts', () => {
    it('holds true for scripts', () => {
      assert.isTrue(AiCodeCompletionPlugin.AiCodeCompletionPlugin.accepts(createUiSourceCodeStub({
        contentType: Common.ResourceType.resourceTypes.Script,
      })));
    });

    it('holds true for stylesheets', () => {
      assert.isTrue(AiCodeCompletionPlugin.AiCodeCompletionPlugin.accepts(
          createUiSourceCodeStub({contentType: Common.ResourceType.resourceTypes.Stylesheet})));
    });

    it('holds true for documents', () => {
      assert.isTrue(AiCodeCompletionPlugin.AiCodeCompletionPlugin.accepts(
          createUiSourceCodeStub({contentType: Common.ResourceType.resourceTypes.Document})));
    });
  });

  describe('teaser decoration', () => {
    it('shows teaser when cursor is at the end of the line', async () => {
      const {editor, plugin} = createEditorWithPlugin('Hello', createUiSourceCodeStub());
      editor.dispatch({changes: {from: 5, insert: 'W'}, selection: {anchor: 6}});
      await clock.tickAsync(
          AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
          AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));
      plugin.dispose();
    });

    it('hides teaser when cursor is not at the end of the line', async () => {
      const {editor} = createEditorWithPlugin('Hello', createUiSourceCodeStub());
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
      const {editor, plugin} = createEditorWithPlugin('Hello', createUiSourceCodeStub());
      editor.dispatch({changes: {from: 5, insert: 'W'}, selection: {anchor: 6}});
      await clock.tickAsync(
          AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS +
          AiCodeCompletion.AiCodeCompletion.DELAY_BEFORE_SHOWING_RESPONSE_MS + 1);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({selection: {anchor: 2, head: 4}});
      assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));
      plugin.dispose();
    });
  });

  it('triggers code completion on text change', async () => {
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
    const {editor, plugin} = createEditorWithPlugin('', createUiSourceCodeStub());
    const onTextChangedStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'onTextChanged');

    editor.dispatch({changes: {from: 0, insert: 'Hello'}, selection: {anchor: 5}});
    sinon.assert.called(onTextChangedStub);
    assert.deepEqual(onTextChangedStub.firstCall.args, ['Hello', '', 5, undefined]);
    plugin.dispose();
  });

  it('triggers code completion when AIDA becomes available', async () => {
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
    const onTextChangedStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'onTextChanged');
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
    const {editor, plugin} = createEditorWithPlugin('', createUiSourceCodeStub());
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
    plugin.dispose();
  });

  it('does not trigger code completion when AIDA becomes unavailable', async () => {
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    const onTextChangedStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'onTextChanged');
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
    const {editor, plugin} = createEditorWithPlugin('', createUiSourceCodeStub());
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
    plugin.dispose();
  });

  it('should use CONSOLE context flavor for snippets', async () => {
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    const aidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient);

    const plugin = new AiCodeCompletionPlugin.AiCodeCompletionPlugin(createUiSourceCodeStub({
      url: urlString`snippet://`,
    }));
    plugin.setAidaClientForTest(aidaClient);
    const editor = new TextEditor.TextEditor.TextEditor(CodeMirror.EditorState.create({
      doc: 'console.log("',
      extensions: [
        plugin.editorExtension(),
      ],
    }));
    plugin.editorInitialized(editor);
    renderElementIntoDOM(editor);

    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
    await clock.tickAsync(0);

    editor.dispatch({changes: {from: 13, insert: 'a'}, selection: {anchor: 14}});
    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);

    sinon.assert.calledOnce(aidaClient.completeCode);
    const args = aidaClient.completeCode.lastCall.args[0];
    assert.lengthOf(args.additional_files!, 1);
    assert.strictEqual(args.additional_files![0].path, 'devtools-console-context.js');
    plugin.dispose();
  });

  it('should use SOURCES context flavor for non-snippets', async () => {
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    const aidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient);

    const plugin = new AiCodeCompletionPlugin.AiCodeCompletionPlugin(createUiSourceCodeStub({
      url: urlString`file://script.js`,
    }));
    plugin.setAidaClientForTest(aidaClient);
    const editor = new TextEditor.TextEditor.TextEditor(CodeMirror.EditorState.create({
      doc: 'console.log("',
      extensions: [
        plugin.editorExtension(),
      ],
    }));
    plugin.editorInitialized(editor);
    renderElementIntoDOM(editor);

    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
    await clock.tickAsync(0);

    editor.dispatch({changes: {from: 13, insert: 'a'}, selection: {anchor: 14}});
    await clock.tickAsync(AiCodeCompletion.AiCodeCompletion.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);

    sinon.assert.calledOnce(aidaClient.completeCode);
    const args = aidaClient.completeCode.lastCall.args[0];
    assert.isUndefined(args.additional_files);
    plugin.dispose();
  });
});
