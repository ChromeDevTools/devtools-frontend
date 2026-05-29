// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';

describeWithEnvironment('ThirdParties', function() {
  it('categorizes third party web requests (simple)', async function() {
    const {data, insights} = await processTrace(this, 'load-simple.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('ThirdParties', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    const entityNames = insight.entitySummaries.map(s => s.entity.name);

    assert.deepEqual([...new Set(entityNames)], [
      'localhost',
    ]);
    const summaryResult =
        insight.entitySummaries.map(s => [s.entity.name, s.transferSize, s.mainThreadTime.toFixed(2)]);
    assert.deepEqual(summaryResult, [
      ['localhost', 1435, '24.95'],
    ]);
  });

  it('categorizes third party web requests (complex)', async function() {
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

  it('categorizes third party web requests (cached)', async function() {
    const {data, insights} = await processTrace(this, 'cached-request-unpkg.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('ThirdParties', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    const unpkgSummary = insight.entitySummaries.find(summary => summary.entity.name === 'Unpkg');
    assert.exists(unpkgSummary);
    assert.strictEqual(unpkgSummary.transferSize, 4784);
  });
});
