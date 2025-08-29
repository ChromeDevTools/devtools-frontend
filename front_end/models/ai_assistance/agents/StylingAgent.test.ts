// Copyright 2024 The Chromium Authors. All rights reserved.
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
  beforeEach(() => {
    mockHostConfig();
    element = sinon.createStubInstance(SDK.DOMModel.DOMNode);
  });

  describe('describeElement', () => {
    it('should describe an element with no children, siblings, or parent', async () => {
      element.simpleSelector.returns('div#myElement');
      element.getChildNodesPromise.resolves(null);

      const result = await StylingAgent.describeElement(element);

      assert.strictEqual(result, '* Its selector is `div#myElement`');
    });

    it('should describe an element with child element and text nodes', async () => {
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
      const expectedOutput = `* Its selector is \`div#parentElement\`
* It has 2 child element nodes: \`span.child1\`, \`span.child2\`
* It only has 1 child text node`;

      assert.strictEqual(result, expectedOutput);
    });

    it('should describe an element with siblings and a parent', async () => {
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
      const expectedOutput = `* Its selector is \`div#parentElement\`
* It has a next sibling and it is an element node
* It has a previous sibling and it is a non element node
* Its parent's selector is \`div#grandparentElement\`
* Its parent is a non element node
* Its parent has only 1 child element node
* Its parent has only 1 child text node`;

      assert.strictEqual(result, expectedOutput);
    });
  });

  describe('buildRequest', () => {
    beforeEach(() => {
      sinon.stub(crypto, 'randomUUID').returns('sessionId' as `${string}-${string}-${string}-${string}-${string}`);
    });

    afterEach(() => {
      sinon.restore();
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

    it('structure matches the snapshot', async () => {
      mockHostConfig('test model');
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[{
          explanation: 'answer',
        }]]),
        serverSideLoggingEnabled: true,
      });
      await Array.fromAsync(agent.run('question', {selected: null}));

      setUserAgentForTesting();
      assert.deepEqual(
          agent.buildRequest(
              {
                text: 'test input',
              },
              Host.AidaClient.Role.USER),

          {
            client: 'CHROME_DEVTOOLS',
            current_message: {parts: [{text: 'test input'}], role: 1},
            historical_contexts: [{parts: [{text: 'QUERY: question'}], role: 1}, {parts: [{text: 'answer'}], role: 2}],
            function_declarations: [{
              name: 'executeJavaScript',
              description:
                  'This function allows you to run JavaScript code on the inspected page to access the element styles and page content.\nCall this function to gather additional information or modify the page state. Call this function enough times to investigate the user request.',
              parameters: {
                type: 6,
                description: '',
                nullable: false,
                properties: {
                  code: {
                    type: 1,
                    description:
                        'JavaScript code snippet to run on the inspected page. Make sure the code is formatted for readability.\n\n# Instructions\n\n* To return data, define a top-level `data` variable and populate it with data you want to get. Only JSON-serializable objects can be assigned to `data`.\n* If you modify styles on an element, ALWAYS call the pre-defined global `async setElementStyles(el: Element, styles: object)` function. This function is an internal mechanism for you and should never be presented as a command/advice to the user.\n* Use `window.getComputedStyle` to gather **computed** styles and make sure that you take the distinction between authored styles and computed styles into account.\n* **CRITICAL** Only get styles that might be relevant to the user request.\n* **CRITICAL** Call `window.getComputedStyle` only once per element and store results into a local variable. Never try to return all the styles of the element in `data`.\n* **CRITICAL** Never assume a selector for the elements unless you verified your knowledge.\n* **CRITICAL** Consider that `data` variable from the previous function calls are not available in a new function call.\n\nFor example, the code to return basic styles:\n\n```\nconst styles = window.getComputedStyle($0);\nconst data = {\n    display: styles[\'display\'],\n    visibility: styles[\'visibility\'],\n    position: styles[\'position\'],\n    left: styles[\'right\'],\n    top: styles[\'top\'],\n    width: styles[\'width\'],\n    height: styles[\'height\'],\n    zIndex: styles[\'z-index\']\n};\n```\n\nFor example, the code to change element styles:\n\n```\nawait setElementStyles($0, {\n  color: \'blue\',\n});\n```\n\nFor example, the code to get current and parent styles at once:\n\n```\nconst styles = window.getComputedStyle($0);\nconst parentStyles = window.getComputedStyle($0.parentElement);\nconst data = {\n    currentElementStyles: {\n      display: styles[\'display\'],\n      visibility: styles[\'visibility\'],\n      position: styles[\'position\'],\n      left: styles[\'right\'],\n      top: styles[\'top\'],\n      width: styles[\'width\'],\n      height: styles[\'height\'],\n      zIndex: styles[\'z-index\'],\n    },\n    parentElementStyles: {\n      display: parentStyles[\'display\'],\n      visibility: parentStyles[\'visibility\'],\n      position: parentStyles[\'position\'],\n      left: parentStyles[\'right\'],\n      top: parentStyles[\'top\'],\n      width: parentStyles[\'width\'],\n      height: parentStyles[\'height\'],\n      zIndex: parentStyles[\'z-index\'],\n    },\n};\n```\n\nFor example, the code to get check siblings and overlapping elements:\n\n```\nconst computedStyles = window.getComputedStyle($0);\nconst parentComputedStyles = window.getComputedStyle($0.parentElement);\nconst data = {\n  numberOfChildren: $0.children.length,\n  numberOfSiblings: $0.parentElement.children.length,\n  hasPreviousSibling: !!$0.previousElementSibling,\n  hasNextSibling: !!$0.nextElementSibling,\n  elementStyles: {\n    display: computedStyles[\'display\'],\n    visibility: computedStyles[\'visibility\'],\n    position: computedStyles[\'position\'],\n    clipPath: computedStyles[\'clip-path\'],\n    zIndex: computedStyles[\'z-index\']\n  },\n  parentStyles: {\n    display: parentComputedStyles[\'display\'],\n    visibility: parentComputedStyles[\'visibility\'],\n    position: parentComputedStyles[\'position\'],\n    clipPath: parentComputedStyles[\'clip-path\'],\n    zIndex: parentComputedStyles[\'z-index\']\n  },\n  overlappingElements: Array.from(document.querySelectorAll(\'*\'))\n    .filter(el => {\n      const rect = el.getBoundingClientRect();\n      const popupRect = $0.getBoundingClientRect();\n      return (\n        el !== $0 &&\n        rect.left < popupRect.right &&\n        rect.right > popupRect.left &&\n        rect.top < popupRect.bottom &&\n        rect.bottom > popupRect.top\n      );\n    })\n    .map(el => ({\n      tagName: el.tagName,\n      id: el.id,\n      className: el.className,\n      zIndex: window.getComputedStyle(el)[\'z-index\']\n    }))\n};\n```\n'
                  },
                  thought: {type: 1, description: 'Explain why you want to run this code'},
                  title: {
                    type: 1,
                    description:
                        'Provide a summary of what the code does. For example, "Checking related element styles".'
                  }
                }
              }
            }],
            options: {model_id: 'test model', temperature: undefined},
            metadata: {
              disable_user_content_logging: false,
              string_session_id: 'sessionId',
              user_tier: 2,
              client_version: 'unit_test+function_calling'
            },
            functionality_type: 5,
            client_feature: 2,
            facts: undefined,
            preamble: undefined,
          });
      restoreUserAgentForTesting();
    });

    it('builds a request with aborted query in history before a real request', async () => {
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

      const controller = new AbortController();
      controller.abort();
      await Array.fromAsync(agent.run('test', {
        selected: null,
        signal: controller.signal,
      }));
      await Array.fromAsync(agent.run('test2', {selected: null}));

      const request = agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER);
      assert.deepEqual(request.current_message?.parts[0], {text: 'test input'});
      assert.deepEqual(request.historical_contexts, [
        {parts: [{text: 'QUERY: test2'}], role: 1}, {
          parts: [
            {functionCall: {name: 'executeJavaScript', args: {title: 'title2', thought: 'thought2', code: 'action2'}}}
          ],
          role: 2
        },
        {parts: [{functionResponse: {name: 'executeJavaScript', response: {result: 'result2'}}}], role: 0},
        {parts: [{text: 'answer2'}], role: 2}
      ]);
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

    it('generates an answer immediately', async () => {
      const execJs = sinon.spy();
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[{explanation: 'this is the answer'}]]),
        execJs,
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
      assert.deepEqual(responses, [
        {
          type: AiAssistance.ResponseType.USER_QUERY,
          query: 'test',
          imageInput: undefined,
          imageId: undefined,
        },
        {
          type: AiAssistance.ResponseType.CONTEXT,
          title: 'Analyzing the prompt',
          details: [
            {
              text: '* Its selector is `undefined`',
              title: 'Data used',
            },
          ],
        },
        {
          type: AiAssistance.ResponseType.QUERYING,
        },
        {
          type: AiAssistance.ResponseType.ANSWER,
          text: 'this is the answer',
          complete: true,
          suggestions: undefined,
          rpcId: undefined,
        },
      ]);
      sinon.assert.notCalled(execJs);
      assert.deepEqual(agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts, [
        {
          role: 1,
          parts: [{text: '# Inspected element\n\n* Its selector is `undefined`\n\n# User request\n\nQUERY: test'}],
        },
        {
          role: 2,
          parts: [{text: 'this is the answer'}],
        },
      ]);
    });

    it('correctly handles historical_contexts in AIDA requests', async () => {
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

      assert.lengthOf(requests, 2, 'Unexpected number of AIDA requests');
      assert.isUndefined(requests[0].historical_contexts, 'Unexpected historical contexts in the initial request');
      assert.exists(requests[0].current_message);
      assert.lengthOf(requests[0].current_message.parts, 1);
      assert.deepEqual(
          requests[0].current_message.parts[0], {
            text: '# Inspected element\n\n* Its selector is `undefined`\n\n# User request\n\nQUERY: test',
          },
          'Unexpected input text in the initial request');
      assert.strictEqual(requests[0].current_message.role, Host.AidaClient.Role.USER);
      assert.deepEqual(
          requests[1].historical_contexts,
          [
            {
              role: 1,
              parts: [{text: '# Inspected element\n\n* Its selector is `undefined`\n\n# User request\n\nQUERY: test'}],
            },
            {
              role: 2,
              parts: [{
                functionCall: {
                  args: {
                    code: 'const data = {"test": "observation"}',
                    thought: 'I am thinking.',
                    title: 'thinking',
                  },
                  name: 'executeJavaScript',
                },
              }],
            },
          ],
          'Unexpected historical contexts in the follow-up request');
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

    it('generates an rpcId for the answer', async () => {
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
      assert.deepEqual(responses, [
        {
          type: AiAssistance.ResponseType.USER_QUERY,
          query: 'test',
          imageInput: undefined,
          imageId: undefined,
        },
        {
          type: AiAssistance.ResponseType.CONTEXT,
          title: 'Analyzing the prompt',
          details: [
            {
              text: '* Its selector is `undefined`',
              title: 'Data used',
            },
          ],
        },
        {
          type: AiAssistance.ResponseType.QUERYING,
        },
        {
          type: AiAssistance.ResponseType.ANSWER,
          text: 'this is the answer',
          complete: true,
          suggestions: undefined,
          rpcId: 123,
        },
      ]);
    });

    it('throws an error based on the attribution metadata including RecitationAction.BLOCK', async () => {
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
      assert.deepEqual(responses, [
        {
          type: AiAssistance.ResponseType.USER_QUERY,
          query: 'test',
          imageInput: undefined,
          imageId: undefined,
        },
        {
          type: AiAssistance.ResponseType.CONTEXT,
          title: 'Analyzing the prompt',
          details: [
            {
              text: '* Its selector is `undefined`',
              title: 'Data used',
            },
          ],
        },
        {
          type: AiAssistance.ResponseType.QUERYING,
        },
        {
          text: 'this is the partial answer',
          type: AiAssistance.ResponseType.ANSWER,
          complete: false,
        },
        {
          type: AiAssistance.ResponseType.ERROR,
          error: AiAssistance.ErrorType.BLOCK,
        },
      ]);
    });

    it('does not throw an error based on attribution metadata not including RecitationAction.BLOCK', async () => {
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
      assert.deepEqual(responses, [
        {
          type: AiAssistance.ResponseType.USER_QUERY,
          query: 'test',
          imageInput: undefined,
          imageId: undefined,
        },
        {
          type: AiAssistance.ResponseType.CONTEXT,
          title: 'Analyzing the prompt',
          details: [
            {
              text: '* Its selector is `undefined`',
              title: 'Data used',
            },
          ],
        },
        {
          type: AiAssistance.ResponseType.QUERYING,
        },
        {
          type: AiAssistance.ResponseType.ANSWER,
          text: 'this is the answer',
          complete: true,
          suggestions: undefined,
          rpcId: 123,
        },
      ]);
    });

    it('generates a response if nothing is returned', async () => {
      const execJs = sinon.spy();
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[{explanation: ''}]]),
        execJs,
      });
      const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
      assert.deepEqual(responses, [
        {
          type: AiAssistance.ResponseType.USER_QUERY,
          query: 'test',
          imageInput: undefined,
          imageId: undefined,
        },
        {
          type: AiAssistance.ResponseType.CONTEXT,
          title: 'Analyzing the prompt',
          details: [
            {
              text: '* Its selector is `undefined`',
              title: 'Data used',
            },
          ],
        },
        {
          type: AiAssistance.ResponseType.QUERYING,
        },
        {
          type: AiAssistance.ResponseType.ERROR,
          error: AiAssistance.ErrorType.UNKNOWN,
        },
      ]);
      sinon.assert.notCalled(execJs);
      assert.isUndefined(agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts);
    });

    it('generates an action response if action and answer both present', async () => {
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
      assert.deepEqual(responses, [
        {
          type: AiAssistance.ResponseType.USER_QUERY,
          query: 'test',
          imageInput: undefined,
          imageId: undefined,
        },
        {
          type: AiAssistance.ResponseType.CONTEXT,
          title: 'Analyzing the prompt',
          details: [
            {
              text: '* Its selector is `undefined`',
              title: 'Data used',
            },
          ],
        },
        {
          type: AiAssistance.ResponseType.QUERYING,
        },
        {
          type: AiAssistance.ResponseType.THOUGHT,
          thought: 'I am thinking.',
        },
        {
          type: AiAssistance.ResponseType.ACTION,
          code: 'console.log(\'hello\');',
          output: 'hello',
          canceled: false,
        },
        {
          type: AiAssistance.ResponseType.QUERYING,
        },
        {
          type: AiAssistance.ResponseType.ANSWER,
          text: 'this is the actual answer',
          complete: true,
          suggestions: undefined,
          rpcId: undefined,
        },
      ]);
      sinon.assert.calledOnce(execJs);
    });

    it('generates history for multiple actions', async () => {
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

      assert.deepEqual(agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts, [
        {
          role: 1,
          parts: [{text: '# Inspected element\n\n* Its selector is `undefined`\n\n# User request\n\nQUERY: test'}],
        },
        {
          role: 2,
          parts: [{
            functionCall: {
              args: {
                code: 'console.log(\'test\')',
                thought: 'thought 1',
                title: 'test',
              },
              name: 'executeJavaScript',
            },
          }],
        },
        {
          role: 0,
          parts: [{functionResponse: {name: 'executeJavaScript', response: {result: 'undefined'}}}],
        },
        {
          role: 2,
          parts: [{
            functionCall: {
              args: {
                code: 'console.log(\'test\')',
                thought: 'thought 2',
                title: 'test',
              },
              name: 'executeJavaScript',
            },
          }],
        },
        {
          role: 0,
          parts: [{functionResponse: {name: 'executeJavaScript', response: {result: 'undefined'}}}],
        },
        {
          role: 2,
          parts: [{
            functionCall: {
              args: {
                code: 'console.log(\'test\')',
                thought: 'thought 3',
                title: 'test',
              },
              name: 'executeJavaScript',
            },
          }],
        },
        {
          role: 0,
          parts: [{functionResponse: {name: 'executeJavaScript', response: {result: 'undefined'}}}],
        },
        {
          role: 2,
          parts: [{text: 'this is the answer'}],
        },
      ]);
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

    it('does not add multimodal input evaluation prompt when multimodal is disabled', async () => {
      mockHostConfig('test model');
      const enhancedQuery = await agent.enhanceQuery(
          'test query', new AiAssistance.NodeContext(element), AiAssistance.MultimodalInputType.SCREENSHOT);

      assert.strictEqual(
          enhancedQuery,
          '# Inspected element\n\n* Its selector is `div#myElement`\n\n# User request\n\nQUERY: test query',
      );
    });

    it('does not add multimodal input evaluation prompt when multimodal is enabled but multimodalInputType is missing',
       async () => {
         mockHostConfig('test model', 1, 'PUBLIC', Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS, true);
         const enhancedQuery = await agent.enhanceQuery('test query', new AiAssistance.NodeContext(element));

         assert.strictEqual(
             enhancedQuery,
             '# Inspected element\n\n* Its selector is `div#myElement`\n\n# User request\n\nQUERY: test query',
         );
       });

    it('adds multimodal input evaluation prompt when multimodal is enabled and multimodalInputType is screenshot',
       async () => {
         mockHostConfig('test model', 1, 'PUBLIC', Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS, true);
         const enhancedQuery = await agent.enhanceQuery(
             'test query', new AiAssistance.NodeContext(element), AiAssistance.MultimodalInputType.SCREENSHOT);

         assert.strictEqual(
             enhancedQuery,
             `The user has provided you a screenshot of the page (as visible in the viewport) in base64-encoded format. You SHOULD use it while answering user's queries.

* Try to connect the screenshot to actual DOM elements in the page.
# Considerations for evaluating image:
* Pay close attention to the spatial details as well as the visual appearance of the selected element in the image, particularly in relation to layout, spacing, and styling.
* Analyze the image to identify the layout structure surrounding the element, including the positioning of neighboring elements.
* Extract visual information from the image, such as colors, fonts, spacing, and sizes, that might be relevant to the user's query.
* If the image suggests responsiveness issues (e.g., cropped content, overlapping elements), consider those in your response.
* Consider the surrounding elements and overall layout in the image, but prioritize the selected element's styling and positioning.
* **CRITICAL** When the user provides image input, interpret and use content and information from the image STRICTLY for web site debugging purposes.

* As part of THOUGHT, evaluate the image to gather data that might be needed to answer the question.
In case query is related to the image, ALWAYS first use image evaluation to get all details from the image. ONLY after you have all data needed from image, you should move to other steps.

# Inspected element

* Its selector is \`div#myElement\`

# User request

QUERY: test query`,
         );
       });

    it('adds multimodal input evaluation prompt when multimodal is enabled and multimodalInputType is uploaded image',
       async () => {
         mockHostConfig('test model', 1, 'PUBLIC', Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS, true);
         const enhancedQuery = await agent.enhanceQuery(
             'test query', new AiAssistance.NodeContext(element), AiAssistance.MultimodalInputType.UPLOADED_IMAGE);

         assert.strictEqual(
             enhancedQuery,
             `The user has uploaded an image in base64-encoded format. You SHOULD use it while answering user's queries.
# Considerations for evaluating image:
* Pay close attention to the spatial details as well as the visual appearance of the selected element in the image, particularly in relation to layout, spacing, and styling.
* Analyze the image to identify the layout structure surrounding the element, including the positioning of neighboring elements.
* Extract visual information from the image, such as colors, fonts, spacing, and sizes, that might be relevant to the user's query.
* If the image suggests responsiveness issues (e.g., cropped content, overlapping elements), consider those in your response.
* Consider the surrounding elements and overall layout in the image, but prioritize the selected element's styling and positioning.
* **CRITICAL** When the user provides image input, interpret and use content and information from the image STRICTLY for web site debugging purposes.

* As part of THOUGHT, evaluate the image to gather data that might be needed to answer the question.
In case query is related to the image, ALWAYS first use image evaluation to get all details from the image. ONLY after you have all data needed from image, you should move to other steps.

# Inspected element

* Its selector is \`div#myElement\`

# User request

QUERY: test query`,
         );
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
