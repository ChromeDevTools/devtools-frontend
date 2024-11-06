// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

export async function processTrace(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const {parsedTrace, insights} = await TraceLoader.traceEngine(testContext, traceFile);
  if (!insights) {
    throw new Error('No insights');
  }

  return {data: parsedTrace, insights};
}

describeWithEnvironment('LCPDiscovery', function() {
  it('calculates image lcp attributes', async () => {
    const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPDiscovery', insights, firstNav);
    const {shouldIncreasePriorityHint, shouldPreloadImage, shouldRemoveLazyLoading} = insight;

    assert.strictEqual(shouldRemoveLazyLoading, false);
    assert.strictEqual(shouldPreloadImage, false);
    assert.strictEqual(shouldIncreasePriorityHint, true);
  });

  it('calculates the LCP optimal time as the document request download start time', async () => {
    const {data, insights} = await processTrace(this, 'web-dev-with-commit.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPDiscovery', insights, firstNav);
    assert.strictEqual(
        insight.earliestDiscoveryTimeTs,
        // this is the TTFB for the document request
        122411004828,
    );
  });

  describe('warnings', function() {
    it('warns when there is no lcp', async () => {
      const {data, insights} = await processTrace(this, 'user-timings.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPDiscovery', insights, firstNav);

      assert.strictEqual(insight.warnings?.[0], 'NO_LCP');
    });

    it('no main document url', async () => {
      const {data, insights} = await processTrace(this, 'about-blank-first.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPDiscovery', insights, firstNav);

      assert.strictEqual(insight.warnings?.[0], 'NO_DOCUMENT_REQUEST');
    });
  });
});
