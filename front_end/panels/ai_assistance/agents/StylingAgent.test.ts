// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {
  describeWithEnvironment,
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

  describe('parseResponse', () => {
    const agent = new StylingAgent({
      aidaClient: {} as Host.AidaClient.AidaClient,
    });

    function getParsedTextResponse(explanation: string): AiAssistance.ParsedResponse {
      return agent.parseResponse({
        explanation,
        metadata: {},
        completed: false,
      });
    }

    it('parses a thought', async () => {
      const payload = 'some response';
      assert.deepEqual(
          getParsedTextResponse(`THOUGHT: ${payload}`),
          {
            title: undefined,
            thought: payload,
          },
      );
      assert.deepEqual(
          getParsedTextResponse(`   THOUGHT: ${payload}`),
          {
            title: undefined,
            thought: payload,
          },
      );
      assert.deepEqual(
          getParsedTextResponse(`Something\n   THOUGHT: ${payload}`),
          {
            title: undefined,
            thought: payload,
          },
      );
    });
    it('parses a answer', async () => {
      const payload = 'some response';
      assert.deepEqual(
          getParsedTextResponse(`ANSWER: ${payload}`),
          {
            answer: payload,
            suggestions: undefined,
          },
      );
      assert.deepEqual(
          getParsedTextResponse(`   ANSWER: ${payload}`),
          {
            answer: payload,
            suggestions: undefined,
          },
      );
      assert.deepEqual(
          getParsedTextResponse(`Something\n   ANSWER: ${payload}`),
          {
            answer: payload,
            suggestions: undefined,
          },
      );
    });
    it('parses a multiline answer', async () => {
      const payload = `a
b
c`;
      assert.deepEqual(
          getParsedTextResponse(`ANSWER: ${payload}`),
          {
            answer: payload,
            suggestions: undefined,
          },
      );
      assert.deepEqual(
          getParsedTextResponse(`   ANSWER: ${payload}`),
          {
            answer: payload,
            suggestions: undefined,
          },
      );
      assert.deepEqual(
          getParsedTextResponse(`Something\n   ANSWER: ${payload}`),
          {
            answer: payload,
            suggestions: undefined,
          },
      );
      assert.deepEqual(
          getParsedTextResponse(`ANSWER: ${payload}\nTHOUGHT: thought`),
          {
            answer: payload,
            suggestions: undefined,
          },
      );
      assert.deepEqual(
          getParsedTextResponse(
              `ANSWER: ${payload}\nOBSERVATION: observation`,
              ),
          {
            answer: payload,
            suggestions: undefined,
          },
      );
      assert.deepEqual(
          getParsedTextResponse(
              `ANSWER: ${payload}\nACTION\naction\nSTOP`,
              ),
          {
            action: 'action',
            title: undefined,
            thought: undefined,
          },
      );
    });
    it('parses an action', async () => {
      const payload = `const data = {
  someKey: "value",
}`;
      assert.deepEqual(
          getParsedTextResponse(`ACTION\n${payload}\nSTOP`),
          {
            action: payload,
            title: undefined,
            thought: undefined,
          },
      );
      assert.deepEqual(
          getParsedTextResponse(`ACTION\n${payload}`),
          {
            action: payload,
            title: undefined,
            thought: undefined,
          },
      );
      assert.deepEqual(
          getParsedTextResponse(`ACTION\n\n${payload}\n\nSTOP`),
          {
            action: payload,
            title: undefined,
            thought: undefined,
          },
      );

      assert.deepEqual(
          getParsedTextResponse(`ACTION\n\n${payload}\n\nANSWER: answer`),
          {
            action: payload,
            title: undefined,
            thought: undefined,
          },
      );
    });
    it('parses an action where the last line of the code block ends with STOP keyword', async () => {
      const payload = `const styles = window.getComputedStyle($0);
        const data = {
          styles
        };`;
      assert.deepEqual(
          getParsedTextResponse(`ACTION\n${payload}STOP`),
          {
            action: payload,
            title: undefined,
            thought: undefined,
          },
      );
    });
    it('parses a thought and title', async () => {
      const payload = 'some response';
      const title = 'this is the title';
      assert.deepEqual(
          getParsedTextResponse(`THOUGHT: ${payload}\nTITLE: ${title}`),
          {
            thought: payload,
            title,
          },
      );
    });

    it('parses an action with backticks in the code', async () => {
      const payload = `const data = {
  someKey: "value",
}`;
      assert.deepEqual(
          getParsedTextResponse(
              `ACTION\n\`\`\`\n${payload}\n\`\`\`\nSTOP`,
              ),
          {
            action: payload,
            title: undefined,
            thought: undefined,
          },
      );
    });

    it('parses an action with 5 backticks in the code and `js` text in the prelude', async () => {
      const payload = `const data = {
  someKey: "value",
}`;
      assert.deepEqual(
          getParsedTextResponse(
              `ACTION\n\`\`\`\`\`\njs\n${payload}\n\`\`\`\`\`\nSTOP`,
              ),
          {
            action: payload,
            title: undefined,
            thought: undefined,
          },
      );
    });

    it('parses a thought and an action', async () => {
      const actionPayload = `const data = {
  someKey: "value",
}`;
      const thoughtPayload = 'thought';
      assert.deepEqual(
          getParsedTextResponse(
              `THOUGHT:${thoughtPayload}\nACTION\n${actionPayload}\nSTOP`,
              ),
          {
            action: actionPayload,
            title: undefined,
            thought: thoughtPayload,
          },
      );
    });

    it('parses a thought and an answer', async () => {
      const answerPayload = 'answer';
      const thoughtPayload = 'thought';
      assert.deepEqual(
          getParsedTextResponse(
              `THOUGHT:${thoughtPayload}\nANSWER:${answerPayload}`,
              ),
          {
            answer: answerPayload,
            suggestions: undefined,
          },
      );
    });

    it('parses an answer and suggestions', async () => {
      const answerPayload = 'answer';
      const suggestions = ['suggestion'] as [string];
      const suggestionsText = JSON.stringify(suggestions);
      assert.deepEqual(
          getParsedTextResponse(
              `ANSWER:${answerPayload}\nSUGGESTIONS: ${suggestionsText}`,
              ),
          {
            answer: answerPayload,
            suggestions,
          },
      );
    });

    it('parses a thought, title, action and answer from same response', async () => {
      const answerPayload = 'answer';
      const thoughtPayload = 'thought';
      const actionPayload = `const data = {
  someKey: "value",
}`;
      const title = 'title';
      assert.deepEqual(
          getParsedTextResponse(
              `THOUGHT: ${thoughtPayload}\nTITLE: ${title}\nACTION\n${actionPayload}\nSTOP\nANSWER:${answerPayload}`,
              ),
          {
            thought: thoughtPayload,
            action: actionPayload,
            title,
          },
      );
    });
    it('parses an action when STOP appearing in its last line and has ANSWER after that', async () => {
      const answerPayload = 'answer';
      const suggestions = ['suggestion'];
      const payload = `const styles = window.getComputedStyle($0);
        const data = {
          styles
        };`;
      assert.deepEqual(
          getParsedTextResponse(
              `ACTION\n${payload}STOP\nANSWER:${answerPayload}\nSUGGESTIONS: ${JSON.stringify(suggestions)}`),
          {
            action: payload,
            thought: undefined,
            title: undefined,
          },
      );
    });
    it('parses an action when STOP appearing in its last line and has OBSERVATION after that', async () => {
      const payload = `const styles = window.getComputedStyle($0);
        const data = {
          styles
        };`;
      assert.deepEqual(
          getParsedTextResponse(`ACTION\n${payload}STOP\nOBSERVATION:{styles: {}}`),
          {
            action: payload,
            thought: undefined,
            title: undefined,
          },
      );
    });
    it('parses an action when STOP appearing in its last line and has THOUGHT after that', async () => {
      const payload = `const styles = window.getComputedStyle($0);
        const data = {
          styles
        };`;
      const thoughtPayload = 'thought';
      assert.deepEqual(
          getParsedTextResponse(`ACTION\n${payload}STOP\nTHOUGHT:${thoughtPayload}`),
          {
            action: payload,
            thought: thoughtPayload,
            title: undefined,
          },
      );
    });

    it('parses a response as an answer', async () => {
      assert.deepEqual(
          getParsedTextResponse(
              'This is also an answer',
              ),
          {
            answer: 'This is also an answer',
            suggestions: undefined,
          },
      );
    });

    it('parses a response with no instruction tags as an answer and correctly parses suggestions', async () => {
      assert.deepEqual(
          getParsedTextResponse(
              'This is also an answer\nSUGGESTIONS: [\"suggestion\"]',
              ),
          {
            answer: 'This is also an answer',
            suggestions: ['suggestion'],
          },
      );
    });

    it('parses multi line thoughts', () => {
      const thoughtText = 'first line\nsecond line';
      assert.deepEqual(
          getParsedTextResponse(`THOUGHT: ${thoughtText}`),
          {
            thought: thoughtText,
            title: undefined,
          },
      );
    });
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
      sinon.stub(agent, 'preamble').value('preamble');
      await Array.fromAsync(agent.run('question', {selected: null}));

      assert.deepEqual(
          agent.buildRequest(
              {
                text: 'test input',
              },
              Host.AidaClient.Role.USER),
          {
            current_message: {role: Host.AidaClient.Role.USER, parts: [{text: 'test input'}]},
            client: 'CHROME_DEVTOOLS',
            preamble: 'preamble',
            historical_contexts: [
              {
                role: 1,
                parts: [{text: 'QUERY: question'}],
              },
              {
                role: 2,
                parts: [{text: 'ANSWER: answer'}],
              },
            ],
            metadata: {
              disable_user_content_logging: false,
              string_session_id: 'sessionId',
              user_tier: 2,
            },
            options: {
              model_id: 'test model',
              temperature: undefined,
            },
            client_feature: 2,
            functionality_type: 1,
          },
      );
    });

    it('builds a request with aborted query in history before a real request', async () => {
      const execJs = sinon.mock().once();
      execJs.onCall(0).returns('result2');
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([
          [{
            explanation: `THOUGHT: thought2
TITLE: title2
ACTION
action2
STOP`
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
        {
          parts: [{text: 'QUERY: test2'}],
          role: 1,
        },
        {
          role: 2,
          parts: [{text: 'THOUGHT: thought2\nTITLE: title2\nACTION\naction2\nSTOP'}],
        },
        {
          role: 1,
          parts: [{text: 'OBSERVATION: result2'}],
        },
        {
          role: 2,
          parts: [{text: 'ANSWER: answer2'}],
        },
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
              explanation: `ACTION
$0.style.backgroundColor = 'red'
STOP`,
            }],
            [{
              explanation: 'ANSWER: This is the answer',
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
              explanation: `ACTION
            $0.style.backgroundColor = 'red'
            STOP`,
            }],
            [{
              explanation: 'ANSWER: This is the answer',
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
              explanation: `ACTION
$0.style.backgroundColor = 'red'
STOP`,
            }],
            [{
              explanation: 'ANSWER: This is the answer',
            }]
          ]),
          createExtensionScope,
          confirmSideEffectForTest: stub,
          execJs,

        });
        promise.resolve(false);
        const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));

        const actionStep = responses.find(response => response.type === AiAssistance.ResponseType.ACTION)!;

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
            explanation: `ACTION
$0.style.backgroundColor = 'red'
STOP`,
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
            assert.isTrue(execJs.calledOnce);
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
              explanation: `ACTION
$0.style.backgroundColor = 'red';
STOP`,
            }],
            [{
              explanation: 'ANSWER: This is the answer',
            }]
          ]),
          createExtensionScope,
          execJs,
        });

        const result = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
        const actionSteps = result.filter(step => {
          return step.type === AiAssistance.ResponseType.ACTION;
        });
        assert(actionSteps.length === 1, 'Found non or multiple action steps');
        const actionStep = actionSteps.at(0)!;
        assert(actionStep.output!.includes('Error: Output exceeded the maximum allowed length.'));
      });
    });

    it('generates an answer immediately', async () => {
      const execJs = sinon.spy();
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[{explanation: 'ANSWER: this is the answer'}]]),
        execJs,
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));
      assert.deepEqual(responses, [
        {
          type: AiAssistance.ResponseType.USER_QUERY,
          query: 'test',
          imageInput: undefined,
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
          parts: [{text: 'ANSWER: this is the answer'}],
        },
      ]);
    });

    it('correctly handles historical_contexts in AIDA requests', async () => {
      const execJs = sinon.mock().once();
      execJs.onCall(0).returns('test data');
      const aidaClient = mockAidaClient([
        [{
          explanation: `THOUGHT: I am thinking.
TITLE: thinking
ACTION
const data = {"test": "observation"};
STOP`,
        }],
        [{
          explanation: 'ANSWER: this is the actual answer',
        }]
      ]);
      const agent = new StylingAgent({
        aidaClient,
        createExtensionScope,
        execJs,
      });

      await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));

      const requests: Host.AidaClient.AidaRequest[] = (aidaClient.fetch as sinon.SinonStub).args.map(arg => arg[0]);

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
                text:
                    'THOUGHT: I am thinking.\nTITLE: thinking\nACTION\nconst data = {\"test\": \"observation\"};\nSTOP',
              }],
            },
          ],
          'Unexpected historical contexts in the follow-up request');
      assert.exists(requests[1].current_message);
      assert.lengthOf(requests[1].current_message.parts, 1);
      assert.deepEqual(
          requests[1].current_message.parts[0], {text: 'OBSERVATION: test data'},
          'Unexpected input in the follow-up request');
    });

    it('generates an rpcId for the answer', async () => {
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[{
          explanation: 'ANSWER: this is the answer',
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
          suggestions: undefined,
          rpcId: 123,
        },
      ]);
    });

    it('throws an error based on the attribution metadata including RecitationAction.BLOCK', async () => {
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[
          {
            explanation: 'ANSWER: this is the answer',
          },
          {
            explanation: 'ANSWER: this is another answer',
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
          text: 'this is the answer',
          type: AiAssistance.ResponseType.ANSWER,
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
          explanation: 'ANSWER: this is the answer',
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
          suggestions: undefined,
          rpcId: 123,
        },
      ]);
    });

    it('should execute an action only once even when the partial response contains an action', async () => {
      const execJs = sinon.spy();
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([[
          {
            explanation: `THOUGHT: I am thinking.

ACTION
console.log('hel
          `,
          },
          {
            explanation: `THOUGHT: I am thinking.

ACTION
console.log('hello');
STOP
          `,
          }
        ]]),
        createExtensionScope,
        execJs,
      });
      await Array.fromAsync(agent.run('test', {selected: new AiAssistance.NodeContext(element)}));

      sinon.assert.calledOnce(execJs);
      assert.include(execJs.lastCall.args[0], 'console.log(\'hello\');');
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
            explanation: `THOUGHT: I am thinking.

          ACTION
          console.log('hello');
          STOP

          ANSWER: this is the answer`,
          }],
          [{
            explanation: 'ANSWER: this is the actual answer',
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
          rpcId: undefined,
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
            explanation: 'THOUGHT: thought 1\nTITLE:test\nACTION\nconsole.log(\'test\')\nSTOP\n',
          }],
          [{
            explanation: 'THOUGHT: thought 2\nTITLE:test\nACTION\nconsole.log(\'test\')\nSTOP\n',
          }],
          [{
            explanation: 'THOUGHT: thought 3\nTITLE:test\nACTION\nconsole.log(\'test\')\nSTOP\n',
          }],
          [{
            explanation: 'ANSWER: this is the answer',
          }]
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
          parts: [{text: 'THOUGHT: thought 1\nTITLE: test\nACTION\nconsole.log(\'test\')\nSTOP'}],
        },
        {
          role: 1,
          parts: [{text: 'OBSERVATION: undefined'}],
        },
        {
          role: 2,
          parts: [{text: 'THOUGHT: thought 2\nTITLE: test\nACTION\nconsole.log(\'test\')\nSTOP'}],
        },
        {
          role: 1,
          parts: [{text: 'OBSERVATION: undefined'}],
        },
        {
          role: 2,
          parts: [{text: 'THOUGHT: thought 3\nTITLE: test\nACTION\nconsole.log(\'test\')\nSTOP'}],
        },
        {
          role: 1,
          parts: [{text: 'OBSERVATION: undefined'}],
        },
        {
          role: 2,
          parts: [{text: 'ANSWER: this is the answer'}],
        },
      ]);
    });

    it('stops when aborted', async () => {
      const execJs = sinon.spy();
      const agent = new StylingAgent({
        aidaClient: mockAidaClient([
          [{
            explanation: 'THOUGHT: thought 1\nTITLE:test\nACTION\nconsole.log(\'test\')\nSTOP\n',
          }],
          [{
            explanation: 'THOUGHT: thought 2\nTITLE:test\nACTION\nconsole.log(\'test\')\nSTOP\n',
          }],
          [{
            explanation: 'THOUGHT: thought 3\nTITLE:test\nACTION\nconsole.log(\'test\')\nSTOP\n',
          }],
          [{
            explanation: 'ANSWER: this is the answer',
          }]
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
      const enhancedQuery = await agent.enhanceQuery('test query', new AiAssistance.NodeContext(element), true);

      assert.strictEqual(
          enhancedQuery,
          '# Inspected element\n\n* Its selector is `div#myElement`\n\n# User request\n\nQUERY: test query',
      );
    });

    it('does not add multimodal input evaluation prompt when multimodal is enabled but hasImageInput is false',
       async () => {
         mockHostConfig('test model', 1, 'PUBLIC', Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS, true);
         const enhancedQuery = await agent.enhanceQuery('test query', new AiAssistance.NodeContext(element), false);

         assert.strictEqual(
             enhancedQuery,
             '# Inspected element\n\n* Its selector is `div#myElement`\n\n# User request\n\nQUERY: test query',
         );
       });

    it('adds multimodal input evaluation prompt when multimodal is enabled and hasImageInput is true', async () => {
      mockHostConfig('test model', 1, 'PUBLIC', Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS, true);
      const enhancedQuery = await agent.enhanceQuery('test query', new AiAssistance.NodeContext(element), true);

      assert.strictEqual(
          enhancedQuery,
          `The user has provided you a screenshot of the page (as visible in the viewport) in base64-encoded format. You SHOULD use it while answering user's queries.

# Considerations for evaluating image:
* Pay close attention to the spatial details as well as the visual appearance of the selected element in the image, particularly in relation to layout, spacing, and styling.
* Try to connect the screenshot to actual DOM elements in the page.
* Analyze the image to identify the layout structure surrounding the element, including the positioning of neighboring elements.
* Extract visual information from the image, such as colors, fonts, spacing, and sizes, that might be relevant to the user's query.
* If the image suggests responsiveness issues (e.g., cropped content, overlapping elements), consider those in your response.
* Consider the surrounding elements and overall layout in the image, but prioritize the selected element's styling and positioning.

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
          explanation: `ACTION
$0.style.backgroundColor = 'red'
STOP`,
        }],
        [{
          explanation: 'ANSWER: This is the answer',
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
