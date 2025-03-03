// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import type * as Host from '../../../core/host/host.js';
import * as Trace from '../../../models/trace/trace.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TimelineUtils from '../../timeline/utils/utils.js';
import {
  type ActionResponse,
  InsightContext,
  PerformanceInsightFormatter,
  PerformanceInsightsAgent,
  ResponseType,
  TraceEventFormatter,
} from '../ai_assistance.js';

const FAKE_LCP_MODEL = {
  insightKey: 'LCPPhases',
  strings: {},
  title: 'LCP by phase' as Common.UIString.LocalizedString,
  description: 'some description' as Common.UIString.LocalizedString,
  category: Trace.Insights.Types.InsightCategory.ALL,
  state: 'fail',
} as const;
const FAKE_PARSED_TRACE = {} as unknown as Trace.Handlers.Types.ParsedTrace;

describeWithEnvironment('PerformanceInsightsAgent', () => {
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

      const expectedDetailText = new PerformanceInsightFormatter(mockInsight.insight).formatInsight();

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
          title: 'Analyzing insight: LCP by phase',
          details: [
            {title: 'LCP by phase', text: expectedDetailText},
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
      const extraContext = new PerformanceInsightFormatter(mockInsight.insight).formatInsight();

      const finalQuery = await agent.enhanceQuery('What is this?', context);
      const expected = `${extraContext}

# User request:
What is this?`;

      assert.strictEqual(finalQuery, expected);
    });
  });

  describe('function calls', () => {
    it('calls getNetworkActivity', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const lcpPhases = getInsightOrError('LCPPhases', insights, firstNav);
      const agent = new PerformanceInsightsAgent({
        aidaClient: mockAidaClient(
            [[{explanation: '', functionCalls: [{name: 'getNetworkActivity', args: {}}]}], [{explanation: 'done'}]])
      });
      const activeInsight = new TimelineUtils.InsightAIContext.ActiveInsight(lcpPhases, parsedTrace);
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

      const expectedRequestsOutput = requests.map(r => TraceEventFormatter.networkRequest(r, parsedTrace));
      const expectedOutput = JSON.stringify({requests: expectedRequestsOutput});

      assert.exists(action);
      assert.deepEqual(
          action, {type: 'action' as ActionResponse['type'], output: expectedOutput, code: undefined, canceled: false});
    });

    it('calls getMainThreadActivity', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(insights);
      const [firstNav] = parsedTrace.Meta.mainFrameNavigations;
      const lcpPhases = getInsightOrError('LCPPhases', insights, firstNav);
      const agent = new PerformanceInsightsAgent({
        aidaClient: mockAidaClient(
            [[{explanation: '', functionCalls: [{name: 'getMainThreadActivity', args: {}}]}], [{explanation: 'done'}]])
      });
      const activeInsight = new TimelineUtils.InsightAIContext.ActiveInsight(lcpPhases, parsedTrace);
      const context = new InsightContext(activeInsight);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === ResponseType.ACTION);

      const expectedTree = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivity(lcpPhases, parsedTrace);
      assert.isOk(expectedTree);

      const expectedOutput = JSON.stringify({activity: expectedTree.serialize()});

      assert.exists(action);
      assert.deepEqual(
          action, {type: 'action' as ActionResponse['type'], output: expectedOutput, code: undefined, canceled: false});
    });
  });
});
