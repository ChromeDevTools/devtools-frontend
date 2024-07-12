// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TraceModel from '../trace.js';

export async function processTrace(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const {traceData, insights} = await TraceLoader.traceEngine(testContext, traceFile);
  if (!insights) {
    throw new Error('No insights');
  }

  return {data: traceData, insights};
}

function getInsight(insights: TraceModel.Insights.Types.TraceInsightData, navigationId: string) {
  const navInsights = insights.get(navigationId);
  if (!navInsights) {
    throw new Error('missing navInsights');
  }
  const insight = navInsights.Viewport;
  if (insight instanceof Error) {
    throw insight;
  }
  return insight;
}

describe('Viewport', function() {
  it('detects mobile optimized viewport', async () => {
    const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
    const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);

    assert.strictEqual(insight.mobileOptimized, true);
  });

  it('detects mobile unoptimized viewport', async () => {
    const {data} = await processTrace(this, 'lcp-images.json.gz');

    const context = {
      frameId: data.Meta.mainFrameId,
      navigationId: data.Meta.navigationsByNavigationId.keys().next().value,
    };

    const events =
        data.UserInteractions.beginCommitCompositorFrameEvents.filter(event => event.args.frame === context.frameId);
    assert.isNotEmpty(events);
    for (const event of events) {
      event.args.is_mobile_optimized = false;
    }

    const insight = TraceModel.Insights.InsightRunners.Viewport.generateInsight(data, context);
    assert.strictEqual(insight.mobileOptimized, false);
  });
});
