// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import type * as Host from '../../../core/host/host.js';
import * as Trace from '../../../models/trace/trace.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import * as TimelineUtils from '../../timeline/utils/utils.js';
import {
  InsightContext,
  PerformanceInsightFormatter,
  PerformanceInsightsAgent,
  ResponseType,
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

describe('PerformanceInsightsAgent', () => {
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

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      assert.deepEqual(responses, [
        {
          type: ResponseType.USER_QUERY,
          query: 'test',
          imageInput: undefined,
        },
        {
          type: ResponseType.CONTEXT,
          title: 'LCP by phase',
          details: [
            // Note: these are placeholder values, see the TODO in
            // PerformanceInsightsAgent.
            {title: 'LCP by phase', text: 'LCP by phase'},
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
});
