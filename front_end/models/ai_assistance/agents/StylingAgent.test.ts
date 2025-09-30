// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {
  describeWithEnvironment,
  restoreUserAgentForTesting,
  setUserAgentForTesting,
  updateHostConfig,
} from '../../../testing/EnvironmentHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import * as AiAssistance from '../ai_assistance.js';

const {StylingAgent, ErrorType} = AiAssistance;

describeWithEnvironment('StylingAgent', () => {
  function mockHostConfig(
      modelId?: string, temperature?: number, userTier?: string,
      executionMode?: Root.Runtime.HostConfigFreestylerExecutionMode, multimodal?: boolean) {
    updateHostConfig({
      devToolsFreestyler: {
        modelId,
        temperature,
        userTier,
        executionMode,
        multimodal,
      },
    });
  }

  function createExtensionScope() {
    return {
      async install() {

      },
      async uninstall() {

      },
    };
  }

  let element: sinon.SinonStubbedInstance<SDK.DOMModel.DOMNode>;
  let target: sinon.SinonStubbedInstance<SDK.Target.Target>;
  let domModel: sinon.SinonStubbedInstance<SDK.DOMModel.DOMModel>;

  beforeEach(() => {
    mockHostConfig();
    target = sinon.createStubInstance(SDK.Target.Target);
    target.model.returns(null);

    domModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);
    domModel.target.returns(target);

    element = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    element.domModel.returns(domModel);
    element.backendNodeId.returns(99 as unknown as ReturnType<SDK.DOMModel.DOMNode['backendNodeId']>);
  });

  let snapshotTester: SnapshotTester;
  before(async () => {
    snapshotTester = new SnapshotTester(import.meta);
    await snapshotTester.load();
  });

  after(async () => {
    await snapshotTester.finish();
  });

  describe('describeElement', () => {
    it('should describe an element with no children, siblings, or parent', async function() {
      element.simpleSelector.returns('div#myElement');
      element.getChildNodesPromise.resolves(null);

      const result = await StylingAgent.describeElement(element);

      snapshotTester.assert(this, result);
    });

    it('should describe an element with child element and text nodes', async function() {
      const childNodes: Array<sinon.SinonStubbedInstance<SDK.DOMModel.DOMNode>> = [
        sinon.createStubInstance(SDK.DOMModel.DOMNode),
        sinon.createStubInstance(SDK.DOMModel.DOMNode),
        sinon.createStubInstance(SDK.DOMModel.DOMNode),
      ];
      childNodes[0].nodeType.returns(Node.ELEMENT_NODE);
      childNodes[0].simpleSelector.returns('span.child1');
      childNodes[1].nodeType.returns(Node.TEXT_NODE);
      childNodes[2].nodeType.returns(Node.ELEMENT_NODE);
      childNodes[2].simpleSelector.returns('span.child2');

      element.simpleSelector.returns('div#parentElement');
      element.getChildNodesPromise.resolves(childNodes);
      element.nextSibling = null;
      element.previousSibling = null;
      element.parentNode = null;

      const result = await StylingAgent.describeElement(element);
      snapshotTester.assert(this, result);
    });

    it('should describe an element with siblings and a parent', async function() {
      const nextSibling = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      nextSibling.nodeType.returns(Node.ELEMENT_NODE);
      const previousSibling = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      previousSibling.nodeType.returns(Node.TEXT_NODE);

      const parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      parentNode.simpleSelector.returns('div#grandparentElement');
      const parentChildNodes: Array<sinon.SinonStubbedInstance<SDK.DOMModel.DOMNode>> = [
        sinon.createStubInstance(SDK.DOMModel.DOMNode),
        sinon.createStubInstance(SDK.DOMModel.DOMNode),
      ];
      parentChildNodes[0].nodeType.returns(Node.ELEMENT_NODE);
      parentChildNodes[0].simpleSelector.returns('span.sibling1');
      parentChildNodes[1].nodeType.returns(Node.TEXT_NODE);
      parentNode.getChildNodesPromise.resolves(parentChildNodes);

      element.simpleSelector.returns('div#parentElement');
      element.getChildNodesPromise.resolves(null);
      element.nextSibling = nextSibling;
      element.previousSibling = previousSibling;
      element.parentNode = parentNode;

      const result = await StylingAgent.describeElement(element);
      snapshotTester.assert(this, result);
    });
  });

  describe('buildRequest', () => {
    beforeEach(() => {
      sinon.stub(crypto, 'randomUUID').returns('sessionId' as `${string}-${string}-${string}-${string}-${string}`);
    });

    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      const agent = new StylingAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.model_id,
          'test model',
      );
    });

    it('builds a request with a temperature', async () => {
      mockHostConfig('test model', 1);
      const agent = new StylingAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.temperature,
          1,
      );
    });

    it('builds a request with a user tier', async () => {
      mockHostConfig('test model', 1, 'PUBLIC');
      const agent = new StylingAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).metadata?.user_tier,
          3,
      );
    });

    it('structure matches the snapshot', async function() {
      mockHostConfig('test model');
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[{
          explanation: 'answer',
        }]]),
        serverSideLoggingEnabled: true,
      });
      await Array.fromAsync(agent.run('question', {selected: null}));

      setUserAgentForTesting();
      try {
        snapshotTester.assert(
            this,
            JSON.stringify(
                agent.buildRequest(
                    {
                      text: 'test input',
                    },
                    Host.AidaClient.Role.USER),
                null, 2));
      } finally {
        restoreUserAgentForTesting();
      }
    });

    it('builds a request with aborted query in history before a real request', async function() {
      const execJs = sinon.mock().once();
      execJs.onCall(0).returns('result2');
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([
          [{
            functionCalls: [{name: 'executeJavaScript', args: {title: 'title2', thought: 'thought2', code: 'action2'}}],
            explanation: '',
          }],
          [{explanation: 'answer2'}]
        ]),
        createExtensionScope,
        execJs,
      });

      sinon.stub(StylingAgent, 'describeElement').resolves('element-description');

      const controller = new AbortController();
      controller.abort();
      await Array.fromAsync(agent.run('test', {
        selected: new AiAssistance.NodeContext(element),
        signal: controller.signal,
      }));
      await Array.fromAsync(agent.run('test2', {selected: new AiAssistance.NodeContext(element)}));

      const request = agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER);
      assert.deepEqual(request.current_message?.parts[0], {text: 'test input'});
      snapshotTester.assert(this, JSON.stringify(request.historical_contexts, null, 2));
    });
  });

  describe('run', () => {
    describe('side effect handling', () => {
      it('calls confirmSideEffect when the code execution contains a side effect', async () => {
        const promise = Promise.withResolvers();
        const stub = sinon.stub().returns(promise);
        const execJs =
            sinon.mock().throws(new AiAssistance.SideEffectError('EvalError: Possible side-effect in debug-evaluate'));
        const agent = new StylingAgent({
          aidaClient: mockAidaClient([
            [{
              functionCalls: [{name: 'executeJavaScript', args: {code: '$0.style.backgroundColor = \'red\''}}],
              explanation: '',
            }],
            [{
              explanation: 'This is the answer',
            }]
          ]),
          createExtensionScope,
          confirmSideEffectForTest: stub,
          execJs,

        });

        promise.resolve(true);
        await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));

        sinon.assert.match(execJs.getCall(0).args[1], sinon.match({throwOnSideEffect: true}));
      });

      it('calls execJs with allowing side effects when confirmSideEffect resolves to true', async () => {
        const promise = Promise.withResolvers();
        const stub = sinon.stub().returns(promise);
        const execJs = sinon.mock().twice();
        execJs.onCall(0).throws(new AiAssistance.SideEffectError('EvalError: Possible side-effect in debug-evaluate'));
        execJs.onCall(1).resolves('value');
        const agent = new StylingAgent({
          aidaClient: mockAidaClient([
            [{
              functionCalls: [{name: 'executeJavaScript', args: {code: '$0.style.backgroundColor = \'red\''}}],
              explanation: '',
            }],
            [{
              explanation: 'This is the answer',
            }]
          ]),
          createExtensionScope,
          confirmSideEffectForTest: stub,
          execJs,

        });
        promise.resolve(true);
        await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));

        assert.lengthOf(execJs.getCalls(), 2);
        sinon.assert.match(execJs.getCall(1).args[1], sinon.match({throwOnSideEffect: false}));
      });

      it('returns side effect error when confirmSideEffect resolves to false', async () => {
        const promise = Promise.withResolvers();
        const stub = sinon.stub().returns(promise);
        const execJs = sinon.mock().once();
        execJs.onCall(0).throws(new AiAssistance.SideEffectError('EvalError: Possible side-effect in debug-evaluate'));
        const agent = new StylingAgent({
          aidaClient: mockAidaClient([
            [{
              functionCalls: [{name: 'executeJavaScript', args: {code: '$0.style.backgroundColor = \'red\''}}],
              explanation: '',
            }],
            [{
              explanation: 'This is the answer',
            }]
          ]),
          createExtensionScope,
          confirmSideEffectForTest: stub,
          execJs,

        });
        promise.resolve(false);
        const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
        const actionStep = responses.findLast(response => response.type === AiAssistance.ResponseType.ACTION)!;

        assert.strictEqual(actionStep.output, 'Error: User denied code execution with side effects.');
        assert.lengthOf(execJs.getCalls(), 1);
      });

      it('returns error when side effect is aborted', async () => {
        const selected = new AiAssistance.NodeContext(element);
        const execJs = sinon.mock().once().throws(
            new AiAssistance.SideEffectError('EvalError: Possible side-effect in debug-evaluate'));
        const sideEffectConfirmationPromise = Promise.withResolvers();
        const agent = new StylingAgent({
          aidaClient: mockAidaClient([[{
            functionCalls: [{name: 'executeJavaScript', args: {code: '$0.style.backgroundColor = \'red\''}}],
            explanation: '',
          }]]),
          createExtensionScope,
          confirmSideEffectForTest: sinon.stub().returns(sideEffectConfirmationPromise),
          execJs,
        });

        const responses: AiAssistance.ResponseData[] = [];
        const controller = new AbortController();
        for await (const result of agent.run('test', {selected, signal: controller.signal})) {
          responses.push(result);
          if (result.type === 'side-effect') {
            // Initial code invocation resulting in a side-effect
            // happened.
            sinon.assert.calledOnce(execJs);
            // Emulate abort when waiting for the side-effect confirmation.
            controller.abort();
          }
        }

        const errorStep = responses.at(-1) as AiAssistance.ErrorResponse;
        assert.exists(errorStep);
        assert.strictEqual(errorStep.error, ErrorType.ABORT);
        assert.isFalse(await sideEffectConfirmationPromise.promise);
      });
    });

    describe('long `Observation` text handling', () => {
      it('errors with too long input', async () => {
        const execJs = sinon.mock().returns(new Array(10_000).fill('<div>...</div>').join());
        const agent = new StylingAgent({
          aidaClient: mockAidaClient([
            [{
              functionCalls: [{
                name: 'executeJavaScript',
                args: {code: '$0.style.backgroundColor = \'red\';'},
              }],
              explanation: '',
            }],
            [{
              explanation: 'This is the answer',
            }]
          ]),
          createExtensionScope,
          execJs,
        });

        const result = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
        const actionSteps = result.filter(step => {
          return step.type === AiAssistance.ResponseType.ACTION;
        });
        assert.lengthOf(actionSteps, 1, 'Found non or multiple action steps');
        const actionStep = actionSteps.at(0)!;
        assert(actionStep.output!.includes('Error: Output exceeded the maximum allowed length.'));
      });
    });

    it('generates an answer immediately', async function() {
      const execJs = sinon.spy();
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[{explanation: 'this is the answer'}]]),
        execJs,
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
      snapshotTester.assert(this, JSON.stringify(responses, null, 2));
      sinon.assert.notCalled(execJs);
    });

    it('generates an answer immediately with correct historical contexts in the new request', async function() {
      const execJs = sinon.spy();
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[{explanation: 'this is the answer'}]]),
        execJs,
      });

      await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
      snapshotTester.assert(
          this, JSON.stringify(agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts, null, 2));
    });

    it('correctly handles historical_contexts in AIDA requests', async function() {
      const execJs = sinon.mock().once();
      execJs.onCall(0).returns('test data');
      const aidaClient = mockAidaClient([
        [{
          functionCalls: [{
            name: 'executeJavaScript',
            args: {code: 'const data = {"test": "observation"}', thought: 'I am thinking.', title: 'thinking'},
          }],
          explanation: '',
        }],
        [{
          explanation: 'this is the actual answer',
        }]
      ]);
      const agent = new StylingAgent({
        aidaClient,
        createExtensionScope,
        execJs,
      });

      await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));

      const requests: Host.AidaClient.DoConversationRequest[] =
          (aidaClient.doConversation as sinon.SinonStub).args.map(arg => arg[0]);

      const snapshot = [];

      assert.lengthOf(requests, 2, 'Unexpected number of AIDA requests');
      assert.isUndefined(requests[0].historical_contexts, 'Unexpected historical contexts in the initial request');
      assert.exists(requests[0].current_message);
      assert.lengthOf(requests[0].current_message.parts, 1);
      snapshot.push(requests[0].current_message.parts[0]);
      assert.strictEqual(requests[0].current_message.role, Host.AidaClient.Role.USER);
      snapshot.push(requests[1].historical_contexts);
      snapshotTester.assert(this, JSON.stringify(snapshot, null, 2));
      assert.exists(requests[1].current_message);
      assert.lengthOf(requests[1].current_message.parts, 1);
      assert.deepEqual(
          requests[1].current_message.parts[0], {
            functionResponse: {
              name: 'executeJavaScript',
              response: {
                result: 'test data',
              }
            }
          },
          'Unexpected input in the follow-up request');
    });

    it('generates an rpcId for the answer', async function() {
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[{
          explanation: 'this is the answer',
          metadata: {
            rpcGlobalId: 123,
          },
        }]]),
        execJs: sinon.spy(),
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
      snapshotTester.assert(this, JSON.stringify(responses, null, 2));
    });

    it('throws an error based on the attribution metadata including RecitationAction.BLOCK', async function() {
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[
          {
            explanation: 'this is the partial answer',
          },
          {
            explanation: 'this is the partial answer and now it\'s complete',
            metadata: {
              attributionMetadata: {
                attributionAction: Host.AidaClient.RecitationAction.BLOCK,
                citations: [],
              },
            },
          }
        ]]),
        execJs: sinon.spy(),
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
      snapshotTester.assert(this, JSON.stringify(responses, null, 2));
    });

    it('does not throw an error based on attribution metadata not including RecitationAction.BLOCK', async function() {
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[{
          explanation: 'this is the answer',
          metadata: {
            rpcGlobalId: 123,
            attributionMetadata: {
              attributionAction: Host.AidaClient.RecitationAction.ACTION_UNSPECIFIED,
              citations: [],
            },
          },
        }]]),
        execJs: sinon.spy(),

      });

      const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
      snapshotTester.assert(this, JSON.stringify(responses, null, 2));
    });

    it('generates a response if nothing is returned', async function() {
      const execJs = sinon.spy();
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[{explanation: ''}]]),
        execJs,
      });
      const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
      snapshotTester.assert(this, JSON.stringify(responses, null, 2));
      sinon.assert.notCalled(execJs);
      assert.isUndefined(agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts);
    });

    it('generates an action response if action and answer both present', async function() {
      const execJs = sinon.mock().once();
      execJs.onCall(0).returns('hello');
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([
          [{
            functionCalls: [{
              name: 'executeJavaScript',
              args: {thought: 'I am thinking.', code: 'console.log(\'hello\');'},
            }],
            explanation: 'this is the answer',
          }],
          [{
            explanation: 'this is the actual answer',
            metadata: {},
          }]
        ]),
        createExtensionScope,
        execJs,

      });
      const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
      snapshotTester.assert(this, JSON.stringify(responses, null, 2));
      sinon.assert.calledOnce(execJs);
    });

    it('generates history for multiple actions', async function() {
      const execJs = sinon.spy(async () => 'undefined');
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([
          [{
            functionCalls: [{
              name: 'executeJavaScript',
              args: {thought: 'thought 1', title: 'test', code: 'console.log(\'test\')'},
            }],
            explanation: '',
          }],
          [{
            functionCalls: [{
              name: 'executeJavaScript',
              args: {thought: 'thought 2', title: 'test', code: 'console.log(\'test\')'},
            }],
            explanation: '',
          }],
          [{
            functionCalls: [{
              name: 'executeJavaScript',
              args: {thought: 'thought 3', title: 'test', code: 'console.log(\'test\')'},
            }],
            explanation: '',
          }],
          [{explanation: 'this is the answer'}]
        ]),
        createExtensionScope,
        execJs,

      });

      await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));

      snapshotTester.assert(
          this, JSON.stringify(agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts, null, 2));
    });

    it('stops when aborted', async () => {
      const execJs = sinon.spy();
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([
          [{
            functionCalls: [{
              name: 'executeJavaScript',
              args: {thought: 'thought 1', title: 'test', code: 'console.log(\'test\')'},
            }],
            explanation: '',
          }],
          [{
            functionCalls: [{
              name: 'executeJavaScript',
              args: {thought: 'thought 2', title: 'test', code: 'console.log(\'test\')'},
            }],
            explanation: '',
          }],
          [{
            functionCalls: [{
              name: 'executeJavaScript',
              args: {thought: 'thought 3', title: 'test', code: 'console.log(\'test\')'},
            }],
            explanation: '',
          }],
          [{explanation: 'this is the answer'}]
        ]),
        createExtensionScope,
        execJs,
      });

      const controller = new AbortController();
      controller.abort();
      await Array.fromAsync(
          agent.run('test', {selected: new AiAssistance.NodeContext(element), signal: controller.signal}));

      assert.isUndefined(agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts);
    });
  });

  describe('enhanceQuery', () => {
    const agent = new StylingAgent({
      aidaClient: mockAidaClient(),
    });

    beforeEach(() => {
      element.simpleSelector.returns('div#myElement');
      element.getChildNodesPromise.resolves(null);
    });

    it('does not add multimodal input evaluation prompt when multimodal is disabled', async function() {
      mockHostConfig('test model');
      const enhancedQuery = await agent.enhanceQuery(
          'test query', new AiAssistance.NodeContext(element), AiAssistance.MultimodalInputType.SCREENSHOT);

      snapshotTester.assert(this, enhancedQuery);
    });

    it('does not add multimodal input evaluation prompt when multimodal is enabled but multimodalInputType is missing',
       async function() {
         mockHostConfig('test model', 1, 'PUBLIC', Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS, true);
         const enhancedQuery = await agent.enhanceQuery('test query', new AiAssistance.NodeContext(element));

         snapshotTester.assert(this, enhancedQuery);
       });

    it('adds multimodal input evaluation prompt when multimodal is enabled and multimodalInputType is screenshot',
       async function() {
         mockHostConfig('test model', 1, 'PUBLIC', Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS, true);
         const enhancedQuery = await agent.enhanceQuery(
             'test query', new AiAssistance.NodeContext(element), AiAssistance.MultimodalInputType.SCREENSHOT);

         snapshotTester.assert(this, enhancedQuery);
       });

    it('adds multimodal input evaluation prompt when multimodal is enabled and multimodalInputType is uploaded image',
       async function() {
         mockHostConfig('test model', 1, 'PUBLIC', Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS, true);
         const enhancedQuery = await agent.enhanceQuery(
             'test query', new AiAssistance.NodeContext(element), AiAssistance.MultimodalInputType.UPLOADED_IMAGE);

         snapshotTester.assert(this, enhancedQuery);
       });
  });

  describe('HostConfigFreestylerExecutionMode', () => {
    function getMockClient() {
      return mockAidaClient([
        [{
          functionCalls: [{name: 'executeJavaScript', args: {code: '$0.style.backgroundColor = \'red\''}}],
          explanation: '',
        }],
        [{
          explanation: 'This is the answer',
        }]
      ]);
    }

    describe('NO_SCRIPTS', () => {
      beforeEach(() => {
        mockHostConfig(undefined, undefined, undefined, Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS);
      });

      it('returns an error if scripts are disabled', async () => {
        const execJs = sinon.mock();
        const agent = new StylingAgent({
          aidaClient: getMockClient(),
          createExtensionScope,
          execJs,
        });
        const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
        const actionStep = responses.find(response => response.type === AiAssistance.ResponseType.ACTION)!;
        assert.strictEqual(actionStep.output, 'Error: JavaScript execution is currently disabled.');
        assert.lengthOf(execJs.getCalls(), 0);
      });
    });

    describe('SIDE_EFFECT_FREE_SCRIPTS_ONLY', () => {
      beforeEach(() => {
        mockHostConfig(
            undefined, undefined, undefined,
            Root.Runtime.HostConfigFreestylerExecutionMode.SIDE_EFFECT_FREE_SCRIPTS_ONLY);
      });

      it('returns an error if a script causes a side effect', async () => {
        const execJs =
            sinon.mock().throws(new AiAssistance.SideEffectError('EvalError: Possible side-effect in debug-evaluate'));
        const agent = new StylingAgent({
          aidaClient: getMockClient(),
          createExtensionScope,
          execJs,
        });
        const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
        const actionStep = responses.find(response => response.type === AiAssistance.ResponseType.ACTION)!;
        assert.strictEqual(
            actionStep.output, 'Error: JavaScript execution that modifies the page is currently disabled.');
        assert.lengthOf(execJs.getCalls(), 1);
      });
    });
  });
});
