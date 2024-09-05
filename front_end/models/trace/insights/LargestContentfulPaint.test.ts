// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import type * as TraceModel from '../trace.js';
import * as Types from '../types/types.js';

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
  const insight = navInsights.LargestContentfulPaint;
  if (insight instanceof Error) {
    throw insight;
  }
  return insight;
}

describeWithEnvironment('LargestContentfulPaint', function() {
  it('calculates text lcp phases', async () => {
    const {data, insights} = await processTrace(this, 'lcp-web-font.json.gz');
    const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);

    assert.strictEqual(insight.lcpMs, 106.482);

    const wantTtfb = Types.Timing.MilliSeconds(6.115);
    const wantRenderDelay = Types.Timing.MilliSeconds(100.367);
    assert.deepEqual(insight.phases, {ttfb: wantTtfb, renderDelay: wantRenderDelay});
  });

  it('calculates image lcp phases', async () => {
    const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
    const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);

    assert.strictEqual(insight.lcpMs, 109.623);

    if (!insight.phases) {
      throw new Error('No LCP phases');
    }

    const phases = {
      ttfb: insight.phases.ttfb?.toFixed(2),
      loadTime: insight.phases.loadTime?.toFixed(2),
      loadDelay: insight.phases.loadDelay?.toFixed(2),
      renderDelay: insight.phases.renderDelay?.toFixed(2),
    };
    assert.deepEqual(phases, {ttfb: '6.94', loadTime: '12.09', loadDelay: '33.74', renderDelay: '56.85'});
  });

  it('calculates image lcp attributes', async () => {
    const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
    const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);
    const {shouldIncreasePriorityHint, shouldPreloadImage, shouldRemoveLazyLoading} = insight;

    assert.strictEqual(shouldRemoveLazyLoading, false);
    assert.strictEqual(shouldPreloadImage, true);
    assert.strictEqual(shouldIncreasePriorityHint, true);
  });

  it('calculates the LCP optimal time as the document request download start time', async () => {
    const {data, insights} = await processTrace(this, 'web-dev-with-commit.json.gz');
    const firstNav = Array.from(data.Meta.navigationsByNavigationId.keys())[0];
    const insight = getInsight(insights, firstNav);
    assert.strictEqual(
        insight.earliestDiscoveryTimeTs,
        // this is the TTFB for the document request
        122411004828,
    );
  });

  describe('warnings', function() {
    it('warns when there is no lcp', async () => {
      const {data, insights} = await processTrace(this, 'user-timings.json.gz');
      const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);

      assert.strictEqual(insight.lcpMs, undefined);
      assert.strictEqual(insight.phases, undefined);
      assert.strictEqual(insight.warnings?.[0], 'NO_LCP');
    });

    it('no main document url', async () => {
      const {data, insights} = await processTrace(this, 'about-blank-first.json.gz');
      const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);

      assert.strictEqual(insight.lcpMs, 204.909);
      assert.strictEqual(insight.phases, undefined);
      assert.strictEqual(insight.warnings?.[0], 'NO_DOCUMENT_REQUEST');
    });
  });
});
