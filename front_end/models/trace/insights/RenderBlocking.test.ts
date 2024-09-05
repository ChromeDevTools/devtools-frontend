// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import type * as TraceModel from '../trace.js';

export async function processTrace(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const {traceData, insights} = await TraceLoader.traceEngine(testContext, traceFile);
  if (!insights) {
    throw new Error('No insights');
  }

  return {data: traceData, insights};
}

function getInsight(insights: TraceModel.Insights.Types.TraceInsightData, navigationId: string) {
  const navInsights = insights.get(navigationId);
  if (!navInsights) {
    throw new Error('missing navInsights');
  }
  const insight = navInsights.RenderBlocking;
  if (insight instanceof Error) {
    throw insight;
  }
  return insight;
}

describeWithEnvironment('RenderBlockingRequests', function() {
  it('finds render blocking requests', async () => {
    const {data, insights} = await processTrace(this, 'load-simple.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);

    assert.strictEqual(insight.renderBlockingRequests.length, 2);
    assert.deepEqual(insight.renderBlockingRequests.map(r => r.args.data.url), [
      'https://fonts.googleapis.com/css2?family=Orelega+One&display=swap',
      'http://localhost:8080/styles.css',
    ]);
  });

  it('returns a warning if navigation does not have a first paint event', async () => {
    const {data, insights} = await processTrace(this, 'user-timings.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);

    assert.strictEqual(insight.renderBlockingRequests.length, 0);
    assert.strictEqual(insight.warnings?.length, 1);
    assert.strictEqual(insight.warnings?.[0], 'NO_FP');
  });

  it('considers only the navigation specified by the context', async () => {
    const {data, insights} = await processTrace(this, 'multiple-navigations-render-blocking.json.gz');
    assert.strictEqual(insights.size, 2);
    const navigations = Array.from(data.Meta.navigationsByNavigationId.values());
    const insight = getInsight(insights, navigations[0].args.data?.navigationId || '');

    assert(insight.renderBlockingRequests.length > 0, 'no render blocking requests found');

    assert(
        insight.renderBlockingRequests.every(r => r.args.data.syntheticData.sendStartTime > navigations[0].ts),
        'a result is not contained by the nav bounds');
    assert(
        insight.renderBlockingRequests.every(r => r.args.data.syntheticData.finishTime < navigations[1].ts),
        'a result is not contained by the nav bounds');
  });

  it('considers navigations separately', async () => {
    const {data, insights} = await processTrace(this, 'multiple-navigations-render-blocking.json.gz');
    assert.strictEqual(insights.size, 2);
    const navigations = Array.from(data.Meta.navigationsByNavigationId.values());
    const insightOne = getInsight(insights, navigations[0].args.data?.navigationId || '');
    const insightTwo = getInsight(insights, navigations[1].args.data?.navigationId || '');
    assert.deepStrictEqual(insightOne.renderBlockingRequests.map(r => r.args.data.requestId), ['99116.2']);
    assert.deepStrictEqual(insightTwo.renderBlockingRequests.map(r => r.args.data.requestId), ['99116.5']);
  });

  it('considers only the frame specified by the context', async () => {
    const {data, insights} = await processTrace(this, 'render-blocking-in-iframe.json.gz');
    assert.strictEqual(insights.size, 1);
    const navigations = Array.from(data.Meta.navigationsByNavigationId.values());
    const insight = getInsight(insights, navigations[0].args.data?.navigationId || '');

    assert(insight.renderBlockingRequests.length > 0, 'no render blocking requests found');

    assert(
        insight.renderBlockingRequests.every(r => r.args.data.frame === data.Meta.mainFrameId),
        'a result is not from the main frame');
  });

  it('ignores blocking request after first paint', async () => {
    const {data, insights} = await processTrace(this, 'parser-blocking-after-paint.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);

    assert.strictEqual(insight.renderBlockingRequests.length, 0);
  });

  it('correctly handles body parser blocking requests', async () => {
    const {data, insights} = await processTrace(this, 'render-blocking-body.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);

    assert.deepStrictEqual(insight.renderBlockingRequests.map(r => r.args.data.url), [
      'http://localhost:8080/render-blocking/style.css',
      'http://localhost:8080/render-blocking/script.js?beforeImage',
    ]);
  });

  it('estimates savings with Lantern (image LCP)', async () => {
    const {data, insights} = await processTrace(this, 'lantern/render-blocking/trace.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);

    assert.deepStrictEqual(insight.metricSavings, {
      FCP: 2250,
      LCP: 0,
    });

    assert.exists(insight.requestIdToWastedMs);
    const urlToWastedMs = [...insight.requestIdToWastedMs].map(([requestId, wastedMs]) => {
      const url = insight.renderBlockingRequests.find(r => r.args.data.requestId === requestId)?.args.data.url;
      return [url, wastedMs];
    });
    assert.deepStrictEqual(urlToWastedMs, [
      ['http://localhost:50049/style.css', 2254],
      ['http://localhost:50049/script.js', 304],
    ]);
  });

  it('estimates savings with Lantern (text LCP)', async () => {
    const {data, insights} = await processTrace(this, 'lantern/typescript-angular/trace.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);

    assert.deepStrictEqual(insight.metricSavings, {
      FCP: 13,
      LCP: 13,
    });
    assert.exists(insight.requestIdToWastedMs);
    const urlToWastedMs = [...insight.requestIdToWastedMs].map(([requestId, wastedMs]) => {
      const url = insight.renderBlockingRequests.find(r => r.args.data.requestId === requestId)?.args.data.url;
      return [url, wastedMs];
    });
    assert.deepStrictEqual(urlToWastedMs, [
      ['http://[::]:8000/typescript-angular/node_modules/todomvc-common/base.css', 153],
      ['http://[::]:8000/typescript-angular/node_modules/todomvc-app-css/index.css', 303],
      ['http://[::]:8000/typescript-angular/node_modules/todomvc-common/base.js', 303],
      ['http://[::]:8000/typescript-angular/node_modules/angular/angular.js', 303],
      ['http://[::]:8000/typescript-angular/js/Application.js', 303],
    ]);
  });
});
