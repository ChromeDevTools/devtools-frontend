// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment, getGetHostConfigStub} from '../../testing/EnvironmentHelpers.js';
import {makeCompleteEvent, makeProfileCall} from '../../testing/TraceHelpers.js';

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
  describe('run', function() {
    const evaluateScript = makeCompleteEvent(Trace.Types.Events.Name.EVALUATE_SCRIPT, 0, 500);
    const v8Run = makeCompleteEvent('v8.run', 10, 490);
    const parseFunction = makeCompleteEvent('V8.ParseFunction', 12, 1);
    const traceEvents: Trace.Types.Events.Event[] = [evaluateScript, v8Run, parseFunction];
    const profileCalls = [makeProfileCall('a', 100, 200), makeProfileCall('b', 300, 200)];

    // Roughly this looks like:
    // 0                                          500
    // |------------- EvaluateScript -------------|
    //  |-        v8.run                         -|
    //    |--|   |-    a   -||-          b        |
    //      ^ V8.ParseFunction

    const allEntries = Trace.Helpers.Trace.mergeEventsInOrder(traceEvents, profileCalls);
    const {entryToNode} = Trace.Helpers.TreeHelpers.treify(allEntries, {filter: {has: () => true}});
    const selectedNode = entryToNode.get(v8Run);
    assert.exists(selectedNode);

    const aiNodeTree = Trace.Helpers.TreeHelpers.AINode.fromEntryNode(selectedNode, () => true);
    const v8RunNode = Trace.Helpers.TreeHelpers.AINode.getSelectedNodeWithinTree(aiNodeTree);
    assert.exists(aiNodeTree);
    assert.exists(v8RunNode);

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

      // Select the v8.run node
      v8RunNode.selected = true;
      const responses = await Array.fromAsync(agent.run('test', {selected: aiNodeTree}));

      assert.deepStrictEqual(responses, [
        {
          type: ResponseType.CONTEXT,
          title: 'Analyzing stack',
          details: [
            {
              title: 'Selected stack',
              text: JSON.stringify({
                name: 'EvaluateScript',
                dur: 0.5,
                self: 0,
                children: [{
                  selected: true,
                  name: 'v8.run',
                  dur: 0.5,
                  self: 0.1,
                  children: [
                    {name: 'V8.ParseFunction', dur: 0, self: 0},
                    {name: 'a', url: '', dur: 0.2, self: 0.2},
                    {name: 'b', url: '', dur: 0.2, self: 0.2},
                  ],
                }],
              }),
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
          text: `# Selected stack trace\n${JSON.stringify(aiNodeTree)}\n\n# User request\n\ntest`,
        },
        {
          entity: 2,
          text: 'This is the answer',
        },
      ]);
    });
  });
});
