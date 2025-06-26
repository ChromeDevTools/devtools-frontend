// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../../trace/trace.js';
import {
  type ActionResponse,
  InsightContext,
  PerformanceInsightFormatter,
  PerformanceInsightsAgent,
  ResponseType,
  TraceEventFormatter,
} from '../ai_assistance.js';

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
  Meta: {traceBounds: {min: 0, max: 10}},
} as unknown as Trace.Handlers.Types.ParsedTrace;

describeWithEnvironment('PerformanceInsightsAgent', () => {
  it('uses the min and max bounds of the trace as the origin', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    assert.isOk(insights);
    const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
    const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
    const activeInsight = new TimelineUtils.InsightAIContext.ActiveInsight(lcpBreakdown, parsedTrace);
    const context = new InsightContext(activeInsight);
    assert.strictEqual(context.getOrigin(), 'trace-658799706428-658804825864');
  });

  it('outputs the right title for the selected insight', async () => {
    const mockInsight = new TimelineUtils.InsightAIContext.ActiveInsight(FAKE_LCP_MODEL, FAKE_PARSED_TRACE);
    const context = new InsightContext(mockInsight);
    assert.strictEqual(context.getTitle(), 'Insight: LCP breakdown');
  });

  // See b/405054694 for context on why we do this.
  describe('parsing text responses', () => {
    it('strips out 5 backticks if the response has them', async () => {
      const agent = new PerformanceInsightsAgent({aidaClient: mockAidaClient()});
      const response = agent.parseTextResponse('`````hello world`````');
      assert.deepEqual(response, {answer: 'hello world'});
    });

    it('strips any newlines before the backticks', async () => {
      const agent = new PerformanceInsightsAgent({aidaClient: mockAidaClient()});
      const response = agent.parseTextResponse('\n\n`````hello world`````');
      assert.deepEqual(response, {answer: 'hello world'});
    });

    it('does not strip the backticks if the response does not fully start and end with them', async () => {
      const agent = new PerformanceInsightsAgent({aidaClient: mockAidaClient()});
      const response = agent.parseTextResponse('answer: `````hello world`````');
      assert.deepEqual(response, {answer: 'answer: `````hello world`````'});
    });

    it('does not strip the backticks in the middle of the response even if the response is also wrapped', async () => {
      const agent = new PerformanceInsightsAgent({aidaClient: mockAidaClient()});
      const response = agent.parseTextResponse('`````hello ````` world`````');
      assert.deepEqual(response, {answer: 'hello ````` world'});
    });

    it('does not strip out inline code backticks', async () => {
      const agent = new PerformanceInsightsAgent({aidaClient: mockAidaClient()});
      const response = agent.parseTextResponse('This is code `console.log("hello")`');
      assert.deepEqual(response, {answer: 'This is code `console.log("hello")`'});
    });

    it('does not strip out code block 3 backticks', async () => {
      const agent = new PerformanceInsightsAgent({aidaClient: mockAidaClient()});
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
      const mockInsight = new TimelineUtils.InsightAIContext.ActiveInsight(FAKE_LCP_MODEL, FAKE_PARSED_TRACE);
      const context = new InsightContext(mockInsight);
      const agent = new PerformanceInsightsAgent({
        aidaClient: mockAidaClient([[{
          explanation: 'This is the answer',
          metadata: {
            rpcGlobalId: 123,
          }
        }]])
      });

      const expectedDetailText = new PerformanceInsightFormatter(mockInsight).formatInsight();

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
      const agent = new PerformanceInsightsAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });

      const mockInsight = new TimelineUtils.InsightAIContext.ActiveInsight(FAKE_LCP_MODEL, FAKE_PARSED_TRACE);
      const context = new InsightContext(mockInsight);
      const extraContext = new PerformanceInsightFormatter(mockInsight).formatInsight();

      const finalQuery = await agent.enhanceQuery('What is this?', context);
      const expected = `${extraContext}

# User question for you to answer:
What is this?`;

      assert.strictEqual(finalQuery, expected);
    });

    it('does not add the context for follow-up queries with the same context', async () => {
      const agent = new PerformanceInsightsAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });

      const mockInsight = new TimelineUtils.InsightAIContext.ActiveInsight(FAKE_LCP_MODEL, FAKE_PARSED_TRACE);
      const context = new InsightContext(mockInsight);

      await agent.enhanceQuery('What is this?', context);
      const finalQuery = await agent.enhanceQuery('Help me understand?', context);
      const expected = `# User question for you to answer:
Help me understand?`;

      assert.strictEqual(finalQuery, expected);
    });

    it('does add context to queries if the insight context changes', async () => {
      const agent = new PerformanceInsightsAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      const mockInsight1 = new TimelineUtils.InsightAIContext.ActiveInsight(FAKE_LCP_MODEL, FAKE_PARSED_TRACE);
      const mockInsight2 = new TimelineUtils.InsightAIContext.ActiveInsight(FAKE_INP_MODEL, FAKE_PARSED_TRACE);
      const context1 = new InsightContext(mockInsight1);
      const context2 = new InsightContext(mockInsight2);
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
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const agent = new PerformanceInsightsAgent({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getNetworkActivitySummary', args: {}}]}], [{explanation: 'done'}]
        ])
      });
      const activeInsight = new TimelineUtils.InsightAIContext.ActiveInsight(lcpBreakdown, parsedTrace);
      const context = new InsightContext(activeInsight);

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

      const expectedRequestsOutput =
          requests.map(r => TraceEventFormatter.networkRequest(r, parsedTrace, {verbose: false}));

      const expectedBytesSize = Platform.StringUtilities.countWtf8Bytes(expectedRequestsOutput.join('\n'));
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
      const requestUrl = 'https://chromedevtools.github.io/performance-stories/lcp-large-image/app.css';
      const agent = new PerformanceInsightsAgent({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getNetworkRequestDetail', args: {url: requestUrl}}]}],
          [{explanation: 'done'}]
        ])
      });
      const activeInsight = new TimelineUtils.InsightAIContext.ActiveInsight(lcpBreakdown, parsedTrace);
      const context = new InsightContext(activeInsight);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const titleResponse = responses.find(response => response.type === ResponseType.TITLE);
      assert.exists(titleResponse);
      assert.strictEqual(titleResponse.title, `Investigating network request ${requestUrl}…`);
      const action = responses.find(response => response.type === ResponseType.ACTION);
      const request = parsedTrace.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);

      const expectedRequestOutput = TraceEventFormatter.networkRequest(request, parsedTrace, {verbose: true});
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
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const agent = new PerformanceInsightsAgent({
        aidaClient: mockAidaClient(
            [[{explanation: '', functionCalls: [{name: 'getMainThreadActivity', args: {}}]}], [{explanation: 'done'}]])
      });
      const activeInsight = new TimelineUtils.InsightAIContext.ActiveInsight(lcpBreakdown, parsedTrace);
      const context = new InsightContext(activeInsight);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const titleResponse = responses.find(response => response.type === ResponseType.TITLE);
      assert.exists(titleResponse);
      assert.strictEqual(titleResponse.title, 'Investigating main thread activity…');

      const action = responses.find(response => response.type === ResponseType.ACTION);
      assert.exists(action);

      const expectedTree = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivity(lcpBreakdown, parsedTrace);
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
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const agent = new PerformanceInsightsAgent({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getNetworkActivitySummary', args: {}}]}], [{explanation: 'done'}]
        ])
      });
      const activeInsight = new TimelineUtils.InsightAIContext.ActiveInsight(lcpBreakdown, parsedTrace);
      const context = new InsightContext(activeInsight);

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
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const agent = new PerformanceInsightsAgent({
        aidaClient: mockAidaClient(
            [[{explanation: '', functionCalls: [{name: 'getMainThreadActivity', args: {}}]}], [{explanation: 'done'}]])
      });
      const activeInsight = new TimelineUtils.InsightAIContext.ActiveInsight(lcpBreakdown, parsedTrace);
      const context = new InsightContext(activeInsight);

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

      const expectedTree = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivity(lcpBreakdown, parsedTrace);
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
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const renderBlocking = getInsightOrError('RenderBlocking', insights, firstNav);
      const agent = new PerformanceInsightsAgent({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getMainThreadActivity', args: {}}]}],
        ])
      });
      const lcpBreakdownActiveInsight = new TimelineUtils.InsightAIContext.ActiveInsight(lcpBreakdown, parsedTrace);
      const lcpContext = new InsightContext(lcpBreakdownActiveInsight);
      const renderBlockingActiveInsight = new TimelineUtils.InsightAIContext.ActiveInsight(renderBlocking, parsedTrace);
      const renderBlockingContext = new InsightContext(renderBlockingActiveInsight);

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
      const lcpBreakdown = getInsightOrError('LCPBreakdown', insights, firstNav);
      const agent = new PerformanceInsightsAgent({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getMainThreadActivity', args: {}}]}],
          [{explanation: '', functionCalls: [{name: 'getNetworkActivitySummary', args: {}}]}], [{explanation: 'done'}]
        ])
      });
      const activeInsight = new TimelineUtils.InsightAIContext.ActiveInsight(lcpBreakdown, parsedTrace);
      const context = new InsightContext(activeInsight);
      // First query to populate the function calls
      await Array.fromAsync(agent.run('test 1', {selected: context}));
      // Second query should have two facts
      await Array.fromAsync(agent.run('test 2', {selected: context}));
      assert.deepEqual(Array.from(agent.currentFacts(), fact => {
        return fact.metadata.source;
      }), ['getMainThreadActivity()', 'getNetworkActivitySummary()']);
    });
  });
});
