// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

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
      conversationContext: null,
      getExecutionContextNode: () => element,
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

  it('returns error when execution context node is missing', async () => {
    const tool = new AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool();
    const context = {
      conversationContext: null,
      getExecutionContextNode: () => null,
      execJs: sinon.stub(),
      changeManager: new AiAssistance.ChangeManager.ChangeManager(),
      createExtensionScope: sinon.stub(),
    };

    const response = await tool.handler({
      explanation: 'Check element',
      title: 'Title',
      code: 'console.log("hello")',
    },
                                        context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Could not find the context node for execution.');
  });

  it('returns error when user denies execution', async () => {
    const tool = new AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool();
    const context = {
      conversationContext: null,
      getExecutionContextNode: () => element,
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
      conversationContext: null,
      getExecutionContextNode: () => element,
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
         conversationContext: null,
         getExecutionContextNode: () => element,
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
      conversationContext: null,
      getExecutionContextNode: () => element,
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

  describe('timer cleanup', () => {
    let clock: sinon.SinonFakeTimers;
    beforeEach(() => {
      clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
    });

    afterEach(() => {
      clock.restore();
    });

    it('clears the timeout after execution completes', async () => {
      const tool = new AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool();
      const mockExecJs = sinon.stub().resolves('{"success": true}');
      const mockScope = {
        install: sinon.stub().resolves(),
        uninstall: sinon.stub().resolves(),
      };

      const context = {
        conversationContext: null,
        getExecutionContextNode: () => element,
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
      assert.strictEqual(clock.countTimers(), 0);
    });

    it('clears the timeout after execution throws an error', async () => {
      const tool = new AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool();
      const mockExecJs = sinon.stub().rejects(new Error('some execution error'));
      const mockScope = {
        install: sinon.stub().resolves(),
        uninstall: sinon.stub().resolves(),
      };

      const context = {
        conversationContext: null,
        getExecutionContextNode: () => element,
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
      assert.strictEqual(clock.countTimers(), 0);
    });

    it('handles script timeout and returns error', async () => {
      const tool = new AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool();
      let resolveMockPromise: (value: string) => void = () => {};
      const mockPromise = new Promise<string>(resolve => {
        resolveMockPromise = resolve;
      });
      const mockExecJs = sinon.stub().returns(mockPromise);
      const mockScope = {
        install: sinon.stub().resolves(),
        uninstall: sinon.stub().resolves(),
      };

      const context = {
        conversationContext: null,
        getExecutionContextNode: () => element,
        execJs: mockExecJs,
        changeManager: new AiAssistance.ChangeManager.ChangeManager(),
        createExtensionScope: sinon.stub().returns(mockScope),
      };

      const responsePromise = tool.handler({
        explanation: 'Check element',
        title: 'Title',
        code: 'console.log("hello")',
      },
                                           context);

      // Fast-forward time to trigger the timeout
      await clock.tickAsync(5000);

      const response = await responsePromise;
      assertIsResult(response);
      assert.strictEqual(response.result, 'Error: Script execution exceeded the maximum allowed time.');
      assert.strictEqual(clock.countTimers(), 0);
      resolveMockPromise('done');
    });
  });
});
