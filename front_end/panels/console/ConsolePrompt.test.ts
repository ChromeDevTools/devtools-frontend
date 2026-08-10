// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget, describeWithEnvironment, registerNoopActions} from '../../testing/EnvironmentHelpers.js';
import {dispatchEvent} from '../../testing/MockConnection.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Console from './console.js';

function compileScriptResponse(exception?: string): Protocol.Runtime.CompileScriptResponse {
  const exceptionDetails = exception ? {exception: {description: exception}} : undefined;
  return {exceptionDetails, getError: () => {}} as unknown as Protocol.Runtime.CompileScriptResponse;
}

describeWithEnvironment('ConsoleContextSelector', () => {
  let target: SDK.Target.Target;
  let targetContext: SDK.RuntimeModel.ExecutionContext;
  let consolePrompt: Console.ConsolePrompt.ConsolePrompt;
  let evaluateOnTarget: sinon.SinonStub;
  let compileScript: sinon.SinonStub;
  let editor: TextEditor.TextEditor.TextEditor;

  beforeEach(() => {
    sinon.stub(Host.AidaClient.HostConfigTracker.instance(), 'pollAidaAvailability').callsFake(async () => {});
    sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions')
        .resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    registerNoopActions(['console.clear', 'console.clear.history', 'console.create-pin']);

    consolePrompt = new Console.ConsolePrompt.ConsolePrompt();
    editor = consolePrompt.element.querySelector('devtools-text-editor')!;
    setCodeMirrorContent('foo');

    target = createTarget();
    targetContext = createExecutionContext(target);
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, targetContext);
    evaluateOnTarget = sinon.stub(target.runtimeAgent(), 'invoke_evaluate');
    compileScript = sinon.stub(target.runtimeAgent(), 'invoke_compileScript').resolves(compileScriptResponse());

    Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false);
  });

  let id = 0;

  function createExecutionContext(target: SDK.Target.Target): SDK.RuntimeModel.ExecutionContext {
    ++id;
    dispatchEvent(target, 'Runtime.executionContextCreated', {
      context: {
        id: id as Protocol.Runtime.ExecutionContextId,
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

  function dispatchKeydown(key: string, options: Omit<KeyboardEventInit, 'key'> = {}): void {
    editor.editor.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      ...options,
    }));
  }

  function setCodeMirrorContent(
      content: string, {selectionHead}: {selectionHead: number} = {selectionHead: content.length}) {
    editor.dispatch({
      changes: {from: 0, to: editor.state.doc.length, insert: content},
      selection: {anchor: selectionHead},
    });
  }

  it('evaluates on enter', async () => {
    dispatchKeydown('Enter');
    await new Promise(resolve => setTimeout(resolve, 0));

    sinon.assert.calledOnce(evaluateOnTarget);
    const args = evaluateOnTarget.firstCall.args[0];
    assert.strictEqual(args.expression, 'foo');
    assert.strictEqual(args.uniqueContextId, targetContext.uniqueId);

    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);
    const messages = consoleModel.messages();
    assert.lengthOf(messages, 1);
    assert.strictEqual(messages[0].messageText, 'foo');
  });

  it('evaluates object literal on enter', async () => {
    setCodeMirrorContent('{a: 1, b: 2}');
    dispatchKeydown('Enter');
    await new Promise(resolve => setTimeout(resolve, 0));

    sinon.assert.calledOnce(evaluateOnTarget);
    const args = evaluateOnTarget.firstCall.args[0];
    assert.strictEqual(args.expression, '({a: 1, b: 2})');
    assert.strictEqual(args.uniqueContextId, targetContext.uniqueId);

    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);
    const messages = consoleModel.messages();
    assert.lengthOf(messages, 1);
    assert.strictEqual(messages[0].messageText, '{a: 1, b: 2}');
  });

  it('allows user to enable pasting by typing \'allow pasting\'', async () => {
    const setting = Common.Settings.Settings.instance().createSetting(
        'disable-self-xss-warning', false, Common.Settings.SettingStorageType.SYNCED);
    assert.isFalse(setting.get());

    consolePrompt.showSelfXssWarning();
    dispatchKeydown('Enter');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(setting.get());

    consolePrompt.showSelfXssWarning();
    setCodeMirrorContent('allow pasting');
    dispatchKeydown('Enter');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(setting.get());
  });

  it('does not evaluate incomplete expression', async () => {
    compileScript.resolves(compileScriptResponse('SyntaxError: Unexpected end of input'));

    dispatchKeydown('Enter');
    await new Promise(resolve => setTimeout(resolve, 0));

    sinon.assert.notCalled(evaluateOnTarget);
  });

  it('evaluate incomplete expression if forced', async () => {
    compileScript.resolves(compileScriptResponse('SyntaxError: Unexpected end of input'));

    dispatchKeydown('Ctrl-Enter');
    await new Promise(resolve => setTimeout(resolve, 0));

    sinon.assert.called(evaluateOnTarget);
  });

  it('does not evaluate if the current context has changed', async () => {
    const anotherTarget = createTarget();
    const anotherTargetContext = createExecutionContext(target);
    const evaluateOnAnotherTarget = sinon.stub(anotherTarget.runtimeAgent(), 'invoke_evaluate');

    sinon.stub(anotherTarget.runtimeAgent(), 'invoke_compileScript').resolves(compileScriptResponse());

    dispatchKeydown('Enter');

    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, anotherTargetContext);
    await new Promise(resolve => setTimeout(resolve, 0));

    sinon.assert.notCalled(evaluateOnAnotherTarget);
    sinon.assert.notCalled(evaluateOnTarget);
  });

  it('handles event sequence correctly', async () => {
    const stub = sinon.stub(TextEditor.TextEditorHistory.TextEditorHistory.prototype, 'moveHistory');
    // Verify that ArrowUp with repeat does not move history.
    dispatchKeydown('ArrowUp', {repeat: true});
    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.notCalled(stub);

    // Verify that ArrowUp does move history.
    dispatchKeydown('ArrowUp');
    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.calledOnceWithExactly(stub, TextEditor.TextEditorHistory.Direction.BACKWARD);
    stub.resetHistory();

    // Verify that ArrowDown with repeat does not move history.
    dispatchKeydown('ArrowDown', {repeat: true});
    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.notCalled(stub);

    // Verify that ArrowDown does move history.
    dispatchKeydown('ArrowDown');
    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.calledOnceWithExactly(stub, TextEditor.TextEditorHistory.Direction.FORWARD);
  });

  it('insertText replaces content, places caret at end, and scrolls into view', () => {
    // editor already has 'foo' from beforeEach
    assert.strictEqual(editor.state.doc.toString(), 'foo');

    const dispatchSpy = sinon.spy(editor, 'dispatch');
    const text = 'await fetch("https://example.com")';
    consolePrompt.insertText(text);

    // Replaces existing content
    assert.strictEqual(editor.state.doc.toString(), text);

    // Caret is at the end
    const selection = editor.state.selection.main;
    assert.strictEqual(selection.anchor, text.length);

    // scrollIntoView was requested
    sinon.assert.calledOnce(dispatchSpy);
    const transaction = dispatchSpy.firstCall.args[0] as {scrollIntoView?: boolean};
    assert.isTrue(transaction.scrollIntoView);
  });
});
