// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment, expectConsoleLogs} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';

describeWithEnvironment('DOMSize', function() {
  // Processing traces in this file can take a while due to a performance bottleneck
  // b/38254550
  this.timeout(30_000);
  expectConsoleLogs({
    error: ['Error: missing metric scores for specified navigation'],
  });

  it('finds layout reflows and style recalcs affected by DOM size', async () => {
    const {data, insights} = await processTrace(this, 'dom-size.json.gz');

    // 1 large DOM update was triggered before the first navigation
    {
      const insight = getInsightOrError('DOMSize', insights);
      assert.lengthOf(insight.largeLayoutUpdates, 1);
      assert.lengthOf(insight.largeStyleRecalcs, 1);
    }

    // 1 large DOM update was triggered after the first navigation
    {
      const insight =
          getInsightOrError('DOMSize', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));
      assert.lengthOf(insight.largeLayoutUpdates, 1);
      assert.lengthOf(insight.largeStyleRecalcs, 1);
    }
  });

  it('finds largest DOM stats event', async () => {
    const {data, insights} = await processTrace(this, 'multi-frame-dom-stats.json.gz');

    const insight =
        getInsightOrError('DOMSize', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));
    const domStats = insight.maxDOMStats!.args.data;
    assert.strictEqual(domStats.totalElements, 7);
    assert.strictEqual(domStats.maxDepth!.depth, 3);
    assert.strictEqual(domStats.maxDepth!.nodeName, 'DIV id=\'child\'');
    assert.strictEqual(domStats.maxChildren!.numChildren, 4);
    assert.strictEqual(domStats.maxChildren!.nodeName, 'BODY');
  });

  it('separates dom stats in a cross-origin navigation', async () => {
    const {data, insights} = await processTrace(this, 'dom-size-overlap.json.gz');

    const navigations =
        [...data.Meta.navigationsByNavigationId.values()].filter(n => n.args.data?.isOutermostMainFrame);
    {
      const insight = getInsightOrError('DOMSize', insights, navigations[0]);
      const domStats = insight.maxDOMStats!.args.data;
      assert.strictEqual(domStats.totalElements, 6811);
    }
    {
      const insight = getInsightOrError('DOMSize', insights, navigations[1]);
      const domStats = insight.maxDOMStats!.args.data;
      // If we don't filter by process id, the DOM stats events from the previous navigation
      // would leak into this one and this # would be much higher
      assert.strictEqual(domStats.totalElements, 7);
    }
  });
});
