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
import {getInsightOrError, getInsightSetOrError} from '../../../testing/InsightHelpers.js';
import {allThreadEntriesInTrace} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../../trace/trace.js';
import {
  type ActionResponse,
  ConversationType,
  PerformanceAgent,
  PerformanceInsightFormatter,
  PerformanceTraceContext,
  ResponseType,
  TraceEventFormatter
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
    beforeEach(() => {
      sinon.restore();
    });

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
const FAKE_INSIGHT_SET_BOUNDS =
    Trace.Helpers.Timing.traceWindowFromMicroSeconds(0 as Trace.Types.Timing.Micro, 0 as Trace.Types.Timing.Micro);
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
  Meta: {traceBounds: {min: 0, max: 10}},
} as unknown as Trace.Handlers.Types.ParsedTrace;

function createAgentForInsightConversation(opts: {aidaClient?: Host.AidaClient.AidaClient} = {}) {
  return new PerformanceAgent({aidaClient: opts.aidaClient ?? mockAidaClient()}, ConversationType.PERFORMANCE_INSIGHT);
}

describeWithEnvironment('PerformanceAgent – insight focus', () => {
  it('uses the min and max bounds of the trace as the origin', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    assert.isOk(insights);
    const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
    const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
    const insightSet = getInsightSetOrError(insights, firstNav);
    const context = PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown, insightSet.bounds);
    assert.strictEqual(context.getOrigin(), 'insight-658799706428-658804825864');
  });

  it('outputs the right title for the selected insight', async () => {
    const context = PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_LCP_MODEL, FAKE_INSIGHT_SET_BOUNDS);
    assert.strictEqual(context.getTitle(), 'Insight: LCP breakdown');
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
    it('outputs the right context for the initial query from the user', async () => {
      const context = PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_LCP_MODEL, FAKE_INSIGHT_SET_BOUNDS);
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient([[{
          explanation: 'This is the answer',
          metadata: {
            rpcGlobalId: 123,
          }
        }]])
      });

      const expectedDetailText = new PerformanceInsightFormatter(FAKE_PARSED_TRACE, FAKE_LCP_MODEL).formatInsight();

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
          title: 'Analyzing insight: LCP breakdown',
          details: [
            {title: 'LCP breakdown', text: expectedDetailText},
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

      const context = PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_LCP_MODEL, FAKE_INSIGHT_SET_BOUNDS);
      const extraContext = new PerformanceInsightFormatter(FAKE_PARSED_TRACE, FAKE_LCP_MODEL).formatInsight();

      const finalQuery = await agent.enhanceQuery('What is this?', context);
      const expected = `${extraContext}

# User question for you to answer:
What is this?`;

      assert.strictEqual(finalQuery, expected);
    });

    it('does not add the context for follow-up queries with the same context', async () => {
      const agent = createAgentForInsightConversation({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });

      const context = PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_LCP_MODEL, FAKE_INSIGHT_SET_BOUNDS);

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
      const context1 = PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_LCP_MODEL, FAKE_INSIGHT_SET_BOUNDS);
      const context2 = PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_INP_MODEL, FAKE_INSIGHT_SET_BOUNDS);
      const firstQuery = await agent.enhanceQuery('Q1', context1);
      const secondQuery = await agent.enhanceQuery('Q2', context1);
      const thirdQuery = await agent.enhanceQuery('Q3', context2);
      assert.include(firstQuery, '## Insight Title: LCP breakdown');
      assert.notInclude(secondQuery, '## Insight Title');
      assert.include(thirdQuery, '## Insight Title: INP breakdown');
    });
  });

  describe('function calls', () => {
    it('calls getNetworkActivitySummary and logs the response bytes size', async function() {
      const metricsSpy = sinon.spy(Host.userMetrics, 'performanceAINetworkSummaryResponseSize');
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const insightSet = getInsightSetOrError(insights, firstNav);
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getNetworkActivitySummary', args: {}}]}], [{explanation: 'done'}]
        ])
      });
      const context = PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown, insightSet.bounds);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === ResponseType.ACTION);

      // Find the requests we expect the handler to have returned.
      const expectedRequestUrls = [
        'https://chromedevtools.github.io/performance-stories/lcp-large-image/index.html',
        'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800',
        'https://chromedevtools.github.io/performance-stories/lcp-large-image/app.css',
        'https://via.placeholder.com/50.jpg', 'https://via.placeholder.com/2000.jpg'
      ];

      const requests = expectedRequestUrls.map(url => {
        const match = parsedTrace.NetworkRequests.byTime.find(r => r.args.data.url === url);
        assert.isOk(match, `no request found for ${url}`);
        return match;
      });

      const expectedRequestsOutput = TraceEventFormatter.networkRequests(requests, parsedTrace);

      const expectedBytesSize = Platform.StringUtilities.countWtf8Bytes(expectedRequestsOutput);
      sinon.assert.calledWith(metricsSpy, expectedBytesSize);

      const expectedOutput = JSON.stringify({requests: expectedRequestsOutput});
      const titleResponse = responses.find(response => response.type === ResponseType.TITLE);
      assert.exists(titleResponse);
      assert.strictEqual(titleResponse.title, 'Investigating network activity…');

      assert.exists(action);
      assert.deepEqual(action, {
        type: 'action' as ActionResponse['type'],
        output: expectedOutput,
        code: 'getNetworkActivitySummary()',
        canceled: false
      });
    });

    it('can call getNetworkRequestDetail to get detail about a single request', async function() {
      const metricsSpy = sinon.spy(Host.userMetrics, 'performanceAINetworkRequestDetailResponseSize');

      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const insightSet = getInsightSetOrError(insights, firstNav);
      const requestUrl = 'https://chromedevtools.github.io/performance-stories/lcp-large-image/app.css';
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getNetworkRequestDetail', args: {url: requestUrl}}]}],
          [{explanation: 'done'}]
        ])
      });
      const context = PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown, insightSet.bounds);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const titleResponse = responses.find(response => response.type === ResponseType.TITLE);
      assert.exists(titleResponse);
      assert.strictEqual(titleResponse.title, `Investigating network request ${requestUrl}…`);
      const action = responses.find(response => response.type === ResponseType.ACTION);
      const request = parsedTrace.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);

      const expectedRequestOutput = TraceEventFormatter.networkRequests([request], parsedTrace, {verbose: true});
      const expectedOutput = JSON.stringify({request: expectedRequestOutput});

      const expectedBytesSize = Platform.StringUtilities.countWtf8Bytes(expectedRequestOutput);
      sinon.assert.calledWith(metricsSpy, expectedBytesSize);

      assert.exists(action);
      assert.deepEqual(action, {
        type: 'action' as ActionResponse['type'],
        output: expectedOutput,
        code: `getNetworkRequestDetail('${requestUrl}')`,
        canceled: false
      });
    });

    it('calls getMainThreadActivity', async function() {
      const metricsSpy = sinon.spy(Host.userMetrics, 'performanceAIMainThreadActivityResponseSize');

      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const insightSet = getInsightSetOrError(insights, firstNav);
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient(
            [[{explanation: '', functionCalls: [{name: 'getMainThreadActivity', args: {}}]}], [{explanation: 'done'}]])
      });
      const context = PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown, insightSet.bounds);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const titleResponse = responses.find(response => response.type === ResponseType.TITLE);
      assert.exists(titleResponse);
      assert.strictEqual(titleResponse.title, 'Investigating main thread activity…');

      const action = responses.find(response => response.type === ResponseType.ACTION);
      assert.exists(action);

      const expectedTree = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivityForInsight(
          lcpBreakdown, insightSet.bounds, parsedTrace);
      assert.isOk(expectedTree);

      const expectedBytesSize = Platform.StringUtilities.countWtf8Bytes(expectedTree.serialize());
      sinon.assert.calledWith(metricsSpy, expectedBytesSize);

      const expectedOutput = JSON.stringify({activity: expectedTree.serialize()});

      assert.deepEqual(action, {
        type: 'action' as ActionResponse['type'],
        output: expectedOutput,
        code: 'getMainThreadActivity()',
        canceled: false
      });
    });

    it('caches getNetworkActivitySummary calls and passes them to future requests as facts', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const insightSet = getInsightSetOrError(insights, firstNav);
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getNetworkActivitySummary', args: {}}]}], [{explanation: 'done'}]
        ])
      });
      const context = PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown, insightSet.bounds);

      // Make the first query to trigger the getNetworkActivitySummary function
      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === ResponseType.ACTION);
      assert.exists(action);
      assert.strictEqual(action.code, 'getNetworkActivitySummary()');

      // Trigger another request so that the agent populates the facts.
      await Array.fromAsync(agent.run('test 2', {selected: context}));

      assert.strictEqual(agent.currentFacts().size, 1);
      const networkSummaryFact = Array.from(agent.currentFacts()).at(0);
      assert.exists(networkSummaryFact);

      const expectedRequestUrls = [
        'https://chromedevtools.github.io/performance-stories/lcp-large-image/index.html',
        'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800',
        'https://chromedevtools.github.io/performance-stories/lcp-large-image/app.css',
        'https://via.placeholder.com/50.jpg', 'https://via.placeholder.com/2000.jpg'
      ];
      // Ensure that each URL was in the fact as a way to validate the fact is accurate.
      assert.isTrue(expectedRequestUrls.every(url => {
        return networkSummaryFact.text.includes(url);
      }));

      // Now we make one more request; we do this to ensure that we don't add the same fact again.
      await Array.fromAsync(agent.run('test 3', {selected: context}));

      assert.strictEqual(agent.currentFacts().size, 1);
    });

    it('caches getMainThreadActivity calls and passes them to future requests as facts', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const insightSet = getInsightSetOrError(insights, firstNav);
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient(
            [[{explanation: '', functionCalls: [{name: 'getMainThreadActivity', args: {}}]}], [{explanation: 'done'}]])
      });
      const context = PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown, insightSet.bounds);

      // Make the first query to trigger the getMainThreadActivity function
      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === ResponseType.ACTION);
      assert.exists(action);
      assert.strictEqual(action.code, 'getMainThreadActivity()');

      // Trigger another request so that the agent populates the facts.
      await Array.fromAsync(agent.run('test 2', {selected: context}));

      assert.strictEqual(agent.currentFacts().size, 1);
      const mainThreadActivityFact = Array.from(agent.currentFacts()).at(0);
      assert.exists(mainThreadActivityFact);

      const expectedTree = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivityForInsight(
          lcpBreakdown, insightSet.bounds, parsedTrace);
      assert.isOk(expectedTree);
      assert.include(mainThreadActivityFact.text, expectedTree.serialize());

      // Now we make one more request; we do this to ensure that we don't add the same fact again.
      await Array.fromAsync(agent.run('test 3', {selected: context}));

      assert.strictEqual(agent.currentFacts().size, 1);
    });

    it('will not send facts from a previous insight if the context changes', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const insightSet = getInsightSetOrError(insights, firstNav);
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const renderBlocking = getInsightOrError('RenderBlocking', insights, firstNav);
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getMainThreadActivity', args: {}}]}],
        ])
      });
      const lcpContext = PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown, insightSet.bounds);
      const renderBlockingContext = PerformanceTraceContext.fromInsight(parsedTrace, renderBlocking, insightSet.bounds);

      // Populate the function calls for the LCP Context
      await Array.fromAsync(agent.run('test 1 LCP', {selected: lcpContext}));
      await Array.fromAsync(agent.run('test 2 LCP', {selected: lcpContext}));
      assert.strictEqual(agent.currentFacts().size, 1);
      // Now change the context and send a request.
      await Array.fromAsync(agent.run('test 1 RenderBlocking', {selected: renderBlockingContext}));
      // Because the context changed, we should now not have any facts.
      assert.strictEqual(agent.currentFacts().size, 0);
    });

    it('will send multiple facts', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const insightSet = getInsightSetOrError(insights, firstNav);
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getMainThreadActivity', args: {}}]}],
          [{explanation: '', functionCalls: [{name: 'getNetworkActivitySummary', args: {}}]}], [{explanation: 'done'}]
        ])
      });
      const context = PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown, insightSet.bounds);
      // First query to populate the function calls
      await Array.fromAsync(agent.run('test 1', {selected: context}));
      // Second query should have two facts
      await Array.fromAsync(agent.run('test 2', {selected: context}));
      assert.deepEqual(Array.from(agent.currentFacts(), fact => {
        return fact.metadata.source;
      }), ['getMainThreadActivity()', 'getNetworkActivitySummary()']);
    });

    it('sends network description text as a fact when `getNetworkActivitySummary` is called', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const insightSet = getInsightSetOrError(insights, firstNav);
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const agent = createAgentForInsightConversation({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getNetworkActivitySummary', args: {}}]}],
        ])
      });
      const context = PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown, insightSet.bounds);
      await Array.fromAsync(agent.run('test 1', {selected: context}));
      assert.strictEqual(agent.currentFacts().size, 1);
      const networkFormatDescriptionFact = Array.from(agent.currentFacts()).at(0);
      assert.exists(networkFormatDescriptionFact);

      assert.deepEqual(networkFormatDescriptionFact.text, TraceEventFormatter.networkDataFormatDescription);
    });

    it('sends main thread activity description text as a fact when `getMainThreadActivity` is called',
       async function() {
         const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
         assert.isOk(insights);
         const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
         const insightSet = getInsightSetOrError(insights, firstNav);
         const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
         const agent = createAgentForInsightConversation({
           aidaClient: mockAidaClient([
             [{explanation: '', functionCalls: [{name: 'getMainThreadActivity', args: {}}]}],
           ]),
         });
         const context = PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown, insightSet.bounds);
         await Array.fromAsync(agent.run('test 1', {selected: context}));
         assert.strictEqual(agent.currentFacts().size, 1);
         const mainThreadActivityDescriptionFact = Array.from(agent.currentFacts()).at(0);
         assert.exists(mainThreadActivityDescriptionFact);

         const expectedFormatDescription =
             `The tree is represented as a call frame with a root task and a series of children.
The format of each callframe is:

  'id;name;duration;selfTime;urlIndex;childRange;[S]'

The fields are:

* id: A unique numerical identifier for the call frame.
* name: A concise string describing the call frame (e.g., 'Evaluate Script', 'render', 'fetchData').
* duration: The total execution time of the call frame, including its children.
* selfTime: The time spent directly within the call frame, excluding its children's execution.
* urlIndex: Index referencing the "All URLs" list. Empty if no specific script URL is associated.
* childRange: Specifies the direct children of this node using their IDs. If empty ('' or 'S' at the end), the node has no children. If a single number (e.g., '4'), the node has one child with that ID. If in the format 'firstId-lastId' (e.g., '4-5'), it indicates a consecutive range of child IDs from 'firstId' to 'lastId', inclusive.
* S: **Optional marker.** The letter 'S' appears at the end of the line **only** for the single call frame selected by the user.`;
         assert.deepEqual(mainThreadActivityDescriptionFact.text, expectedFormatDescription);
       });
  });
});

describeWithEnvironment('PerformanceAgent – all focus', () => {
  it('uses the min and max bounds of the trace as the origin', async function() {
    const {parsedTrace, insights, metadata} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    assert.isOk(insights);
    const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
    const insightSet = getInsightSetOrError(insights, firstNav);
    const context = PerformanceTraceContext.full(parsedTrace, insightSet, metadata);
    assert.strictEqual(context.getOrigin(), 'trace-658799706428-658804825864');
  });
});
