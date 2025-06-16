// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';

describeWithEnvironment('ThirdParties', function() {
  it('categorizes third party web requests (simple)', async () => {
    const {data, insights} = await processTrace(this, 'load-simple.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('ThirdParties', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    const entityNames = insight.entitySummaries.map(s => s.entity.name);

    assert.deepEqual([...new Set(entityNames)], [
      'localhost',
      'Google Fonts',
    ]);
    const summaryResult =
        insight.entitySummaries.map(s => [s.entity.name, s.transferSize, s.mainThreadTime.toFixed(2)]);
    assert.deepEqual(summaryResult, [
      ['localhost', 1503, '24.95'],
      ['Google Fonts', 25325, '0.00'],
    ]);
  });

  it('categorizes third party web requests (complex)', async () => {
    const {data, insights} = await processTrace(this, 'lantern/paul/trace.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('ThirdParties', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    const entityNames = insight.entitySummaries.map(s => s.entity.name);
    assert.deepEqual([...new Set(entityNames)], [
      'paulirish.com',
      'Google Fonts',
      'Google Tag Manager',
      'Google Analytics',
      'Disqus',
      'Firebase',
    ]);

    const summaryResult =
        insight.entitySummaries.map(s => [s.entity.name, s.transferSize, s.mainThreadTime.toFixed(2)]);
    assert.deepEqual(summaryResult, [
      ['paulirish.com', 157130, '85.33'],
      ['Google Fonts', 80003, '0.00'],
      ['Google Tag Manager', 95375, '19.95'],
      ['Google Analytics', 20865, '5.86'],
      ['Disqus', 1551, '0.34'],
      ['Firebase', 2847, '0.00'],
    ]);
  });
});
