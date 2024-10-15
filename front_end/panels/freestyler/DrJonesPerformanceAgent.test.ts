// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Trace from '../../models/trace/trace.js';
import {
  describeWithEnvironment,
  getGetHostConfigStub,
} from '../../testing/EnvironmentHelpers.js';

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
      agent.chatHistoryForTesting = new Map([[
        0,
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
  describe('run', () => {
    const rootNodeEntry =
        new Trace.Helpers.TreeHelpers.TraceEntryNodeForAI('RunTask', Trace.Types.Timing.MilliSeconds(0));
    const node1 = new Trace.Helpers.TreeHelpers.TraceEntryNodeForAI('ProfileCall', Trace.Types.Timing.MilliSeconds(1));
    const node2 = new Trace.Helpers.TreeHelpers.TraceEntryNodeForAI('ProfileCall', Trace.Types.Timing.MilliSeconds(2));
    const node3 = new Trace.Helpers.TreeHelpers.TraceEntryNodeForAI('ProfileCall', Trace.Types.Timing.MilliSeconds(10));
    const node4 = new Trace.Helpers.TreeHelpers.TraceEntryNodeForAI('ProfileCall', Trace.Types.Timing.MilliSeconds(11));
    const node5 = new Trace.Helpers.TreeHelpers.TraceEntryNodeForAI('ProfileCall', Trace.Types.Timing.MilliSeconds(15));

    beforeEach(() => {
      rootNodeEntry.children = [node1, node3];
      node1.function = 'foo';
      node1.children = [node2];
      node2.function = 'foofoo';
      node3.function = 'foo2';
      node3.children = [node4, node5];
      node4.function = 'foo2foo';
      node5.function = 'foo2foo2';
    });

    it('generates an answer', async () => {
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

      // Select node3
      node3.selected = true;
      const responses = await Array.fromAsync(agent.run('test', {selected: rootNodeEntry}));

      assert.deepStrictEqual(responses, [
        {
          type: ResponseType.CONTEXT,
          title: 'Analyzing stack trace',
          details: [
            {
              title: 'Selected stack trace',
              text: JSON.stringify(rootNodeEntry),
            },
          ],
        },
        {
          type: ResponseType.QUERYING,
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
          text: `# Selected stack trace\n${JSON.stringify(rootNodeEntry)}\n\n# User request\n\ntest`,
        },
        {
          entity: 2,
          text: 'This is the answer',
        },
      ]);
    });
  });
});
