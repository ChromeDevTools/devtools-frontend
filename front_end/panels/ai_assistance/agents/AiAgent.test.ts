// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

const {AiAgent, ResponseType, ConversationContext, ErrorType} = AiAssistance;

function mockConversationContext(): AiAssistance.ConversationContext<unknown> {
  return new (class extends ConversationContext<unknown>{
    override getOrigin(): string {
      return 'origin';
    }

    override getItem(): unknown {
      return null;
    }

    override getIcon(): HTMLElement {
      return document.createElement('span');
    }

    override getTitle(): string {
      return 'title';
    }
  })();
}

class AiAgentMock extends AiAgent<unknown> {
  type = AiAssistance.AgentType.STYLING;
  override preamble = 'preamble';

  // eslint-disable-next-line require-yield
  override async * handleContextDetails(): AsyncGenerator<AiAssistance.ContextResponse, void, void> {
    return;
  }

  clientFeature: Host.AidaClient.ClientFeature = 0;
  userTier: undefined;

  options: AiAssistance.RequestOptions = {
    temperature: 1,
    modelId: 'test model',
  };
}

describeWithEnvironment('AiAgent', () => {
  describe('buildRequest', () => {
    beforeEach(() => {
      sinon.stub(crypto, 'randomUUID').returns('sessionId' as `${string}-${string}-${string}-${string}-${string}`);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('builds a request with a temperature', async () => {
      const agent = new AiAgentMock({
        aidaClient: mockAidaClient(),
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.temperature,
          1,
      );
    });

    it('builds a request with a temperature -1', async () => {
      const agent = new AiAgentMock({
        aidaClient: mockAidaClient(),
      });
      agent.options.temperature = -1;
      assert.isUndefined(agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.temperature);
    });

    it('builds a request with a model id', async () => {
      const agent = new AiAgentMock({
        aidaClient: mockAidaClient(),
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.model_id,
          'test model',
      );
    });

    it('builds a request with logging', async () => {
      const agent = new AiAgentMock({
        aidaClient: mockAidaClient(),
        serverSideLoggingEnabled: true,
      });
      assert.isFalse(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).metadata?.disable_user_content_logging);
    });

    it('builds a request without logging', async () => {
      const agent = new AiAgentMock({
        aidaClient: mockAidaClient(),
        serverSideLoggingEnabled: false,
      });
      assert.isTrue(agent
                        .buildRequest(
                            {
                              text: 'test input',
                            },
                            Host.AidaClient.Role.USER)
                        .metadata?.disable_user_content_logging);
    });

    it('builds a request with input', async () => {
      const agent = new AiAgentMock({
        aidaClient: mockAidaClient(),
        serverSideLoggingEnabled: false,
      });
      const request = agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER);
      assert.deepEqual(request.current_message?.parts[0], {text: 'test input'});
      assert.isUndefined(request.historical_contexts);
    });

    it('builds a request with a sessionId', async () => {
      const agent = new AiAgentMock({
        aidaClient: mockAidaClient(),
      });
      const request = agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER);
      assert.strictEqual(request.metadata?.string_session_id, 'sessionId');
    });

    it('builds a request with preamble', async () => {
      const agent = new AiAgentMock({
        aidaClient: mockAidaClient(),
      });
      const request = agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER);
      assert.deepEqual(request.current_message?.parts[0], {text: 'test input'});
      assert.strictEqual(request.preamble, 'preamble');
      assert.isUndefined(request.historical_contexts);
    });

    it('builds a request without preamble', async () => {
      class AiAgentMockWithoutPreamble extends AiAgent<unknown> {
        type = AiAssistance.AgentType.STYLING;
        override preamble = undefined;
        // eslint-disable-next-line require-yield
        override async * handleContextDetails(): AsyncGenerator<AiAssistance.ContextResponse, void, void> {
          return;
        }
        clientFeature: Host.AidaClient.ClientFeature = 0;
        userTier: undefined;
        options: AiAssistance.RequestOptions = {
          temperature: 1,
          modelId: 'test model',
        };
      }

      const agent = new AiAgentMockWithoutPreamble({
        aidaClient: mockAidaClient(),
      });
      const request = agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER);
      assert.deepEqual(request.current_message?.parts[0], {text: 'test input'});
      assert.isUndefined(request.preamble);
      assert.isUndefined(request.historical_contexts);
    });

    it('builds a request with chat history', async () => {
      const agent = new AiAgentMock({
        aidaClient: mockAidaClient([[{
          explanation: 'answer',
        }]]),
        serverSideLoggingEnabled: true,
      });
      await Array.fromAsync(agent.run('question', {selected: null}));

      const request = agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER);
      assert.deepEqual(request.current_message?.parts[0], {text: 'test input'});
      assert.deepEqual(request.historical_contexts, [
        {
          parts: [{text: 'question'}],
          role: 1,
        },
        {
          role: 2,
          parts: [{text: 'answer'}],
        },
      ]);
    });

    it('builds a request with aborted query in history', async () => {
      const agent = new AiAgentMock({
        aidaClient: mockAidaClient([[{
          explanation: 'answer',
        }]]),
        serverSideLoggingEnabled: true,
      });

      const controller = new AbortController();
      controller.abort();
      await Array.fromAsync(agent.run('question', {selected: null, signal: controller.signal}));

      const request = agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER);
      assert.deepEqual(request.current_message?.parts[0], {text: 'test input'});
      assert.isUndefined(request.historical_contexts);
    });
  });

  describe('run', () => {
    describe('partial yielding for answers', () => {
      it('should yield partial answer with final answer at the end', async () => {
        const agent = new AiAgentMock({
          aidaClient: mockAidaClient([[
            {
              explanation: 'Partial ans',
            },
            {
              explanation: 'Partial answer is now completed',
            }
          ]]),
        });

        const responses = await Array.fromAsync(agent.run('query', {selected: mockConversationContext()}));

        assert.deepEqual(responses, [
          {
            type: ResponseType.USER_QUERY,
            query: 'query',
            imageInput: undefined,
          },
          {
            type: ResponseType.QUERYING,
          },
          {
            type: ResponseType.ANSWER,
            text: 'Partial ans',
          },
          {
            type: ResponseType.ANSWER,
            text: 'Partial answer is now completed',
            rpcId: undefined,
            suggestions: undefined,
          },
        ]);
      });

      it('should not add partial answers to history', async () => {
        const agent = new AiAgentMock({
          aidaClient: mockAidaClient([[
            {
              explanation: 'Partial ans',
            },
            {
              explanation: 'Partial answer is now completed',
            }
          ]]),
        });

        await Array.fromAsync(agent.run('query', {selected: mockConversationContext()}));

        assert.deepEqual(agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts, [
          {
            role: Host.AidaClient.Role.USER,
            parts: [{text: 'query'}],
          },
          {
            role: Host.AidaClient.Role.MODEL,
            parts: [{text: 'Partial answer is now completed'}],
          },
        ]);
      });
    });

    it('should yield unknown error when aidaFetch does not return anything', async () => {
      const agent = new AiAgentMock({
        aidaClient: mockAidaClient([]),
      });

      const responses = await Array.fromAsync(agent.run('query', {selected: mockConversationContext()}));

      assert.deepEqual(responses, [
        {
          type: ResponseType.USER_QUERY,
          query: 'query',
          imageInput: undefined,
        },
        {
          type: ResponseType.QUERYING,
        },
        {
          type: ResponseType.ERROR,
          error: ErrorType.UNKNOWN,
        },
      ]);
    });
  });

  describe('ConversationContext', () => {
    function getTestContext(origin: string) {
      class TestContext extends ConversationContext<undefined> {
        override getIcon(): HTMLElement {
          throw new Error('Method not implemented.');
        }
        override getTitle(): string {
          throw new Error('Method not implemented.');
        }
        override getOrigin(): string {
          return origin;
        }
        override getItem(): undefined {
          return undefined;
        }
      }
      return new TestContext();
    }
    it('checks context origins', () => {
      const tests = [
        {
          contextOrigin: 'https://google.test',
          agentOrigin: 'https://google.test',
          isAllowed: true,
        },
        {
          contextOrigin: 'https://google.test',
          agentOrigin: 'about:blank',
          isAllowed: false,
        },
        {
          contextOrigin: 'https://google.test',
          agentOrigin: 'https://www.google.test',
          isAllowed: false,
        },
        {
          contextOrigin: 'https://a.test',
          agentOrigin: 'https://b.test',
          isAllowed: false,
        },
        {
          contextOrigin: 'https://a.test',
          agentOrigin: 'file:///tmp',
          isAllowed: false,
        },
        {
          contextOrigin: 'https://a.test',
          agentOrigin: 'http://a.test',
          isAllowed: false,
        },
      ];
      for (const test of tests) {
        assert.strictEqual(getTestContext(test.contextOrigin).isOriginAllowed(test.agentOrigin), test.isAllowed);
      }
    });
  });

  describe('functions', () => {
    class AgentWithFunction extends AiAgent<unknown> {
      type = AiAssistance.AgentType.STYLING;
      override preamble = 'preamble';
      called = 0;

      constructor(opts: AiAssistance.AgentOptions) {
        super(opts);
        this.declareFunction('testFn', {
          description: 'test fn description',
          parameters: {type: Host.AidaClient.ParametersTypes.OBJECT, properties: {}, description: 'arg description'},
          handler: this.#test.bind(this),
        });
      }

      async #test(args: {}) {
        this.called++;
        return {
          result: args,
        };
      }

      // eslint-disable-next-line require-yield
      override async * handleContextDetails(): AsyncGenerator<AiAssistance.ContextResponse, void, void> {
        return;
      }

      clientFeature: Host.AidaClient.ClientFeature = 0;
      userTier: undefined;
      options: AiAssistance.RequestOptions = {
        temperature: 1,
        modelId: 'test model',
      };
    }

    it('should build a request with functions', () => {
      const agent = new AgentWithFunction({
        aidaClient: mockAidaClient(),
      });
      agent.options.temperature = -1;
      assert.deepEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).function_declarations,
          [{
            description: 'test fn description',
            name: 'testFn',
            parameters: {
              description: 'arg description',
              properties: {},
              type: 6,
            },
          }],
      );
    });
  });
});
