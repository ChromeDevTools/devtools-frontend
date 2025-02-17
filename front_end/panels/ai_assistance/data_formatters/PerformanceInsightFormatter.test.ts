// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import {PerformanceInsightFormatter} from '../ai_assistance.js';

describe('PerformanceInsightFormatter', () => {
  describeWithEnvironment('for LCP by Phase', () => {
    it('serializes the correct details', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPPhases', insights, firstNav);

      const formatter = new PerformanceInsightFormatter(insight);
      const output = formatter.formatInsight();

      const expected = `## Insight title: LCP by phase

## Insight Description:
This insight is used to analyse the loading of the LCP resource and identify which of the 4 phases are contributing most to the delay in rendering the LCP element. For this insight it can be useful to get a list of all network requests that happened before the LCP time and look for slow requests. You can also look for main thread activity during the phases, in particular the load delay and render delay phases.

## External resources:
- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp

## Insight details:
All time units given to you are in milliseconds.
The actual LCP time is 129.21 ms;

We can break this time down into the 4 phases that combine to make up the LCP time:

- Time to first byte: 7.94 ms
- Load delay: 33.16 ms
- Load time: 14.70 ms
- Render delay: 73.41 ms`;
      assert.strictEqual(output, expected);
    });
  });
});
