// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as Trace from '../../../models/trace/trace.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TimelineUtils from '../../timeline/utils/utils.js';
import {CallTreeContext, PerformanceAgent, ResponseType} from '../ai_assistance.js';

describeWithEnvironment('PerformanceAgent', () => {
  function mockHostConfig(modelId?: string, temperature?: number) {
    Object.assign(Root.Runtime.hostConfig, {
      devToolsAiAssistancePerformanceAgent: {
        modelId,
        temperature,
      },
    });
  }

  describe('getOrigin()', () => {
    it('calculates the origin of the selected node when it has a URL associated with it', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      // An Evaluate Script event, picked because it has a URL of googletagmanager.com/...
      const evalScriptEvent = parsedTrace.Renderer.allTraceEntries.find(
          event => event.name === Trace.Types.Events.Name.EVALUATE_SCRIPT && event.ts === 122411195649);
      assert.exists(evalScriptEvent);
      const aiCallTree = TimelineUtils.AICallTree.AICallTree.from(evalScriptEvent, parsedTrace);
      assert.isOk(aiCallTree);
      const callTreeContext = new CallTreeContext(aiCallTree);
      assert.strictEqual(callTreeContext.getOrigin(), 'https://www.googletagmanager.com');
    });

    it('returns a random but deterministic "origin" for nodes that have no URL associated', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      // A random layout event with no URL associated
      const layoutEvent = parsedTrace.Renderer.allTraceEntries.find(
          event => event.name === Trace.Types.Events.Name.LAYOUT && event.ts === 122411130078);
      assert.exists(layoutEvent);
      const aiCallTree = TimelineUtils.AICallTree.AICallTree.from(layoutEvent, parsedTrace);
      assert.isOk(aiCallTree);
      const callTreeContext = new CallTreeContext(aiCallTree);
      assert.strictEqual(callTreeContext.getOrigin(), 'Layout_90829_259_122411130078');
    });
  });

  describe('buildRequest', () => {
    beforeEach(() => {
      sinon.restore();
    });

    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      const agent = new PerformanceAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.model_id,
          'test model',
      );
    });

    it('builds a request with a temperature', async () => {
      mockHostConfig('test model', 1);
      const agent = new PerformanceAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.temperature,
          1,
      );
    });

    it('structure matches the snapshot', async () => {
      mockHostConfig('test model');
      sinon.stub(crypto, 'randomUUID').returns('sessionId' as `${string}-${string}-${string}-${string}-${string}`);
      const agent = new PerformanceAgent({
        aidaClient: mockAidaClient([[{explanation: 'answer'}]]),
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
                parts: [{text: 'question'}],
              },
              {
                role: 2,
                parts: [{text: 'answer'}],
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
      const aiCallTree = TimelineUtils.AICallTree.AICallTree.from(layoutEvt, parsedTrace);
      assert.exists(aiCallTree);

      const agent = new PerformanceAgent({
        aidaClient: mockAidaClient([[{
          explanation: 'This is the answer',
          metadata: {
            rpcGlobalId: 123,
          },
        }]]),
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: new CallTreeContext(aiCallTree)}));
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

      assert.deepEqual(responses, [
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
        },
        {
          type: ResponseType.ANSWER,
          text: 'This is the answer',
          suggestions: undefined,
          rpcId: 123,
        },
      ]);

      assert.deepEqual(agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts, [
        {
          role: 1,
          parts: [{text: `${aiCallTree.serialize()}\n\n# User request\n\ntest`}],
        },
        {
          role: 2,
          parts: [{text: 'This is the answer'}],
        },
      ]);
    });
  });

  describe('enhanceQuery', () => {
    it('does not send the serialized calltree again if it is a followup chat about the same calltree', async () => {
      const agent = new PerformanceAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });

      const mockAiCallTree = {
        serialize: () => 'Mock call tree',
      } as unknown as TimelineUtils.AICallTree.AICallTree;

      const enhancedQuery1 = await agent.enhanceQuery('What is this?', new CallTreeContext(mockAiCallTree));
      assert.strictEqual(enhancedQuery1, 'Mock call tree\n\n# User request\n\nWhat is this?');

      const query2 = 'But what about this follow-up question?';
      const enhancedQuery2 = await agent.enhanceQuery(query2, new CallTreeContext(mockAiCallTree));
      assert.strictEqual(enhancedQuery2, query2);
      assert.isFalse(enhancedQuery2.includes(mockAiCallTree.serialize()));

      // Just making sure any subsequent chat doesnt include it either.
      const query3 = 'And this 3rd question?';
      const enhancedQuery3 = await agent.enhanceQuery(query3, new CallTreeContext(mockAiCallTree));
      assert.strictEqual(enhancedQuery3, query3);
      assert.isFalse(enhancedQuery3.includes(mockAiCallTree.serialize()));
    });
  });
});
