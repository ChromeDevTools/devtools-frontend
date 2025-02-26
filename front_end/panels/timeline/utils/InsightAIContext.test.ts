// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as Utils from './utils.js';

describeWithEnvironment('InsightAIContext', () => {
  it('gets the title from the provided insight', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    assert.isOk(insights);
    const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPPhases', insights, firstNav);
    const aiContext = new Utils.InsightAIContext.ActiveInsight(insight, parsedTrace);
    assert.strictEqual(aiContext.title(), 'LCP by phase');
  });
});

describeWithEnvironment('AIQueries', () => {
  it('can query for network events relevant to the given insight', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    assert.isOk(insights);
    const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPPhases', insights, firstNav);

    const requests = Utils.InsightAIContext.AIQueries.networkRequests(insight, parsedTrace);
    const expected = [
      'https://web.dev/', 'https://web.dev/css/next.css?v=013a61aa',
      'https://web.dev/fonts/material-icons/regular.woff2', 'https://web.dev/fonts/google-sans/regular/latin.woff2',
      'https://web.dev/fonts/google-sans/bold/latin.woff2',
      'https://web-dev.imgix.net/image/jxu1OdD7LKOGIDU7jURMpSH2lyK2/zrBPJq27O4Hs8haszVnK.svg',
      'https://web-dev.imgix.net/image/kheDArv5csY6rvQUJDbWRscckLr1/4i7JstVZvgTFk9dxCe4a.svg',
      'https://web-dev.imgix.net/image/jL3OLOhcWUQDnR4XjewLBx4e3PC3/3164So5aDk7vKTkhx9Vm.png?auto=format&w=1140',
      'https://web.dev/js/app.js?v=fedf5fbe', 'https://web.dev/js/home.js?v=73b0d143',
      'https://web.dev/js/index-7e29abb6.js', 'https://web.dev/js/index-578d2db7.js',
      'https://web.dev/js/index-f45448ab.js', 'https://web.dev/js/actions-f0eb5c8e.js'
    ];
    assert.deepEqual(requests.map(r => r.args.data.url), expected);
  });

  it('correctly calculates the bounds when there are multiple navigations', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'multiple-navigations-render-blocking.json.gz');
    assert.isOk(insights);
    const [firstNav, secondNav] = parsedTrace.Meta.mainFrameNavigations;
    assert.isOk(firstNav);
    assert.isOk(secondNav);
    const lcpNav1 = getInsightOrError('LCPPhases', insights, firstNav);
    const lcpNav2 = getInsightOrError('LCPPhases', insights, secondNav);

    const requests1 = Utils.InsightAIContext.AIQueries.networkRequests(lcpNav1, parsedTrace);
    const requests2 = Utils.InsightAIContext.AIQueries.networkRequests(lcpNav2, parsedTrace);

    // Both navigations load the same page, so we expect the set of URLs to be the same.
    const expected = ['http://localhost:8080/render-blocking', 'http://localhost:8080/render-blocking/script.js'];
    assert.deepEqual(requests1.map(r => r.args.data.url), expected);
    assert.deepEqual(requests2.map(r => r.args.data.url), expected);

    // But we can check that the requests are not equal to each other,
    // and that we got the right ones for each insight.
    // For the first Insight requests, they all happen before the second navigation.
    assert.isTrue(requests1.every(req => req.ts < secondNav.ts));
    // For the second Insight requests, they all happen after second navigation
    assert.isTrue(requests2.every(req => req.ts > secondNav.ts));
  });

  it('can query for main thread activity for an insight', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
    assert.isOk(insights);
    const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPPhases', insights, firstNav);
    const activity = Utils.InsightAIContext.AIQueries.mainThreadActivity(insight, parsedTrace);
    assert.instanceOf(activity, Utils.AICallTree.AICallTree);
    // There are a few smaller tasks but for this test we want to make sure we
    // found the long task of ~999ms.
    const rootNode = activity.rootNode;
    const children = Array.from(rootNode.children().values()).map(n => n.event);
    const longTaskDuration = Trace.Types.Timing.Micro(999544);
    assert.isTrue(children.some(event => event.dur === longTaskDuration));
  });
});
