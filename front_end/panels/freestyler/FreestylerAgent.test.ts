// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import {
  describeWithEnvironment,
  getGetHostConfigStub,
} from '../../testing/EnvironmentHelpers.js';

import * as Freestyler from './FreestylerAgent.js';

const {FreestylerAgent} = Freestyler;

describeWithEnvironment('FreestylerAgent', () => {
  function mockHostConfig(modelId?: string) {
    getGetHostConfigStub({
      devToolsFreestylerDogfood: {
        aidaModelId: modelId,
      },
    });
  }
  describe('parseResponse', () => {
    it('parses a thought', async () => {
      const payload = 'some response';
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`THOUGHT: ${payload}`),
          {
            action: undefined,
            thought: payload,
            answer: undefined,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`   THOUGHT: ${payload}`),
          {
            action: undefined,
            thought: payload,
            answer: undefined,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`Something\n   THOUGHT: ${payload}`),
          {
            action: undefined,
            thought: payload,
            answer: undefined,
          },
      );
    });
    it('parses a answer', async () => {
      const payload = 'some response';
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`ANSWER: ${payload}`),
          {
            action: undefined,
            thought: undefined,
            answer: payload,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`   ANSWER: ${payload}`),
          {
            action: undefined,
            thought: undefined,
            answer: payload,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`Something\n   ANSWER: ${payload}`),
          {
            action: undefined,
            thought: undefined,
            answer: payload,
          },
      );
    });
    it('parses a multiline answer', async () => {
      const payload = `a
b
c`;
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`ANSWER: ${payload}`),
          {
            action: undefined,
            thought: undefined,
            answer: payload,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`   ANSWER: ${payload}`),
          {
            action: undefined,
            thought: undefined,
            answer: payload,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`Something\n   ANSWER: ${payload}`),
          {
            action: undefined,
            thought: undefined,
            answer: payload,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`ANSWER: ${payload}\nTHOUGHT: thought`),
          {
            action: undefined,
            thought: 'thought',
            answer: payload,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(
              `ANSWER: ${payload}\nOBSERVATION: observation`,
              ),
          {
            action: undefined,
            thought: undefined,
            answer: payload,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(
              `ANSWER: ${payload}\nACTION\naction\nSTOP`,
              ),
          {
            action: 'action',
            thought: undefined,
            answer: payload,
          },
      );
    });
    it('parses an action', async () => {
      const payload = `const data = {
  someKey: "value",
}`;
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`ACTION\n${payload}\nSTOP`),
          {
            action: payload,
            thought: undefined,
            answer: undefined,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`ACTION\n${payload}`),
          {
            action: payload,
            thought: undefined,
            answer: undefined,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`ACTION\n\n${payload}\n\nSTOP`),
          {
            action: payload,
            thought: undefined,
            answer: undefined,
          },
      );
    });

    it('parses an action with backticks in the code', async () => {
      const payload = `const data = {
  someKey: "value",
}`;
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(
              `ACTION\n\`\`\`\n${payload}\n\`\`\`\nSTOP`,
              ),
          {
            action: payload,
            thought: undefined,
            answer: undefined,
          },
      );
    });

    it('parses an action with 5 backticks in the code and `js` text in the prelude', async () => {
      const payload = `const data = {
  someKey: "value",
}`;
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(
              `ACTION\n\`\`\`\`\`\njs\n${payload}\n\`\`\`\`\`\nSTOP`,
              ),
          {
            action: payload,
            thought: undefined,
            answer: undefined,
          },
      );
    });

    it('parses a thought and an action', async () => {
      const actionPayload = `const data = {
  someKey: "value",
}`;
      const thoughtPayload = 'thought';
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(
              `THOUGHT:${thoughtPayload}\nACTION\n${actionPayload}\nSTOP`,
              ),
          {
            action: actionPayload,
            thought: thoughtPayload,
            answer: undefined,
          },
      );
    });
  });

  describe('buildRequest', () => {
    beforeEach(() => {
      sinon.restore();
    });

    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      assert.strictEqual(
          FreestylerAgent.buildRequest('test input').options?.model_id,
          'test model',
      );
    });

    it('builds a request with input', async () => {
      mockHostConfig();
      const request = FreestylerAgent.buildRequest('test input');
      assert.strictEqual(request.input, 'test input');
      assert.strictEqual(request.preamble, undefined);
      assert.strictEqual(request.chat_history, undefined);
    });

    it('builds a request with preamble', async () => {
      mockHostConfig();
      const request = FreestylerAgent.buildRequest('test input', 'preamble');
      assert.strictEqual(request.input, 'test input');
      assert.strictEqual(request.preamble, 'preamble');
      assert.strictEqual(request.chat_history, undefined);
    });

    it('builds a request with chat history', async () => {
      mockHostConfig();
      const request = FreestylerAgent.buildRequest('test input', undefined, [
        {
          text: 'test',
          entity: Host.AidaClient.Entity.USER,
        },
      ]);
      assert.strictEqual(request.input, 'test input');
      assert.strictEqual(request.preamble, undefined);
      assert.deepStrictEqual(request.chat_history, [
        {
          text: 'test',
          entity: 1,
        },
      ]);
    });

    it('structure matches the snapshot', () => {
      mockHostConfig('test model');
      assert.deepStrictEqual(
          FreestylerAgent.buildRequest(
              'test input', 'preamble',
              [
                {
                  text: 'first',
                  entity: Host.AidaClient.Entity.UNKNOWN,
                },
                {
                  text: 'second',
                  entity: Host.AidaClient.Entity.SYSTEM,
                },
                {
                  text: 'third',
                  entity: Host.AidaClient.Entity.USER,
                },
              ]),
          {
            input: 'test input',
            client: 'CHROME_DEVTOOLS',
            preamble: 'preamble',
            chat_history: [
              {
                entity: 0,
                text: 'first',
              },
              {
                entity: 2,
                text: 'second',
              },
              {
                entity: 1,
                text: 'third',
              },
            ],
            metadata: {
              disable_user_content_logging: false,
            },
            options: {
              model_id: 'test model',
              temperature: 0,
            },
            client_feature: 2,
            functionality_type: 1,
          },
      );
    });
  });

  describe('run', () => {
    beforeEach(() => {
      mockHostConfig();
    });

    function mockAidaClient(
        generator: () => AsyncGenerator<Host.AidaClient.AidaResponse, void, void>,
        ): Host.AidaClient.AidaClient {
      return {
        async *
            fetch(
                _request: Host.AidaClient.AidaRequest,
                ): AsyncGenerator<Host.AidaClient.AidaResponse, void, void> {
              yield* generator();
            },
      };
    }

    it('generates an answer immediately', async () => {
      async function* generateAnswer() {
        yield {
          explanation: 'ANSWER: this is the answer',
          metadata: {},
        };
      }

      const execJs = sinon.spy();
      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateAnswer),
        execJs,
      });

      const steps = await Array.fromAsync(agent.run('test'));
      assert.deepStrictEqual(steps, [
        {
          step: Freestyler.Step.QUERYING,
        },
        {
          step: Freestyler.Step.ANSWER,
          text: 'this is the answer',
          rpcId: undefined,
        },
      ]);
      sinon.assert.notCalled(execJs);
      assert.deepStrictEqual(agent.chatHistoryForTesting, [
        {
          entity: 1,
          text: 'QUERY: test',
        },
        {
          entity: 2,
          text: 'ANSWER: this is the answer',
        },
      ]);
    });

    it('generates an rpcId for the answer', async () => {
      async function* generateAnswer() {
        yield {
          explanation: 'ANSWER: this is the answer',
          metadata: {
            rpcGlobalId: 123,
          },
        };
      }

      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateAnswer),
        execJs: sinon.spy(),
      });

      const steps = await Array.fromAsync(agent.run('test'));
      assert.deepStrictEqual(steps, [
        {
          step: Freestyler.Step.QUERYING,
        },
        {
          step: Freestyler.Step.ANSWER,
          text: 'this is the answer',
          rpcId: 123,
        },
      ]);
    });

    it('generates a response if nothing is returned', async () => {
      async function* generateNothing() {
        yield {
          explanation: '',
          metadata: {},
        };
      }

      const execJs = sinon.spy();
      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateNothing),
        execJs,
      });
      const steps = await Array.fromAsync(agent.run('test'));
      assert.deepStrictEqual(steps, [
        {
          step: Freestyler.Step.QUERYING,
        },
        {
          step: Freestyler.Step.ANSWER,
          text: 'Sorry, I could not help you with this query.',
          rpcId: undefined,
        },
      ]);
      sinon.assert.notCalled(execJs);
      assert.deepStrictEqual(agent.chatHistoryForTesting, [
        {
          entity: 1,
          text: 'QUERY: test',
        },
        {
          entity: 2,
          text: '',
        },
      ]);
    });

    it('generates history for multiple actions', async () => {
      let count = 0;
      async function* generateMultipleTimes() {
        if (count === 3) {
          yield {
            explanation: 'ANSWER: this is the answer',
            metadata: {},
          };
          return;
        }
        count++;
        yield {
          explanation: `THOUGHT: thought ${count}\nACTION\nconsole.log('test')\nSTOP\n`,
          metadata: {},
        };
      }

      const execJs = sinon.spy();
      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateMultipleTimes),
        execJs,
      });

      await Array.fromAsync(agent.run('test'));

      assert.deepStrictEqual(agent.chatHistoryForTesting, [
        {
          entity: 1,
          text: 'QUERY: test',
        },
        {
          entity: 2,
          text: 'THOUGHT: thought 1\nACTION\nconsole.log(\'test\')\nSTOP\n',
        },
        {
          entity: 1,
          text: 'OBSERVATION: undefined',
        },
        {
          entity: 2,
          text: 'THOUGHT: thought 2\nACTION\nconsole.log(\'test\')\nSTOP\n',
        },
        {
          entity: 1,
          text: 'OBSERVATION: undefined',
        },
        {
          entity: 2,
          text: 'THOUGHT: thought 3\nACTION\nconsole.log(\'test\')\nSTOP\n',
        },
        {
          entity: 1,
          text: 'OBSERVATION: undefined',
        },
        {
          entity: 2,
          text: 'ANSWER: this is the answer',
        },
      ]);
    });

    it('stops when aborted', async () => {
      let count = 0;
      async function* generateMultipleTimes() {
        if (count === 3) {
          yield {
            explanation: 'ANSWER: this is the answer',
            metadata: {},
          };
          return;
        }
        count++;
        yield {
          explanation: `THOUGHT: thought ${count}\nACTION\nconsole.log('test')\nSTOP\n`,
          metadata: {},
        };
      }

      const execJs = sinon.spy();
      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateMultipleTimes),
        execJs,
      });

      const controller = new AbortController();
      controller.abort();
      await Array.fromAsync(agent.run('test', {signal: controller.signal}));

      assert.deepStrictEqual(agent.chatHistoryForTesting, []);
    });
  });
});
