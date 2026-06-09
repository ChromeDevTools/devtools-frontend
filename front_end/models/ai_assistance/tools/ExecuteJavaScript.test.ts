// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {
  assertIsError,
  assertIsResult,
  assertRequiresApproval,
} from '../../../testing/AiAssistanceHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('ExecuteJavaScriptTool', () => {
  let element: sinon.SinonStubbedInstance<SDK.DOMModel.DOMNode>;
  let target: sinon.SinonStubbedInstance<SDK.Target.Target>;
  let domModel: sinon.SinonStubbedInstance<SDK.DOMModel.DOMModel>;

  beforeEach(() => {
    target = sinon.createStubInstance(SDK.Target.Target);
    target.model.returns(null);

    domModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);
    domModel.target.returns(target);

    element = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    element.domModel.returns(domModel);
    element.backendNodeId.returns(99 as unknown as ReturnType<SDK.DOMModel.DOMNode['backendNodeId']>);
  });

  it('successfully executes JS code', async () => {
    const tool = new AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool();
    const mockExecJs = sinon.stub().resolves('{"success": true}');
    const mockScope = {
      install: sinon.stub().resolves(),
      uninstall: sinon.stub().resolves(),
    };

    const context = {
      conversationContext: new AiAssistance.DOMNodeContext.DOMNodeContext(element),
      execJs: mockExecJs,
      changeManager: new AiAssistance.ChangeManager.ChangeManager(),
      createExtensionScope: sinon.stub().returns(mockScope),
    };

    const response = await tool.handler({
      explanation: 'Check element',
      title: 'Title',
      code: 'console.log("hello")',
    },
                                        context);

    assertIsResult(response);
    assert.strictEqual(response.result, '{"success": true}');
    sinon.assert.calledOnce(mockExecJs);
  });

  it('returns error when selected element is missing', async () => {
    const tool = new AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool();
    const context = {
      conversationContext: null,
    };

    const response = await tool.handler({
      explanation: 'Check element',
      title: 'Title',
      code: 'console.log("hello")',
    },
                                        context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Could not find the currently selected element.');
  });

  it('returns error when changeManager or createExtensionScope is missing from context', async () => {
    const tool = new AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool();
    const context = {
      conversationContext: new AiAssistance.DOMNodeContext.DOMNodeContext(element),
    };

    const response = await tool.handler({
      explanation: 'Check element',
      title: 'Title',
      code: 'console.log("hello")',
    },
                                        context);

    assertIsError(response);
    assert.strictEqual(response.error,
                       'Internal Error: Required change manager or extension scope creator is missing.');
  });

  it('returns error when user denies execution', async () => {
    const tool = new AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool();
    const context = {
      conversationContext: new AiAssistance.DOMNodeContext.DOMNodeContext(element),
      execJs: sinon.stub(),
      changeManager: new AiAssistance.ChangeManager.ChangeManager(),
      createExtensionScope: sinon.stub().returns({
        install: sinon.stub().resolves(),
        uninstall: sinon.stub().resolves(),
      }),
    };

    const response = await tool.handler({
      explanation: 'Check element',
      title: 'Title',
      code: 'console.log("hello")',
    },
                                        context, {approved: false});

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: User denied code execution with side effects.');
  });

  it('returns error when JS execution is disabled by Host Config (NO_SCRIPTS)', async () => {
    updateHostConfig({
      devToolsFreestyler: {
        executionMode: Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS,
      },
    });

    const tool = new AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool();
    const context = {
      conversationContext: new AiAssistance.DOMNodeContext.DOMNodeContext(element),
      execJs: sinon.stub(),
      changeManager: new AiAssistance.ChangeManager.ChangeManager(),
      createExtensionScope: sinon.stub().returns({
        install: sinon.stub().resolves(),
        uninstall: sinon.stub().resolves(),
      }),
    };

    const response = await tool.handler({
      explanation: 'Check element',
      title: 'Title',
      code: 'console.log("hello")',
    },
                                        context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: JavaScript execution is currently disabled.');
  });

  it('returns error when JS execution modifying page is disabled by Host Config (SIDE_EFFECT_FREE_SCRIPTS_ONLY)',
     async () => {
       updateHostConfig({
         devToolsFreestyler: {
           executionMode: Root.Runtime.HostConfigFreestylerExecutionMode.SIDE_EFFECT_FREE_SCRIPTS_ONLY,
         },
       });

       const tool = new AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool();
       const mockExecJs = sinon.stub().rejects(new AiAssistance.EvaluateAction.SideEffectError('side effect error'));
       const mockScope = {
         install: sinon.stub().resolves(),
         uninstall: sinon.stub().resolves(),
       };
       const context = {
         conversationContext: new AiAssistance.DOMNodeContext.DOMNodeContext(element),
         execJs: mockExecJs,
         changeManager: new AiAssistance.ChangeManager.ChangeManager(),
         createExtensionScope: sinon.stub().returns(mockScope),
       };

       const response = await tool.handler({
         explanation: 'Check element',
         title: 'Title',
         code: 'console.log("hello")',
       },
                                           context);

       assertIsError(response);
       assert.strictEqual(response.error, 'Error: JavaScript execution that modifies the page is currently disabled.');
     });

  it('requires approval when side effect is detected', async () => {
    const tool = new AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool();
    const mockExecJs = sinon.stub().rejects(new AiAssistance.EvaluateAction.SideEffectError('side effect error'));
    const mockScope = {
      install: sinon.stub().resolves(),
      uninstall: sinon.stub().resolves(),
    };
    const context = {
      conversationContext: new AiAssistance.DOMNodeContext.DOMNodeContext(element),
      execJs: mockExecJs,
      changeManager: new AiAssistance.ChangeManager.ChangeManager(),
      createExtensionScope: sinon.stub().returns(mockScope),
    };

    const response = await tool.handler({
      explanation: 'Check element',
      title: 'Title',
      code: 'console.log("hello")',
    },
                                        context);

    assertRequiresApproval(response);
    assert.exists(response.description);
  });
});
