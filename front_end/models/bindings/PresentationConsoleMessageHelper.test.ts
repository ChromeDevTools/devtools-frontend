// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {MockExecutionContext} from '../../testing/MockExecutionContext.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

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

async function addUISourceCode(universe: TestUniverse,
                               helper: Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageHelper,
                               url: Platform.DevToolsPath.UrlString): Promise<Workspace.UISourceCode.UISourceCode> {
  const uiSourceCodeAddedSpy = sinon.stub(helper, 'uiSourceCodeAddedForTest');
  const uiSourceCodeAddedDonePromise = expectCall(uiSourceCodeAddedSpy);
  const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
      universe.workspace, 'test-project', Workspace.Workspace.projectTypes.Network, 'test-project', false);
  const uiSourceCode = new Workspace.UISourceCode.UISourceCode(
      project, url, Common.ResourceType.ResourceType.fromMimeType('application/text'));
  project.addUISourceCode(uiSourceCode);

  await uiSourceCodeAddedDonePromise;
  uiSourceCodeAddedSpy.restore();
  return uiSourceCode;
}

async function addScript(
    universe: TestUniverse, helper: Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageHelper,
    debuggerModel: SDK.DebuggerModel.DebuggerModel, executionContext: SDK.RuntimeModel.ExecutionContext,
    url: Platform.DevToolsPath.UrlString): Promise<Workspace.UISourceCode.UISourceCode> {
  const scriptParsedSpy = sinon.stub(helper, 'parsedScriptSourceForTest');
  const parsedScriptSourceDonePromise = expectCall(scriptParsedSpy);
  const script = debuggerModel.parsedScriptSource('scriptId' as Protocol.Runtime.ScriptId, url, 0, 0, 3, 3,
                                                  executionContext.id, '', undefined, undefined, false, false, 0, false,
                                                  null, null, null, null, null, null);

  await parsedScriptSourceDonePromise;
  scriptParsedSpy.restore();
  await universe.debuggerWorkspaceBinding.pendingLiveLocationChangesPromise();

  const uiSourceCode = universe.debuggerWorkspaceBinding.uiSourceCodeForScript(script);

  assert.exists(uiSourceCode);
  return uiSourceCode;
}

async function addStyleSheet(universe: TestUniverse,
                             helper: Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageHelper,
                             cssModel: SDK.CSSModel.CSSModel,
                             url: Platform.DevToolsPath.UrlString): Promise<Workspace.UISourceCode.UISourceCode> {
  const styleSheetAddedSpy = sinon.stub(helper, 'styleSheetAddedForTest');
  const styleSheetAddedDonePromise = expectCall(styleSheetAddedSpy);
  const header: Protocol.CSS.CSSStyleSheetHeader = {
    styleSheetId: 'styleSheet' as Protocol.DOM.StyleSheetId,
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
  await universe.cssWorkspaceBinding.pendingLiveLocationChangesPromise();

  const uiSourceCode = universe.workspace.uiSourceCodeForURL(url);
  assert.exists(uiSourceCode);
  return uiSourceCode;
}

describeWithEnvironment('PresentationConsoleMessageHelper', () => {
  const url = urlString`http://example.test/test.css`;
  let universe: TestUniverse;
  let helper: Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageHelper;
  let executionContext: SDK.RuntimeModel.ExecutionContext;
  let cssModel: SDK.CSSModel.CSSModel;

  beforeEach(() => {
    universe = new TestUniverse();
    const target = universe.createTarget();
    executionContext = new MockExecutionContext(target);
    const {debuggerModel} = executionContext;
    assert.exists(debuggerModel);

    const targetCSSModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(targetCSSModel);
    cssModel = targetCSSModel;

    helper = new Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageHelper(
        universe.workspace, universe.debuggerWorkspaceBinding, universe.cssWorkspaceBinding);
    helper.setDebuggerModel(debuggerModel);
    helper.setCSSModel(cssModel);
  });

  it('attaches messages correctly when the events are ordered:  uiSourceCode, message, script', async () => {
    const uiSourceCode = await addUISourceCode(universe, helper, url);
    const message = await addMessage(helper, executionContext.target(), url);

    assert.strictEqual(uiSourceCode.messages().size, 1);
    assert.strictEqual(Array.from(uiSourceCode.messages().values())[0].text(), message.messageText);

    const scriptUISourceCode = await addScript(universe, helper, executionContext.debuggerModel, executionContext, url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  message, uiSourceCode, script', async () => {
    const message = await addMessage(helper, executionContext.target(), url);
    const uiSourceCode = await addUISourceCode(universe, helper, url);

    assert.strictEqual(uiSourceCode.messages().size, 1);
    assert.strictEqual(Array.from(uiSourceCode.messages().values())[0].text(), message.messageText);

    const scriptUISourceCode = await addScript(universe, helper, executionContext.debuggerModel, executionContext, url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  message, script, uiSourceCode', async () => {
    const message = await addMessage(helper, executionContext.target(), url);
    const scriptUISourceCode = await addScript(universe, helper, executionContext.debuggerModel, executionContext, url);

    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);

    const uiSourceCode = await addUISourceCode(universe, helper, url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  uiSourceCode, script, message', async () => {
    const uiSourceCode = await addUISourceCode(universe, helper, url);
    const scriptUISourceCode = await addScript(universe, helper, executionContext.debuggerModel, executionContext, url);
    const message = await addMessage(helper, executionContext.target(), url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  script, uiSourceCode, message', async () => {
    const scriptUISourceCode = await addScript(universe, helper, executionContext.debuggerModel, executionContext, url);
    const uiSourceCode = await addUISourceCode(universe, helper, url);
    const message = await addMessage(helper, executionContext.target(), url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  script, message, uiSourceCode', async () => {
    const scriptUISourceCode = await addScript(universe, helper, executionContext.debuggerModel, executionContext, url);
    const message = await addMessage(helper, executionContext.target(), url);
    assert.strictEqual(scriptUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(scriptUISourceCode.messages().values())[0].text(), message.messageText);

    const uiSourceCode = await addUISourceCode(universe, helper, url);
    assert.strictEqual(uiSourceCode.messages().size, 0);
  });

  it('attaches messages correctly when the events are ordered:  uiSourceCode, message, styleSheet', async () => {
    const uiSourceCode = await addUISourceCode(universe, helper, url);
    const message = await addMessage(helper, executionContext.target(), url);

    assert.strictEqual(uiSourceCode.messages().size, 1);
    assert.strictEqual(Array.from(uiSourceCode.messages().values())[0].text(), message.messageText);

    const styleSheetUISourceCode = await addStyleSheet(universe, helper, cssModel, url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  message, uiSourceCode, styleSheet', async () => {
    const message = await addMessage(helper, executionContext.target(), url);
    const uiSourceCode = await addUISourceCode(universe, helper, url);

    assert.strictEqual(uiSourceCode.messages().size, 1);
    assert.strictEqual(Array.from(uiSourceCode.messages().values())[0].text(), message.messageText);

    const styleSheetUISourceCode = await addStyleSheet(universe, helper, cssModel, url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  message, styleSheet, uiSourceCode', async () => {
    const message = await addMessage(helper, executionContext.target(), url);
    const styleSheetUISourceCode = await addStyleSheet(universe, helper, cssModel, url);

    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);

    const uiSourceCode = await addUISourceCode(universe, helper, url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  uiSourceCode, styleSheet, message', async () => {
    const uiSourceCode = await addUISourceCode(universe, helper, url);
    const styleSheetUISourceCode = await addStyleSheet(universe, helper, cssModel, url);
    const message = await addMessage(helper, executionContext.target(), url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  styleSheet, uiSourceCode, message', async () => {
    const styleSheetUISourceCode = await addStyleSheet(universe, helper, cssModel, url);
    const uiSourceCode = await addUISourceCode(universe, helper, url);
    const message = await addMessage(helper, executionContext.target(), url);

    assert.strictEqual(uiSourceCode.messages().size, 0);
    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);
  });

  it('attaches messages correctly when the events are ordered:  styleSheet, message, uiSourceCode', async () => {
    const styleSheetUISourceCode = await addStyleSheet(universe, helper, cssModel, url);
    const message = await addMessage(helper, executionContext.target(), url);
    assert.strictEqual(styleSheetUISourceCode.messages().size, 1);
    assert.strictEqual(Array.from(styleSheetUISourceCode.messages().values())[0].text(), message.messageText);

    const uiSourceCode = await addUISourceCode(universe, helper, url);
    assert.strictEqual(uiSourceCode.messages().size, 0);
  });
});
