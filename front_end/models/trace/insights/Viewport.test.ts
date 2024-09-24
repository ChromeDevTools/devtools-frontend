// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {createContextForNavigation, getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

export async function processTrace(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const {parsedTrace, insights} = await TraceLoader.traceEngine(testContext, traceFile);
  if (!insights) {
    throw new Error('No insights');
  }

  return {data: parsedTrace, insights};
}

describeWithEnvironment('Viewport', function() {
  it('detects mobile optimized viewport', async () => {
    const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
    const insight =
        getInsightOrError('Viewport', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    assert.strictEqual(insight.mobileOptimized, true);
  });

  it('detects mobile unoptimized viewport', async () => {
    const {data} = await processTrace(this, 'lcp-images.json.gz');
    const navigation = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const context = createContextForNavigation(data, navigation, data.Meta.mainFrameId);
    const events =
        data.UserInteractions.beginCommitCompositorFrameEvents.filter(event => event.args.frame === context.frameId);
    assert.isNotEmpty(events);
    for (const event of events) {
      event.args.is_mobile_optimized = false;
    }

    const insight = Trace.Insights.InsightRunners.Viewport.generateInsight(data, context);
    assert.strictEqual(insight.mobileOptimized, false);
  });
});
