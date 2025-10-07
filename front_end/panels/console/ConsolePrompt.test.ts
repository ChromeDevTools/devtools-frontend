// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import {
  createTarget,
  registerNoopActions,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
} from '../../testing/MockConnection.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Console from './console.js';

function compileScriptResponse(exception?: string): Protocol.Runtime.CompileScriptResponse {
  const exceptionDetails = exception ? {exception: {description: exception}} : undefined;
  return {exceptionDetails, getError: () => {}} as unknown as Protocol.Runtime.CompileScriptResponse;
}

describeWithMockConnection('ConsoleContextSelector', () => {
  let target: SDK.Target.Target;
  let consolePrompt: Console.ConsolePrompt.ConsolePrompt;
  let evaluateOnTarget: sinon.SinonStub;
  let compileScript: sinon.SinonStub;
  let checkAccessPreconditionsStub: sinon.SinonStub;
  let editor: TextEditor.TextEditor.TextEditor;

  beforeEach(() => {
    sinon.stub(Host.AidaClient.HostConfigTracker.instance(), 'pollAidaAvailability').callsFake(async () => {});
    checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    updateHostConfig({
      devToolsAiCodeCompletion: {
        enabled: true,
      },
      aidaAvailability: {enabled: true},
    });
    registerNoopActions(['console.clear', 'console.clear.history', 'console.create-pin']);

    consolePrompt = new Console.ConsolePrompt.ConsolePrompt();
    editor = consolePrompt.element.querySelector('devtools-text-editor')!;
    setCodeMirrorContent('foo');

    target = createTarget();
    const targetContext = createExecutionContext(target);
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

    sinon.assert.called(evaluateOnTarget);
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

  it('updates aiCodeCompletion when FRE setting is updated', () => {
    assert.isUndefined(consolePrompt['aiCodeCompletion']);
    const setting = Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled');
    setting.set(true);
    assert.exists(consolePrompt['aiCodeCompletion']);
    setting.set(false);
    assert.isUndefined(consolePrompt['aiCodeCompletion']);
  });

  describe('onAidaAvailabilityChange', () => {
    it('sets up AI completion when AIDA becomes available', async () => {
      Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
      Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
          Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.isUndefined(consolePrompt['aiCodeCompletion']);

      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
          Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.exists(consolePrompt['aiCodeCompletion']);
    });

    it('cleans up AI completion when AIDA becomes unavailable', async () => {
      Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
          Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.exists(consolePrompt['aiCodeCompletion']);

      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
      Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
          Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.isUndefined(consolePrompt['aiCodeCompletion']);
    });
  });

  it('sends console history in the request to AIDA', () => {
    const mockAidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient, {
      completeCode: Promise.resolve(null),
    });
    consolePrompt.setAidaClientForTest(mockAidaClient);
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
    const onTextChangedSpy = sinon.spy(
        consolePrompt['aiCodeCompletion'] as AiCodeCompletion.AiCodeCompletion.AiCodeCompletion, 'onTextChanged');
    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);
    const message = new SDK.ConsoleModel.ConsoleMessage(
        target.model(SDK.RuntimeModel.RuntimeModel),
        Protocol.Log.LogEntrySource.Javascript,
        null,
        'let x = 1;',
        {type: SDK.ConsoleModel.FrontendMessageType.Command},
    );
    consoleModel.addMessage(message);

    setCodeMirrorContent('console.log();', {selectionHead: 12});
    onTextChangedSpy.resetHistory();
    consolePrompt.triggerAiCodeCompletion();

    sinon.assert.calledOnce(onTextChangedSpy);
    assert.deepEqual(onTextChangedSpy.firstCall.args, ['let x = 1;\n\nconsole.log(', ');', 12]);
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
});
