// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Types from '../types/types.js';

export async function processTrace(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const {parsedTrace, insights} = await TraceLoader.traceEngine(testContext, traceFile);
  if (!insights) {
    throw new Error('No insights');
  }

  return {data: parsedTrace, insights};
}

describeWithEnvironment('LCPPhases', function() {
  it('calculates text lcp phases', async () => {
    const {data, insights} = await processTrace(this, 'lcp-web-font.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPPhases', insights, firstNav);

    assert.strictEqual(insight.lcpMs, 106.482);

    const wantTtfb = Types.Timing.MilliSeconds(6.115);
    const wantRenderDelay = Types.Timing.MilliSeconds(100.367);
    assert.deepEqual(insight.phases, {ttfb: wantTtfb, renderDelay: wantRenderDelay});
  });

  it('calculates image lcp phases', async () => {
    const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPPhases', insights, firstNav);

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

  describe('warnings', function() {
    it('warns when there is no lcp', async () => {
      const {data, insights} = await processTrace(this, 'user-timings.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPPhases', insights, firstNav);

      assert.strictEqual(insight.lcpMs, undefined);
      assert.strictEqual(insight.phases, undefined);
      assert.strictEqual(insight.warnings?.[0], 'NO_LCP');
    });

    it('no main document url', async () => {
      const {data, insights} = await processTrace(this, 'about-blank-first.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPPhases', insights, firstNav);

      assert.strictEqual(insight.lcpMs, 204.909);
      assert.strictEqual(insight.phases, undefined);
      assert.strictEqual(insight.warnings?.[0], 'NO_DOCUMENT_REQUEST');
    });
  });

  it('can handle old traces with missing data and return null for breakdowns of the phases', async () => {
    const {data, insights} = await processTrace(this, 'multiple-navigations.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPPhases', insights, firstNav);
    // This insight has invalid phase data, so we expect the value to be undefined.
    assert.isUndefined(insight.phases);
  });
});
