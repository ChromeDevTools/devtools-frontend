// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import type * as Trace from '../trace.js';

describeWithEnvironment('DuplicatedJavaScript', function() {
  it('works', async () => {
    const {data, insights} = await processTrace(this, 'dupe-js.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight = getInsightOrError(
        'DuplicatedJavaScript', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    const duplication = insight.duplicationGroupedByNodeModules;
    const results = Object.fromEntries(
        [...duplication.entries()].filter(v => v[1].estimatedDuplicateBytes > 1000 * 30).map(([key, data]) => {
          return [key, data.duplicates.map(v => ({url: v.script.url, transferSize: v.attributedSize}))];
        }));
    const url1 = 'https://dupe-modules-lh-2.surge.sh/bundle.js?v1';
    const url2 = 'https://dupe-modules-lh-2.surge.sh/bundle.js?v2';
    const url3 = 'https://dupe-modules-lh-2.surge.sh/bundle.js?v3';
    const url4 = 'https://dupe-modules-lh-2.surge.sh/bundle.js?v4';

    assert.deepEqual(results, {
      'node_modules/filestack-js': [
        {url: url1, transferSize: 115260},
        {url: url3, transferSize: 115260},
        {url: url4, transferSize: 115260},
        {url: url2, transferSize: 115259},
      ],
      'node_modules/@headlessui/react': [
        {url: url1, transferSize: 15341},
        {url: url2, transferSize: 15341},
        {url: url3, transferSize: 15341},
        {url: url4, transferSize: 15341},
      ],
      'node_modules/react-query': [
        {url: url1, transferSize: 10992},
        {url: url2, transferSize: 10992},
        {url: url3, transferSize: 10992},
        {url: url4, transferSize: 10992},
      ],
    });

    assert.deepEqual(insight.metricSavings, {FCP: 100, LCP: 100} as Trace.Insights.Types.MetricSavings);
  });
});
