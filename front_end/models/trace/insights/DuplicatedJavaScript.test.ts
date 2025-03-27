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
        [...duplication.entries()].filter(v => v[1].estimatedDuplicateBytes > 1000 * 100).map(([key, data]) => {
          return [key, data.duplicates.map(v => ({url: v.script.url, resourceSize: v.attributedSize}))];
        }));
    const url1 = 'https://dupe-modules-lh-2.surge.sh/bundle.js?v1';
    const url2 = 'https://dupe-modules-lh-2.surge.sh/bundle.js?v2';
    const url3 = 'https://dupe-modules-lh-2.surge.sh/bundle.js?v3';
    const url4 = 'https://dupe-modules-lh-2.surge.sh/bundle.js?v4';

    assert.deepEqual(results, {
      'node_modules/@headlessui/react': [
        {url: url1, resourceSize: 56331},
        {url: url2, resourceSize: 56331},
        {url: url3, resourceSize: 56331},
        {url: url4, resourceSize: 56331},
      ],
      'node_modules/filestack-js': [
        {url: url1, resourceSize: 423206},
        {url: url2, resourceSize: 423206},
        {url: url3, resourceSize: 423206},
        {url: url4, resourceSize: 423206},
      ],
      'node_modules/react-query': [
        {url: url1, resourceSize: 40357},
        {url: url2, resourceSize: 40357},
        {url: url3, resourceSize: 40357},
        {url: url4, resourceSize: 40357},
      ],
    });

    assert.deepEqual(insight.metricSavings, {FCP: 100, LCP: 100} as Trace.Insights.Types.MetricSavings);
  });
});
