// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import * as Trace from '../trace.js';

import type {RelatedEventsMap} from './types.js';

describeWithEnvironment('NetworkDependencyTree', function() {
  let insight: Trace.Insights.Types.InsightModels['NetworkDependencyTree'];

  before(async function() {
    const {data, insights} = await processTrace(this, 'lcp-multiple-frames.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    insight = getInsightOrError('NetworkDependencyTree', insights, firstNav);
  });

  it('calculates network dependency tree', () => {
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

  it('Calculate the max critical path latency', () => {
    // The chain |index.html(root) -> app.js(child1)| is the longest
    const root = insight.rootNodes[0];
    const child1 = root.children[1];
    assert.strictEqual(
        insight.maxTime, Trace.Types.Timing.Micro(child1.request.ts + child1.request.dur - root.request.ts));
  });

  it('Marks the longest network dependency chain', () => {
    const root = insight.rootNodes[0];
    const [child0, child1] = root.children;

    // The chain |index.html(root) -> app.js(child1)| is the longest
    assert.isTrue(root.isLongest);
    assert.isTrue(child1.isLongest);
    // The |app.css| is not in the longest chain
    assert.isNotTrue(child0.isLongest);
  });

  it('Store the all parents and children events for all requests', () => {
    const root = insight.rootNodes[0];
    const [child0, child1] = root.children;

    // There are three chains from Lantern:
    //   |index.html(root)|
    //   |index.html(root) -> app.css(child0)|
    //   |index.html(root) -> app.js(child1)|
    // Both child0 and child1 are related to the root
    assert.deepEqual([...root.relatedRequests], [root.request, child0.request, child1.request]);
    // Only root and child0 are related to the child0
    assert.deepEqual([...child0.relatedRequests], [root.request, child0.request]);
    // Only root and child1 are related to the child1
    assert.deepEqual([...child1.relatedRequests], [root.request, child1.request]);
  });

  it('Fail the audit when there at least one chain with at least two requests', () => {
    assert.isTrue(insight.fail);
  });

  it('Does not fail the audit when there is only main doc request', async () => {
    // Need to load a file with only main doc in the the critical requests chains.
    const {data, insights} = await processTrace(this, 'image-delivery.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    insight = getInsightOrError('NetworkDependencyTree', insights, firstNav);

    assert.isFalse(insight.fail);
  });

  // TODO(crbug.com/403507404) Times out
  it.skip('[crbug.com/403507404] Calculates the relatedEvents map (event to warning map)', async () => {
    // Need to load a file with longer dependency chain for this test.
    // Only those requests whose depth >= 2 will be added to the related events.
    const {data, insights} = await processTrace(this, 'web-dev-screenshot-source-ids.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    insight = getInsightOrError('NetworkDependencyTree', insights, firstNav);

    // For NetworkDependencyTree, the relatedEvents is a map format.
    assert.isFalse(Array.isArray(insight.relatedEvents));
    const relatedEvents = insight.relatedEvents as RelatedEventsMap;

    // There are a few chains, let test the first chain
    // |web.dev -> /css -> 4UasrENHsx...UvQ.woff2|
    const root = insight.rootNodes[0];
    const child0 = root.children[0];
    const child00 = child0.children[0];

    // Root's depth is 0, so there isn't any warning message
    assert.deepEqual(relatedEvents.get(root.request), []);
    // child0's depth is 1, so there isn't any warning message
    assert.deepEqual(relatedEvents.get(child0.request), []);
    // child00's depth is 2, so there is one warning message
    assert.deepEqual(
        relatedEvents.get(child00.request), [Trace.Insights.Models.NetworkDependencyTree.UIStrings.warningDescription]);
  });
});
