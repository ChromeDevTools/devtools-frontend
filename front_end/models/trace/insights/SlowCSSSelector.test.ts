// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

export async function processTrace(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const {parsedTrace, insights} = await TraceLoader.traceEngine(testContext, traceFile);
  if (!insights) {
    throw new Error('No insights');
  }

  return {data: parsedTrace, insights};
}

describeWithEnvironment('SelectorStatsInsights', function() {
  it('generates slow selectors', async function() {
    const {data, insights} = await processTrace(this, 'selector-stats.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('SlowCSSSelector', insights, data.Meta.navigationsByNavigationId.values().next().value);

    assert.strictEqual(insight.totalElapsedMs, 0.1);
    assert.strictEqual(insight.totalMatchAttempts, 2444);
    assert.strictEqual(insight.totalMatchCount, 465);

    const topElapsedMs = insight.topElapsedMs;
    const topMatchAttempts = insight.topMatchAttempts;

    assert.strictEqual(topElapsedMs.length, 3);
    assert.strictEqual(topMatchAttempts.length, 3);

    assert.strictEqual(topElapsedMs[0].selector, ':root');
    assert.strictEqual(topElapsedMs[0]['elapsed (us)'], 14);
    assert.strictEqual(topElapsedMs[1].selector, 'abbr[title]');
    assert.strictEqual(topElapsedMs[1]['elapsed (us)'], 8);
    assert.strictEqual(topElapsedMs[2].selector, 'div');
    assert.strictEqual(topElapsedMs[2]['elapsed (us)'], 7);

    assert.strictEqual(topMatchAttempts[0].selector, '.HG1dvd > *');
    assert.strictEqual(topMatchAttempts[0].match_attempts, 169);
    assert.strictEqual(topMatchAttempts[1].selector, '.gb_Bd > :only-child');
    assert.strictEqual(topMatchAttempts[1].match_attempts, 169);
    assert.strictEqual(topMatchAttempts[2].selector, 'div');
    assert.strictEqual(topMatchAttempts[2].match_attempts, 140);
  });

  it('generates slow selectors by frame ID', async function() {
    const {data, insights} = await processTrace(this, 'selector-stats-frame-test.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('SlowCSSSelector', insights, data.Meta.navigationsByNavigationId.values().next().value);

    assert.strictEqual(insight.totalElapsedMs, 0.017);
    assert.strictEqual(insight.totalMatchAttempts, 32);
    assert.strictEqual(insight.totalMatchCount, 16);

    const topElapsedMs = insight.topElapsedMs;
    const topMatchAttempts = insight.topMatchAttempts;

    assert.strictEqual(topElapsedMs.length, 3);
    assert.strictEqual(topMatchAttempts.length, 3);

    assert.strictEqual(topElapsedMs[0].selector, 'h1');
    assert.strictEqual(topElapsedMs[0]['elapsed (us)'], 2);
    assert.strictEqual(topElapsedMs[1].selector, ':root');
    assert.strictEqual(topElapsedMs[1]['elapsed (us)'], 2);
    assert.strictEqual(topElapsedMs[2].selector, 'iframe');
    assert.strictEqual(topElapsedMs[2]['elapsed (us)'], 2);

    assert.strictEqual(topMatchAttempts[0].selector, 'iframe');
    assert.strictEqual(topMatchAttempts[0].match_attempts, 4);
    assert.strictEqual(topMatchAttempts[1].selector, 'html::spelling-error');
    assert.strictEqual(topMatchAttempts[1].match_attempts, 3);
    assert.strictEqual(topMatchAttempts[2].selector, ':root');
    assert.strictEqual(topMatchAttempts[2].match_attempts, 3);
  });
});
