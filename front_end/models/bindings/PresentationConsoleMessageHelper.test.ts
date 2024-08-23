// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {MockExecutionContext} from '../../testing/MockExecutionContext.js';
import * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

async function addMessage(
    helper: Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageHelper, target: SDK.Target.Target,
    url: Platform.DevToolsPath.UrlString) {
  const details = {line: 2, column: 1, url};
  const message = new SDK.ConsoleModel.ConsoleMessage(
      target.model(SDK.RuntimeModel.RuntimeModel), Common.Console.FrontendMessageSource.ConsoleAPI,
      Protocol.Log.LogEntryLevel.Error, 'test message', details);
  const level = Workspace.UISourceCode.Message.Level.ERROR;
  await helper.addMessage(new Workspace.UISourceCode.Message(level, message.messageText), message);
  return message;
}

async function addUISourceCode(
    helper: Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageHelper,
    url: Platform.DevToolsPath.UrlString): Promise<Workspace.UISourceCode.UISourceCode> {
  const uiSourceCodeAddedSpy = sinon.stub(helper, 'uiSourceCodeAddedForTest');
  const uiSourceCodeAddedDonePromise = expectCall(uiSourceCodeAddedSpy);
  const workspace = Workspace.Workspace.WorkspaceImpl.instance();
  const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
      workspace, 'test-project', Workspace.Workspace.projectTypes.Network, 'test-project', false);
  const uiSourceCode = new Workspace.UISourceCode.UISourceCode(
      project, url, Common.ResourceType.ResourceType.fromMimeType('application/text'));
  project.addUISourceCode(uiSourceCode);

  await uiSourceCodeAddedDonePromise;
  uiSourceCodeAddedSpy.restore();
  return uiSourceCode;
}

async function addScript(
    helper: Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageHelper,
    debuggerModel: SDK.DebuggerModel.DebuggerModel, executionContext: SDK.RuntimeModel.ExecutionContext,
    url: Platform.DevToolsPath.UrlString): Promise<Workspace.UISourceCode.UISourceCode> {
  const scriptParsedSpy = sinon.stub(helper, 'parsedScriptSourceForTest');
  const parsedScriptSourceDonePromise = expectCall(scriptParsedSpy);
  const script = debuggerModel.parsedScriptSource(
      'scriptId' as Protocol.Runtime.ScriptId, url, 0, 0, 3, 3, executionContext.id, '', undefined, false, undefined,
      false, false, 0, false, null, null, null, null, null);

  await parsedScriptSourceDonePromise;
  scriptParsedSpy.restore();
  await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().pendingLiveLocationChangesPromise();

  const uiSourceCode =
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiSourceCodeForScript(script);

  assert.exists(uiSourceCode);
  return uiSourceCode;
}

async function addStyleSheet(
    helper: Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageHelper,
    cssModel: SDK.CSSModel.CSSModel,
    url: Platform.DevToolsPath.UrlString): Promise<Workspace.UISourceCode.UISourceCode> {
  const styleSheetAddedSpy = sinon.stub(helper, 'styleSheetAddedForTest');
  const styleSheetAddedDonePromise = expectCall(styleSheetAddedSpy);
  const header: Protocol.CSS.CSSStyleSheetHeader = {
    styleSheetId: 'styleSheet' as Protocol.CSS.StyleSheetId,
    frameId: 'frameId' as Protocol.Page.FrameId,
    sourceURL: url,
    origin: Protocol.CSS.StyleSheetOrigin.Regular,
    title: '',
    disabled: false,
    isInline: false,
    isMutable: false,
    isConstructed: false,
    startLine: 0,
    startColumn: 0,
    length: 1,
    endLine: 3,
    endColumn: 3,
  };
  cssModel.styleSheetAdded(header);
  await styleSheetAddedDonePromise;
  styleSheetAddedSpy.restore();
  await Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().pendingLiveLocationChangesPromise();

  const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url);
  assert.exists(uiSourceCode);
  return uiSourceCode;
}

describeWithMockConnection('PresentationConsoleMessageHelper', () => {
  const url = 'http://example.test/test.css' as Platform.DevToolsPath.UrlString;
  let helper: Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageHelper;
  let executionContext: SDK.RuntimeModel.ExecutionContext;
  let cssModel: SDK.CSSModel.CSSModel;

  beforeEach(() => {
    executionContext = new MockExecutionContext(createTarget());
    const {debuggerModel} = executionContext;
    assert.exists(debuggerModel);
    helper = new Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageHelper();
    helper.setDebuggerModel(debuggerModel);

    const target = executionContext.target();
    const targetCSSModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(targetCSSModel);
    cssModel = targetCSSModel;
    helper.setCSSModel(cssModel);

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = target.targetManager();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(
        {forceNew: true, resourceMapping, targetManager});
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({forceNew: true, resourceMapping, targetManager});
  });

  it('attaches messages correctly when the events are ordered:  uiSourceCode, message, script', async () => {
    const uiSourceCode = await addUISourceCode(helper, url);
    const message = await addMessage(helper, executionContext.target(), url);

    assert.strictEqual(uiSourceCode.messages().size, 1);
    assert.strictEqual(Array.from(uiSourceCode.messages().values())[0].text(), message.messageText);

    const scriptUISourceCode = await addScript(helper, executionContext.debuggerModel, executionContext, url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  message, uiSourceCode, script', async () => {
    const message = await addMessage(helper, executionContext.target(), url);
    const uiSourceCode = await addUISourceCode(helper, url);

    assert.strictEqual(uiSourceCode.messages().size, 1);
    assert.strictEqual(Array.from(uiSourceCode.messages().values())[0].text(), message.messageText);

    const scriptUISourceCode = await addScript(helper, executionContext.debuggerModel, executionContext, url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  message, script, uiSourceCode', async () => {
    const message = await addMessage(helper, executionContext.target(), url);
    const scriptUISourceCode = await addScript(helper, executionContext.debuggerModel, executionContext, url);

    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);

    const uiSourceCode = await addUISourceCode(helper, url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  uiSourceCode, script, message', async () => {
    const uiSourceCode = await addUISourceCode(helper, url);
    const scriptUISourceCode = await addScript(helper, executionContext.debuggerModel, executionContext, url);
    const message = await addMessage(helper, executionContext.target(), url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  script, uiSourceCode, message', async () => {
    const scriptUISourceCode = await addScript(helper, executionContext.debuggerModel, executionContext, url);
    const uiSourceCode = await addUISourceCode(helper, url);
    const message = await addMessage(helper, executionContext.target(), url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  script, message, uiSourceCode', async () => {
    const scriptUISourceCode = await addScript(helper, executionContext.debuggerModel, executionContext, url);
    const message = await addMessage(helper, executionContext.target(), url);
    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);

    const uiSourceCode = await addUISourceCode(helper, url);
    assert.strictEqual(uiSourceCode.messages().size, 0);
  });

  it('attaches messages correctly when the events are ordered:  uiSourceCode, message, styleSheet', async () => {
    const uiSourceCode = await addUISourceCode(helper, url);
    const message = await addMessage(helper, executionContext.target(), url);

    assert.strictEqual(uiSourceCode.messages().size, 1);
    assert.strictEqual(Array.from(uiSourceCode.messages().values())[0].text(), message.messageText);

    const styleSheetUISourceCode = await addStyleSheet(helper, cssModel, url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  message, uiSourceCode, styleSheet', async () => {
    const message = await addMessage(helper, executionContext.target(), url);
    const uiSourceCode = await addUISourceCode(helper, url);

    assert.strictEqual(uiSourceCode.messages().size, 1);
    assert.strictEqual(Array.from(uiSourceCode.messages().values())[0].text(), message.messageText);

    const styleSheetUISourceCode = await addStyleSheet(helper, cssModel, url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  message, styleSheet, uiSourceCode', async () => {
    const message = await addMessage(helper, executionContext.target(), url);
    const styleSheetUISourceCode = await addStyleSheet(helper, cssModel, url);

    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);

    const uiSourceCode = await addUISourceCode(helper, url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  uiSourceCode, styleSheet, message', async () => {
    const uiSourceCode = await addUISourceCode(helper, url);
    const styleSheetUISourceCode = await addStyleSheet(helper, cssModel, url);
    const message = await addMessage(helper, executionContext.target(), url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  styleSheet, uiSourceCode, message', async () => {
    const styleSheetUISourceCode = await addStyleSheet(helper, cssModel, url);
    const uiSourceCode = await addUISourceCode(helper, url);
    const message = await addMessage(helper, executionContext.target(), url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  styleSheet, message, uiSourceCode', async () => {
    const styleSheetUISourceCode = await addStyleSheet(helper, cssModel, url);
    const message = await addMessage(helper, executionContext.target(), url);
    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);

    const uiSourceCode = await addUISourceCode(helper, url);
    assert.strictEqual(uiSourceCode.messages().size, 0);
  });
});
