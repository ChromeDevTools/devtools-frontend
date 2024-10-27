// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Host from '../../core/host/host.js';
import {describeWithEnvironment, getGetHostConfigStub} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as TimelineUtils from '../timeline/utils/utils.js';

import {DrJonesPerformanceAgent, ResponseType} from './freestyler.js';

describeWithEnvironment('DrJonesPerformanceAgent', () => {
  function mockHostConfig(modelId?: string, temperature?: number) {
    getGetHostConfigStub({
      devToolsAiAssistancePerformanceAgentDogfood: {
        modelId,
        temperature,
      },
    });
  }

  function mockAidaClient(
      fetch: () => AsyncGenerator<Host.AidaClient.AidaResponse, void, void>,
      ): Host.AidaClient.AidaClient {
    return {
      fetch,
      registerClientEvent: () => Promise.resolve({}),
    };
  }

  describe('buildRequest', () => {
    beforeEach(() => {
      sinon.restore();
    });

    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      const agent = new DrJonesPerformanceAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({input: 'test input'}).options?.model_id,
          'test model',
      );
    });

    it('builds a request with a temperature', async () => {
      mockHostConfig('test model', 1);
      const agent = new DrJonesPerformanceAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({input: 'test input'}).options?.temperature,
          1,
      );
    });

    it('structure matches the snapshot', () => {
      mockHostConfig('test model');
      sinon.stub(crypto, 'randomUUID').returns('sessionId' as `${string}-${string}-${string}-${string}-${string}`);
      const agent = new DrJonesPerformanceAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
        serverSideLoggingEnabled: true,
      });
      sinon.stub(agent, 'preamble').value('preamble');
      agent.chatNewHistoryForTesting = new Map([[
        0,
        [
          {
            type: ResponseType.QUERYING,
            query: 'question',
          },
          {
            type: ResponseType.ANSWER,
            text: 'answer',
          },
        ],
      ]]);
      assert.deepStrictEqual(
          agent.buildRequest({
            input: 'test input',
          }),
          {
            input: 'test input',
            client: 'CHROME_DEVTOOLS',
            preamble: 'preamble',
            chat_history: [
              {
                entity: 1,
                text: 'question',
              },
              {
                entity: 2,
                text: 'answer',
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
            client_feature: 8,
            functionality_type: 1,
          },
      );
    });
  });
  describe('run', function() {
    it('generates an answer', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-outermost-frames.json.gz');
      // A basic Layout.
      const layoutEvt = parsedTrace.Renderer.allTraceEntries.find(event => event.ts === 465457096322);
      assert.exists(layoutEvt);
      const aiCallTree =
          TimelineUtils.AICallTree.AICallTree.from(layoutEvt, parsedTrace.Renderer.allTraceEntries, parsedTrace);
      assert.exists(aiCallTree);

      async function* generateAnswer() {
        yield {
          explanation: 'This is the answer',
          metadata: {
            rpcGlobalId: 123,
          },
          completed: true,
        };
      }

      const agent = new DrJonesPerformanceAgent({
        aidaClient: mockAidaClient(generateAnswer),
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: aiCallTree}));
      const expectedData = '\n\n' +
          `


# Call tree:

Node: 1 – Task
dur: 3
Children:
  * 2 – Layout

Node: 2 – Layout
Selected: true
dur: 3
self: 3
`.trim();

      assert.deepStrictEqual(responses, [
        {
          type: ResponseType.USER_QUERY,
          query: 'test',
        },
        {
          type: ResponseType.CONTEXT,
          title: 'Analyzing call tree',
          details: [
            {title: 'Selected call tree', text: expectedData},
          ],
        },
        {
          type: ResponseType.QUERYING,
          query: `\n${expectedData}\n\n# User request\n\ntest`,
        },
        {
          type: ResponseType.ANSWER,
          text: 'This is the answer',
          suggestions: undefined,
          rpcId: 123,
        },
      ]);

      assert.deepStrictEqual(agent.chatHistoryForTesting, [
        {
          entity: 1,
          text: `\n${aiCallTree.serialize()}\n\n# User request\n\ntest`,
        },
        {
          entity: 2,
          text: 'This is the answer',
        },
      ]);
    });
  });
});
