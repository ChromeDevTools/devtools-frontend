// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';

describeWithEnvironment('SelectorStatsInsights', function() {
  it('generates slow selectors', async function() {
    const {data, insights} = await processTrace(this, 'selector-stats.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('SlowCSSSelector', insights, data.Meta.navigationsByNavigationId.values().next().value);

    assert.strictEqual(insight.totalElapsedMs, 0.1);
    assert.strictEqual(insight.totalMatchAttempts, 2444);
    assert.strictEqual(insight.totalMatchCount, 465);

    const topSelectorElapsedMs = insight.topSelectorElapsedMs;
    const topSelectorMatchAttempts = insight.topSelectorMatchAttempts;

    assert.isNull(topSelectorElapsedMs);
    assert.isNotNull(topSelectorMatchAttempts);

    assert.strictEqual(topSelectorMatchAttempts.selector, '.gb_Bd > :only-child');
    assert.strictEqual(topSelectorMatchAttempts.match_attempts, 169);
  });

  it('generates slow selectors by frame ID', async function() {
    const {data, insights} = await processTrace(this, 'selector-stats-frame-test.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('SlowCSSSelector', insights, data.Meta.navigationsByNavigationId.values().next().value);

    assert.strictEqual(insight.totalElapsedMs, 0.017);
    assert.strictEqual(insight.totalMatchAttempts, 32);
    assert.strictEqual(insight.totalMatchCount, 16);

    const topSelectorElapsedMs = insight.topSelectorElapsedMs;
    const topSelectorMatchAttempts = insight.topSelectorMatchAttempts;

    assert.isNull(topSelectorElapsedMs);
    assert.isNotNull(topSelectorMatchAttempts);

    assert.strictEqual(topSelectorMatchAttempts.selector, 'iframe');
    assert.strictEqual(topSelectorMatchAttempts.match_attempts, 4);
  });
});
