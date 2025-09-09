// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {
  describeWithEnvironment,
  restoreUserAgentForTesting,
  setUserAgentForTesting,
  updateHostConfig
} from '../../../testing/EnvironmentHelpers.js';
import {getInsightOrError} from '../../../testing/InsightHelpers.js';
import {allThreadEntriesInTrace} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../../trace/trace.js';
import {
  type ActionResponse,
  ConversationType,
  PerformanceAgent,
  PerformanceTraceContext,
  PerformanceTraceFormatter,
  ResponseType,
} from '../ai_assistance.js';

describeWithEnvironment('PerformanceAgent', () => {
  function mockHostConfig(modelId?: string, temperature?: number) {
    updateHostConfig({
      devToolsAiAssistancePerformanceAgent: {
        modelId,
        temperature,
      },
    });
  }

  describe('buildRequest', () => {
    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      const agent = new PerformanceAgent(
          {
            aidaClient: {} as Host.AidaClient.AidaClient,
          },
          ConversationType.PERFORMANCE_CALL_TREE);
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.model_id,
          'test model',
      );
    });

    it('builds a request with a temperature', async () => {
      mockHostConfig('test model', 1);
      const agent = new PerformanceAgent(
          {
            aidaClient: {} as Host.AidaClient.AidaClient,
          },
          ConversationType.PERFORMANCE_CALL_TREE);
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.temperature,
          1,
      );
    });

    it('structure matches the snapshot', async () => {
      mockHostConfig('test model');
      sinon.stub(crypto, 'randomUUID').returns('sessionId' as `${string}-${string}-${string}-${string}-${string}`);
      const agent = new PerformanceAgent(
          {
            aidaClient: mockAidaClient([[{explanation: 'answer'}]]),
            serverSideLoggingEnabled: true,
          },
          ConversationType.PERFORMANCE_CALL_TREE);

      await Array.fromAsync(agent.run('question', {selected: null}));
      setUserAgentForTesting();

      assert.deepEqual(
          agent.buildRequest(
              {
                text: 'test input',
              },
              Host.AidaClient.Role.USER),
          {
            current_message: {role: Host.AidaClient.Role.USER, parts: [{text: 'test input'}]},
            client: 'CHROME_DEVTOOLS',
            preamble: undefined,
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
            facts: undefined,
            metadata: {
              disable_user_content_logging: false,
              string_session_id: 'sessionId',
              user_tier: 2,
              client_version: 'unit_test',
            },
            options: {
              model_id: 'test model',
              temperature: undefined,
            },
            client_feature: 8,
            functionality_type: 1,
          },
      );
      restoreUserAgentForTesting();
    });
  });
});

describeWithEnvironment('PerformanceAgent – call tree focus', () => {
  describe('getOrigin()', () => {
    it('calculates the origin of the selected node when it has a URL associated with it', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      // An Evaluate Script event, picked because it has a URL of googletagmanager.com/...
      const evalScriptEvent =
          allThreadEntriesInTrace(parsedTrace)
              .find(event => event.name === Trace.Types.Events.Name.EVALUATE_SCRIPT && event.ts === 122411195649);
      assert.exists(evalScriptEvent);
      const aiCallTree = TimelineUtils.AICallTree.AICallTree.fromEvent(evalScriptEvent, parsedTrace);
      assert.isOk(aiCallTree);
      const context = PerformanceTraceContext.fromCallTree(aiCallTree);
      assert.strictEqual(context.getOrigin(), 'https://www.googletagmanager.com');
    });

    it('returns a random but deterministic "origin" for nodes that have no URL associated', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      // A random layout event with no URL associated
      const layoutEvent =
          allThreadEntriesInTrace(parsedTrace)
              .find(event => event.name === Trace.Types.Events.Name.LAYOUT && event.ts === 122411130078);
      assert.exists(layoutEvent);
      const aiCallTree = TimelineUtils.AICallTree.AICallTree.fromEvent(layoutEvent, parsedTrace);
      assert.isOk(aiCallTree);
      const context = PerformanceTraceContext.fromCallTree(aiCallTree);
      assert.strictEqual(context.getOrigin(), 'Layout_90829_259_122411130078');
    });
  });

  describe('run', function() {
    it('generates an answer', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-outermost-frames.json.gz');
      // A basic Layout.
      const layoutEvt = allThreadEntriesInTrace(parsedTrace).find(event => event.ts === 465457096322);
      assert.exists(layoutEvt);
      const aiCallTree = TimelineUtils.AICallTree.AICallTree.fromEvent(layoutEvt, parsedTrace);
      assert.exists(aiCallTree);

      const agent = new PerformanceAgent(
          {
            aidaClient: mockAidaClient([[{
              explanation: 'This is the answer',
              metadata: {
                rpcGlobalId: 123,
              },
            }]]),
          },
          ConversationType.PERFORMANCE_CALL_TREE);

      const context = PerformanceTraceContext.fromCallTree(aiCallTree);
      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const expectedData = '\n\n' +
          `


# Call tree:

1;Task;3;;;2
2;Layout;3;3;;;S`.trim();

      assert.deepEqual(responses, [
        {
          type: ResponseType.USER_QUERY,
          query: 'test',
          imageInput: undefined,
          imageId: undefined,
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
          complete: true,
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
      const agent = new PerformanceAgent(
          {
            aidaClient: {} as Host.AidaClient.AidaClient,
          },
          ConversationType.PERFORMANCE_CALL_TREE);

      const mockAiCallTree = {
        serialize: () => 'Mock call tree',
      } as unknown as TimelineUtils.AICallTree.AICallTree;

      const context1 = PerformanceTraceContext.fromCallTree(mockAiCallTree);
      const context2 = PerformanceTraceContext.fromCallTree(mockAiCallTree);
      const context3 = PerformanceTraceContext.fromCallTree(mockAiCallTree);

      const enhancedQuery1 = await agent.enhanceQuery('What is this?', context1);
      assert.strictEqual(enhancedQuery1, 'Mock call tree\n\n# User request\n\nWhat is this?');

      const query2 = 'But what about this follow-up question?';
      const enhancedQuery2 = await agent.enhanceQuery(query2, context2);
      assert.strictEqual(enhancedQuery2, query2);
      assert.isFalse(enhancedQuery2.includes(mockAiCallTree.serialize()));

      // Just making sure any subsequent chat doesnt include it either.
      const query3 = 'And this 3rd question?';
      const enhancedQuery3 = await agent.enhanceQuery(query3, context3);
      assert.strictEqual(enhancedQuery3, query3);
      assert.isFalse(enhancedQuery3.includes(mockAiCallTree.serialize()));
    });
  });
});

const FAKE_LCP_MODEL = {
  insightKey: Trace.Insights.Types.InsightKeys.LCP_BREAKDOWN,
  strings: {},
  title: 'LCP breakdown' as Common.UIString.LocalizedString,
  description: 'some description' as Common.UIString.LocalizedString,
  category: Trace.Insights.Types.InsightCategory.ALL,
  state: 'fail',
  frameId: '123',
} as const;
const FAKE_INP_MODEL = {
  insightKey: Trace.Insights.Types.InsightKeys.INP_BREAKDOWN,
  strings: {},
  title: 'INP breakdown' as Common.UIString.LocalizedString,
  description: 'some description' as Common.UIString.LocalizedString,
  category: Trace.Insights.Types.InsightCategory.ALL,
  state: 'fail',
  frameId: '123',
} as const;
const FAKE_PARSED_TRACE = {
  Meta: {traceBounds: {min: 0, max: 10}, mainFrameURL: 'https://www.example.com'},
} as unknown as Trace.Handlers.Types.ParsedTrace;
const FAKE_INSIGHTS = new Map([['', {model: {LCPBreakdown: FAKE_LCP_MODEL, INPBreakdown: FAKE_INP_MODEL}}]]) as
    unknown as Trace.Insights.Types.TraceInsightSets;
const FAKE_METADATA = {} as unknown as Trace.Types.File.MetaData;

function createAgentForInsightConversation(opts: {aidaClient?: Host.AidaClient.AidaClient} = {}) {
  return new PerformanceAgent({aidaClient: opts.aidaClient ?? mockAidaClient()}, ConversationType.PERFORMANCE_INSIGHT);
}

describeWithEnvironment('PerformanceAgent – insight focus', () => {
  it('uses the min and max bounds of the trace as the origin', async function() {
    const {parsedTrace, insights, metadata} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    assert.isOk(insights);
    const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
    const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
    const context = PerformanceTraceContext.fromInsight(parsedTrace, insights, metadata, lcpBreakdown);
    assert.strictEqual(context.getOrigin(), 'trace-658799706428-658804825864');
  });

  it('outputs the right title for the selected insight', async () => {
    const context =
        PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_INSIGHTS, FAKE_METADATA, FAKE_LCP_MODEL);
    assert.strictEqual(context.getTitle(), 'Trace: www.example.com');
  });

  // See b/405054694 for context on why we do this.
  describe('parsing text responses', () => {
    it('strips out 5 backticks if the response has them', async () => {
      const agent = createAgentForInsightConversation();
      const response = agent.parseTextResponse('`````hello world`````');
      assert.deepEqual(response, {answer: 'hello world'});
    });

    it('strips any newlines before the backticks', async () => {
      const agent = createAgentForInsightConversation();
      const response = agent.parseTextResponse('\n\n`````hello world`````');
      assert.deepEqual(response, {answer: 'hello world'});
    });

    it('does not strip the backticks if the response does not fully start and end with them', async () => {
      const agent = createAgentForInsightConversation();
      const response = agent.parseTextResponse('answer: `````hello world`````');
      assert.deepEqual(response, {answer: 'answer: `````hello world`````'});
    });

    it('does not strip the backticks in the middle of the response even if the response is also wrapped', async () => {
      const agent = createAgentForInsightConversation();
      const response = agent.parseTextResponse('`````hello ````` world`````');
      assert.deepEqual(response, {answer: 'hello ````` world'});
    });

    it('does not strip out inline code backticks', async () => {
      const agent = createAgentForInsightConversation();
      const response = agent.parseTextResponse('This is code `console.log("hello")`');
      assert.deepEqual(response, {answer: 'This is code `console.log("hello")`'});
    });

    it('does not strip out code block 3 backticks', async () => {
      const agent = createAgentForInsightConversation();
      const response = agent.parseTextResponse(`\`\`\`
code
\`\`\``);
      assert.deepEqual(response, {
        answer: `\`\`\`
code
\`\`\``
      });
    });
  });

  describe('handleContextDetails', () => {
    it('outputs the right context for the initial query from the user', async function() {
      const {parsedTrace, insights, metadata} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(insights);
      const context = PerformanceTraceContext.fromInsight(parsedTrace, insights, metadata, FAKE_LCP_MODEL);
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient([[{
          explanation: 'This is the answer',
          metadata: {
            rpcGlobalId: 123,
          }
        }]])
      });

      const expectedDetailText =
          new PerformanceTraceFormatter(context.getItem(), new Trace.EventsSerializer.EventsSerializer())
              .formatTraceSummary();

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      assert.deepEqual(responses, [
        {
          type: ResponseType.USER_QUERY,
          query: 'test',
          imageInput: undefined,
          imageId: undefined,
        },
        {
          type: ResponseType.CONTEXT,
          title: 'Analyzing trace',
          details: [
            {title: 'Trace', text: expectedDetailText},
          ],
        },
        {
          type: ResponseType.QUERYING,
        },
        {
          type: ResponseType.ANSWER,
          text: 'This is the answer',
          complete: true,
          suggestions: undefined,
          rpcId: 123,
        },
      ]);
    });
  });

  describe('enhanceQuery', () => {
    it('adds the context to the query from the user', async () => {
      const agent = createAgentForInsightConversation({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });

      const context =
          PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_INSIGHTS, FAKE_METADATA, FAKE_LCP_MODEL);
      const finalQuery = await agent.enhanceQuery('What is this?', context);
      const expected =
          `User clicked on the LCPBreakdown insight, and then asked a question.\n\n# User question for you to answer:\nWhat is this?`;

      assert.strictEqual(finalQuery, expected);
    });

    it('does not add the context for follow-up queries with the same context', async () => {
      const agent = createAgentForInsightConversation({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });

      const context =
          PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_INSIGHTS, FAKE_METADATA, FAKE_LCP_MODEL);

      await agent.enhanceQuery('What is this?', context);
      const finalQuery = await agent.enhanceQuery('Help me understand?', context);
      const expected = `# User question for you to answer:
Help me understand?`;

      assert.strictEqual(finalQuery, expected);
    });

    it('does add context to queries if the insight context changes', async () => {
      const agent = createAgentForInsightConversation({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      const context1 =
          PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_INSIGHTS, FAKE_METADATA, FAKE_LCP_MODEL);
      const context2 =
          PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_INSIGHTS, FAKE_METADATA, FAKE_INP_MODEL);
      const firstQuery = await agent.enhanceQuery('Q1', context1);
      const secondQuery = await agent.enhanceQuery('Q2', context1);
      const thirdQuery = await agent.enhanceQuery('Q3', context2);
      assert.include(firstQuery, 'User clicked on the LCPBreakdown');
      assert.notInclude(secondQuery, 'User clicked on the');
      assert.include(thirdQuery, 'User clicked on the INPBreakdown');
    });
  });

  describe('function calls', () => {
    it('can call getNetworkTrackSummary', async function() {
      const metricsSpy = sinon.spy(Host.userMetrics, 'performanceAINetworkSummaryResponseSize');
      const {parsedTrace, insights, metadata} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const bounds = parsedTrace.Meta.traceBounds;
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient([
          [{
            explanation: '',
            functionCalls: [{name: 'getNetworkTrackSummary', args: {min: bounds.min, max: bounds.max}}]
          }],
          [{explanation: 'done'}]
        ])
      });
      const context = PerformanceTraceContext.fromInsight(parsedTrace, insights, metadata, lcpBreakdown);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === ResponseType.ACTION);

      // Find the requests we expect the handler to have returned.
      const expectedRequestUrls = [
        'https://chromedevtools.github.io/performance-stories/lcp-large-image/index.html',
        'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800',
        'https://chromedevtools.github.io/performance-stories/lcp-large-image/app.css',
        'https://via.placeholder.com/50.jpg', 'https://via.placeholder.com/2000.jpg'
      ];

      expectedRequestUrls.forEach(url => {
        const match = parsedTrace.NetworkRequests.byTime.find(r => r.args.data.url === url);
        assert.isOk(match, `no request found for ${url}`);
      });

      const formatter = new PerformanceTraceFormatter(context.getItem(), new Trace.EventsSerializer.EventsSerializer());
      const expectedRequestsOutput = formatter.formatNetworkTrackSummary(bounds);

      const expectedBytesSize = Platform.StringUtilities.countWtf8Bytes(expectedRequestsOutput);
      sinon.assert.calledWith(metricsSpy, expectedBytesSize);

      const expectedOutput = JSON.stringify({summary: expectedRequestsOutput});
      const titleResponse = responses.find(response => response.type === ResponseType.TITLE);
      assert.exists(titleResponse);
      assert.strictEqual(titleResponse.title, 'Investigating network activity…');

      assert.exists(action);
      assert.deepEqual(action, {
        type: 'action' as ActionResponse['type'],
        output: expectedOutput,
        code: 'getNetworkTrackSummary({min: 658799706428, max: 658804825864})',
        canceled: false
      });
    });

    it('can call getMainThreadTrackSummary', async function() {
      const metricsSpy = sinon.spy(Host.userMetrics, 'performanceAIMainThreadActivityResponseSize');

      const {parsedTrace, insights, metadata} = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const bounds = parsedTrace.Meta.traceBounds;
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient([
          [{
            explanation: '',
            functionCalls: [{name: 'getMainThreadTrackSummary', args: {min: bounds.min, max: bounds.max}}]
          }],
          [{explanation: 'done'}]
        ])
      });
      const context = PerformanceTraceContext.fromInsight(parsedTrace, insights, metadata, lcpBreakdown);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const titleResponse = responses.find(response => response.type === ResponseType.TITLE);
      assert.exists(titleResponse);
      assert.strictEqual(titleResponse.title, 'Investigating main thread activity…');

      const action = responses.find(response => response.type === ResponseType.ACTION);
      assert.exists(action);

      const formatter = new PerformanceTraceFormatter(context.getItem(), new Trace.EventsSerializer.EventsSerializer());
      const summary = formatter.formatMainThreadTrackSummary(bounds);
      assert.isOk(summary);

      const expectedBytesSize = Platform.StringUtilities.countWtf8Bytes(summary);
      sinon.assert.calledWith(metricsSpy, expectedBytesSize);

      const expectedOutput = JSON.stringify({summary});

      assert.deepEqual(action, {
        type: 'action' as ActionResponse['type'],
        output: expectedOutput,
        code: 'getMainThreadTrackSummary({min: 197695826524, max: 197698633660})',
        canceled: false
      });
    });

    it('will not send facts from a previous insight if the context changes', async function() {
      const {parsedTrace, insights, metadata} = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const renderBlocking = getInsightOrError('RenderBlocking', insights, firstNav);
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getMainThreadTrackSummary', args: {}}]}],
        ])
      });
      const lcpContext = PerformanceTraceContext.fromInsight(parsedTrace, insights, metadata, lcpBreakdown);
      const renderBlockingContext =
          PerformanceTraceContext.fromInsight(parsedTrace, insights, metadata, renderBlocking);

      // Populate the function calls for the LCP Context
      await Array.fromAsync(agent.run('test 1 LCP', {selected: lcpContext}));
      assert.strictEqual(agent.currentFacts().size, 6);  // always adds 6 facts for high-level summary of trace.
      await Array.fromAsync(agent.run('test 2 LCP', {selected: lcpContext}));
      assert.strictEqual(agent.currentFacts().size, 7);  // added the function call as a fact.
      // Now change the context and send a request.
      await Array.fromAsync(agent.run('test 1 RenderBlocking', {selected: renderBlockingContext}));
      assert.strictEqual(agent.currentFacts().size, 6);  // back to 6.
    });

    it('will cache function calls as facts', async function() {
      const {parsedTrace, insights, metadata} = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getMainThreadTrackSummary', args: {}}]}],
          [{explanation: '', functionCalls: [{name: 'getNetworkTrackSummary', args: {}}]}], [{explanation: 'done'}]
        ])
      });
      const context = PerformanceTraceContext.fromInsight(parsedTrace, insights, metadata, lcpBreakdown);
      await Array.fromAsync(agent.run('test 1', {selected: context}));
      await Array.fromAsync(agent.run('test 2', {selected: context}));
      // First 6 are the always included high-level facts. The rests are from the function calls.
      assert.deepEqual(
          Array.from(
              agent.currentFacts(),
              fact => {
                return fact.metadata.source;
              }),
          [
            'devtools', 'devtools', 'devtools', 'devtools', 'devtools', 'devtools',
            'getMainThreadTrackSummary({min: 197695826524, max: 197698633660})',
            'getNetworkTrackSummary({min: 197695826524, max: 197698633660})'
          ]);
    });
  });
});

describeWithEnvironment('PerformanceAgent – all focus', () => {
  it('uses the min and max bounds of the trace as the origin', async function() {
    const {parsedTrace, insights, metadata} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    assert.isOk(insights);
    const context = PerformanceTraceContext.full(parsedTrace, insights, metadata);
    assert.strictEqual(context.getOrigin(), 'trace-658799706428-658804825864');
  });
});
