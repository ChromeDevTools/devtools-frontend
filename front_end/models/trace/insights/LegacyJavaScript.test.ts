// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import type * as Trace from '../trace.js';

describeWithEnvironment('LegacyJavaScript', function() {
  it('works', async () => {
    const {data, insights} = await processTrace(this, 'dupe-js.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('LegacyJavaScript', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    const results =
        Object.fromEntries([...insight.legacyJavaScriptResults.entries()].slice(0, 1).map(([script, data]) => {
          return [script.url, data];
        }));

    assert.deepEqual(results, {
      'https://dupe-modules-lh-2.surge.sh/bundle.js?v1': {
        estimatedByteSavings: 2952,
        matches: [
          {name: '@babel/plugin-transform-classes', line: 1, column: 165614},
          {name: '@babel/plugin-transform-regenerator', line: 1, column: 159765},
          {name: '@babel/plugin-transform-spread', line: 1, column: 350646},
        ],
      },
    });

    assert.deepEqual(insight.metricSavings, {FCP: 0, LCP: 0} as Trace.Insights.Types.MetricSavings);
  });
});
