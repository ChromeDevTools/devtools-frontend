// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {
  createTarget,
  registerNoopActions,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
} from '../../testing/MockConnection.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import type * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Console from './console.js';

describeWithMockConnection('ConsoleContextSelector', () => {
  let target: SDK.Target.Target;
  let consolePrompt: Console.ConsolePrompt.ConsolePrompt;
  let keyBinding: CodeMirror.KeyBinding[];
  let evaluateOnTarget: sinon.SinonStub;
  let editor: TextEditor.TextEditor.TextEditor;

  beforeEach(() => {
    registerNoopActions(['console.clear', 'console.clear.history', 'console.create-pin']);

    const keymapOf = sinon.spy(CodeMirror.keymap, 'of');
    consolePrompt = new Console.ConsolePrompt.ConsolePrompt();
    assert.isTrue(keymapOf.called);
    keyBinding = keymapOf.firstCall.firstArg;
    const editorContainer = consolePrompt.element.querySelector('.console-prompt-editor-container');
    editor = editorContainer!.firstElementChild as TextEditor.TextEditor.TextEditor;
    editor.state = {doc: 'foo', selection: {main: {head: 42}}} as unknown as CodeMirror.EditorState;
    editor.dispatch = () => {};

    target = createTarget();
    const targetContext = createExecutionContext(target);
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, targetContext);
    evaluateOnTarget = sinon.stub(target.runtimeAgent(), 'invoke_evaluate');
  });

  let id = 0;

  function createExecutionContext(target: SDK.Target.Target): SDK.RuntimeModel.ExecutionContext {
    ++id;
    dispatchEvent(target, 'Runtime.executionContextCreated', {
      context: {
        id,
        origin: 'http://example.com',
        name: `c${id}`,
        uniqueId: `c${id}`,
        auxData: {
          frameId: 'f2',
        },
      },
    });
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    const executionContext = runtimeModel.executionContext(id);
    assert.exists(executionContext);
    return executionContext;
  }

  function compileScriptResponse(exception?: string): Protocol.Runtime.CompileScriptResponse {
    const exceptionDetails = exception ? {exception: {description: exception}} : undefined;
    return {exceptionDetails, getError: () => {}} as unknown as Protocol.Runtime.CompileScriptResponse;
  }

  it('evaluates on enter', async () => {
    const enterBinding = keyBinding.find(b => b.key === 'Enter');
    sinon.stub(target.runtimeAgent(), 'invoke_compileScript').resolves(compileScriptResponse());

    enterBinding!.run!({} as CodeMirror.EditorView);
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.isTrue(evaluateOnTarget.called);
  });

  it('allows user to enable pasting by typing \'allow pasting\'', async () => {
    const setting = Common.Settings.Settings.instance().createSetting(
        'disable-self-xss-warning', false, Common.Settings.SettingStorageType.SYNCED);
    assert.isFalse(setting.get());
    const enterBinding = keyBinding.find(b => b.key === 'Enter');
    sinon.stub(target.runtimeAgent(), 'invoke_compileScript').resolves(compileScriptResponse());

    consolePrompt.showSelfXssWarning();
    enterBinding!.run!({} as CodeMirror.EditorView);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(setting.get());

    consolePrompt.showSelfXssWarning();
    editor.state = {doc: 'allow pasting', selection: {main: {head: 42}}} as unknown as CodeMirror.EditorState;
    enterBinding!.run!({} as CodeMirror.EditorView);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(setting.get());
  });

  it('does not evaluate incomplete expression', async () => {
    const enterBinding = keyBinding.find(b => b.key === 'Enter');
    sinon.stub(target.runtimeAgent(), 'invoke_compileScript')
        .resolves(compileScriptResponse('SyntaxError: Unexpected end of input'));

    enterBinding!.run!({} as CodeMirror.EditorView);
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.isFalse(evaluateOnTarget.called);
  });

  it('evaluate incomplete expression if forced', async () => {
    const ctrlEnterBinding = keyBinding.find(b => b.key === 'Ctrl-Enter');
    sinon.stub(target.runtimeAgent(), 'invoke_compileScript')
        .resolves(compileScriptResponse('SyntaxError: Unexpected end of input'));

    ctrlEnterBinding!.run!({} as CodeMirror.EditorView);
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.isTrue(evaluateOnTarget.called);
  });

  it('does not evaluate if the current context has changed', async () => {
    const anotherTarget = createTarget();
    const anotherTargetContext = createExecutionContext(target);
    const evaluateOnAnotherTarget = sinon.stub(anotherTarget.runtimeAgent(), 'invoke_evaluate');

    const enterBinding = keyBinding.find(b => b.key === 'Enter');
    sinon.stub(target.runtimeAgent(), 'invoke_compileScript').resolves(compileScriptResponse());
    sinon.stub(anotherTarget.runtimeAgent(), 'invoke_compileScript').resolves(compileScriptResponse());

    enterBinding!.run!({} as CodeMirror.EditorView);

    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, anotherTargetContext);
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.isFalse(evaluateOnAnotherTarget.called);
    assert.isFalse(evaluateOnTarget.called);
  });
});
