// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import * as Trace from '../trace.js';

describeWithEnvironment('NetworkDependencyTree', function() {
  let insight: Trace.Insights.Types.InsightModels['NetworkDependencyTree'];

  before(async function() {
    const {data, insights} = await processTrace(this, 'lcp-multiple-frames.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    insight = getInsightOrError('NetworkDependencyTree', insights, firstNav);
  });

  it('calculates network dependency tree', async () => {
    // The network dependency tree in this trace is
    // | .../index.html (ts:566777570990, dur:5005590)
    // |
    // | | .../app.css (ts:566782573909, dur:7205)
    // | | .../app.js (ts:566782574106, dur:11790)
    assert.lengthOf(insight.rootNodes, 1);

    const root = insight.rootNodes[0];
    assert.strictEqual(root.request.args.data.url, 'http://localhost:8787/lcp-iframes/index.html');
    assert.strictEqual(root.timeFromInitialRequest, Trace.Types.Timing.Micro(root.request.dur));
    assert.lengthOf(root.children, 2);

    const [child0, child1] = insight.rootNodes[0].children;
    assert.strictEqual(child0.request.args.data.url, 'http://localhost:8787/lcp-iframes/app.css');
    assert.strictEqual(
        child0.timeFromInitialRequest,
        Trace.Types.Timing.Micro(child0.request.ts + child0.request.dur - root.request.ts));
    assert.lengthOf(child0.children, 0);
    assert.strictEqual(child1.request.args.data.url, 'http://localhost:8787/lcp-iframes/app.js');
    assert.strictEqual(
        child1.timeFromInitialRequest,
        Trace.Types.Timing.Micro(child1.request.ts + child1.request.dur - root.request.ts));
    assert.lengthOf(child1.children, 0);
  });

  it('Calculate the max critical path latency', async () => {
    // The chain |index.html(root) -> app.js(child1)| is the longest
    const root = insight.rootNodes[0];
    const child1 = root.children[1];
    assert.strictEqual(
        insight.maxTime, Trace.Types.Timing.Micro(child1.request.ts + child1.request.dur - root.request.ts));
  });

  it('Marks the longest network dependency chain', async () => {
    const root = insight.rootNodes[0];
    const [child0, child1] = root.children;

    // The chain |index.html(root) -> app.js(child1)| is the longest
    assert.isTrue(root.isLongest);
    assert.isTrue(child1.isLongest);
    // The |app.css| is not in the longest chain
    assert.isNotTrue(child0.isLongest);
  });
});
