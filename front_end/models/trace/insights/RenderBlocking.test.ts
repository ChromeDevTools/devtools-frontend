// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../../trace/trace.js';

describe('RenderBlocking', function() {
  setupLocaleHooks();
  it('finds render-blocking requests', async function() {
    const {data, insights} = await processTrace(this, 'load-simple.json.gz');
    assert.deepEqual([...insights.keys()], ['NAVIGATION_0']);
    const insight =
        getInsightOrError('RenderBlocking', insights, data.Meta.navigationsByNavigationId.values().next().value);

    assert.lengthOf(insight.renderBlockingRequests, 2);
    assert.deepEqual(insight.renderBlockingRequests.map(r => r.args.data.url), [
      'https://fonts.googleapis.com/css2?family=Orelega+One&display=swap',
      'http://localhost:8080/styles.css',
    ]);
  });

  it('returns a warning if navigation does not have a first paint event', async function() {
    const {data, insights} = await processTrace(this, 'user-timings.json.gz');
    assert.deepEqual([...insights.keys()], ['NAVIGATION_0']);
    const insight =
        getInsightOrError('RenderBlocking', insights, data.Meta.navigationsByNavigationId.values().next().value);

    assert.lengthOf(insight.renderBlockingRequests, 0);
    assert.strictEqual(insight.warnings?.length, 1);
    assert.strictEqual(insight.warnings?.[0], 'NO_FP');
  });

  it('considers only the navigation specified by the context', async function() {
    const {data, insights} = await processTrace(this, 'multiple-navigations-render-blocking.json.gz');
    assert.deepEqual([...insights.keys()], ['NAVIGATION_0', 'NAVIGATION_1']);
    const navigations = Array.from(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('RenderBlocking', insights, navigations[0]);

    assert(insight.renderBlockingRequests.length > 0, 'no render-blocking requests found');

    assert(
        insight.renderBlockingRequests.every(r => r.args.data.syntheticData.sendStartTime > navigations[0].ts),
        'a result is not contained by the nav bounds');
    assert(
        insight.renderBlockingRequests.every(r => r.args.data.syntheticData.finishTime < navigations[1].ts),
        'a result is not contained by the nav bounds');
  });

  it('considers navigations separately', async function() {
    const {data, insights} = await processTrace(this, 'multiple-navigations-render-blocking.json.gz');
    assert.deepEqual([...insights.keys()], ['NAVIGATION_0', 'NAVIGATION_1']);
    const navigations = Array.from(data.Meta.navigationsByNavigationId.values());
    const insightOne = getInsightOrError('RenderBlocking', insights, navigations[0]);
    const insightTwo = getInsightOrError('RenderBlocking', insights, navigations[1]);
    assert.deepEqual(insightOne.renderBlockingRequests.map(r => r.args.data.requestId), ['99116.2']);
    assert.deepEqual(insightTwo.renderBlockingRequests.map(r => r.args.data.requestId), ['99116.5']);
  });

  it('considers only the frame specified by the context', async function() {
    const {data, insights} = await processTrace(this, 'render-blocking-in-iframe.json.gz');
    assert.deepEqual([...insights.keys()], ['NAVIGATION_0']);
    const navigations = Array.from(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('RenderBlocking', insights, navigations[0]);

    assert(insight.renderBlockingRequests.length > 0, 'no render-blocking requests found');

    assert(
        insight.renderBlockingRequests.every(r => r.args.data.frame === data.Meta.mainFrameId),
        'a result is not from the main frame');
  });

  it('ignores blocking request after first paint', async function() {
    const {data, insights} = await processTrace(this, 'parser-blocking-after-paint.json.gz');
    assert.deepEqual([...insights.keys()], ['NAVIGATION_0']);
    const insight =
        getInsightOrError('RenderBlocking', insights, data.Meta.navigationsByNavigationId.values().next().value);

    assert.lengthOf(insight.renderBlockingRequests, 0);
  });

  it('correctly handles body parser blocking requests', async function() {
    const {data, insights} = await processTrace(this, 'render-blocking-body.json.gz');
    assert.deepEqual([...insights.keys()], ['NAVIGATION_0']);
    const insight =
        getInsightOrError('RenderBlocking', insights, data.Meta.navigationsByNavigationId.values().next().value);

    assert.deepEqual(insight.renderBlockingRequests.map(r => r.args.data.url), [
      'http://localhost:8080/render-blocking/style.css',
      'http://localhost:8080/render-blocking/script.js?beforeImage',
    ]);
  });

  // TODO(crbug.com/372674229): when swapping to 'provided' instead of 'simulated', all these test traces give
  // uninteresting results. must get new traces.

  it('estimates savings with Lantern (image LCP)', async function() {
    const {data, insights} = await processTrace(this, 'lantern/render-blocking/trace.json.gz');
    assert.deepEqual([...insights.keys()], ['NAVIGATION_0']);
    const insight =
        getInsightOrError('RenderBlocking', insights, data.Meta.navigationsByNavigationId.values().next().value);

    assert.deepEqual(insight.metricSavings, {
      FCP: 0,
      LCP: 0,
    } as Trace.Insights.Types.MetricSavings);

    assert.exists(insight.requestIdToWastedMs);
    const urlToWastedMs = [...insight.requestIdToWastedMs].map(([requestId, wastedMs]) => {
      const url = insight.renderBlockingRequests.find(r => r.args.data.requestId === requestId)?.args.data.url;
      return [url, wastedMs];
    });
    assert.deepEqual(urlToWastedMs, []);
  });

  it('estimates savings with Lantern (text LCP)', async function() {
    const {data, insights} = await processTrace(this, 'lantern/typescript-angular/trace.json.gz');
    assert.deepEqual([...insights.keys()], ['NAVIGATION_0']);
    const insight =
        getInsightOrError('RenderBlocking', insights, data.Meta.navigationsByNavigationId.values().next().value);

    assert.deepEqual(insight.metricSavings, {
      FCP: 0,
      LCP: 0,
    } as Trace.Insights.Types.MetricSavings);
    assert.exists(insight.requestIdToWastedMs);
    const urlToWastedMs = [...insight.requestIdToWastedMs].map(([requestId, wastedMs]) => {
      const url = insight.renderBlockingRequests.find(r => r.args.data.requestId === requestId)?.args.data.url;
      return [url, wastedMs];
    });
    assert.deepEqual(urlToWastedMs, []);
  });

  it('estimates savings with Lantern for redirected render-blocking request', async function() {
    const baseEvents = [...await TraceLoader.rawEvents(this, 'lantern/render-blocking/trace.json.gz')];
    const baseProcessor = Trace.Processor.TraceProcessor.createWithAllHandlers();
    await baseProcessor.parse(baseEvents, {
      isCPUProfile: false,
      isFreshRecording: true,
      lanternSettings: {throttlingMethod: 'simulate'},
    });
    assert.isOk(baseProcessor.data);
    assert.isOk(baseProcessor.insights);
    const baseInsight = getInsightOrError('RenderBlocking', baseProcessor.insights,
                                          baseProcessor.data.Meta.navigationsByNavigationId.values().next().value);

    const traceEvents = [...baseEvents];
    const sendRequestIndex = traceEvents.findIndex(
        e => Trace.Types.Events.isResourceSendRequest(e) && e.args.data.url.endsWith('style.css'),
    );
    const sendRequest = structuredClone(traceEvents[sendRequestIndex]) as Trace.Types.Events.ResourceSendRequest;
    const requestId = sendRequest.args.data.requestId;

    // Insert an initial redirect hop for style.css at the original start time, and shift the final hop slightly later.
    const redirectSendRequest = structuredClone(sendRequest);
    redirectSendRequest.args.data.url = 'http://localhost:8080/redirect-style.css';
    sendRequest.ts = Trace.Types.Timing.Micro(sendRequest.ts + 100);
    traceEvents[sendRequestIndex] = sendRequest;
    traceEvents.splice(sendRequestIndex, 0, redirectSendRequest);

    const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();
    await processor.parse(traceEvents, {
      isCPUProfile: false,
      isFreshRecording: true,
      lanternSettings: {throttlingMethod: 'simulate'},
    });
    assert.isOk(processor.data);
    assert.isOk(processor.insights);

    const insight = getInsightOrError('RenderBlocking', processor.insights,
                                      processor.data.Meta.navigationsByNavigationId.values().next().value);
    assert.exists(baseInsight.requestIdToWastedMs);
    assert.exists(insight.requestIdToWastedMs);
    const baseWastedMs = baseInsight.requestIdToWastedMs.get(requestId) ?? 0;
    const redirectedWastedMs = insight.requestIdToWastedMs.get(requestId) ?? 0;
    assert.strictEqual(baseWastedMs, 2254);
    assert.strictEqual(redirectedWastedMs, 2434);
    assert.isAbove(insight.metricSavings?.FCP ?? 0, baseInsight.metricSavings?.FCP ?? 0);
    assert.isAbove(insight.metricSavings?.FCP ?? 0, baseWastedMs);
  });

  it('includes redirect duration in wastedMs when individual hops are below minimum threshold', async function() {
    const traceEvents = [...await TraceLoader.rawEvents(this, 'lantern/render-blocking/trace.json.gz')];
    const sendRequestIndex = traceEvents.findIndex(
        e => Trace.Types.Events.isResourceSendRequest(e) && e.args.data.url.endsWith('style.css'),
    );
    const sendRequest = structuredClone(traceEvents[sendRequestIndex]) as Trace.Types.Events.ResourceSendRequest;
    const requestId = sendRequest.args.data.requestId;

    // Insert an initial redirect hop for style.css at the original start time, and shift the final hop slightly later.
    const redirectSendRequest = structuredClone(sendRequest);
    redirectSendRequest.args.data.url = 'http://localhost:8080/redirect-style.css';
    sendRequest.ts = Trace.Types.Timing.Micro(sendRequest.ts + 100);
    traceEvents[sendRequestIndex] = sendRequest;
    traceEvents.splice(sendRequestIndex, 0, redirectSendRequest);

    // Make the final response tiny so neither hop alone reaches MINIMUM_WASTED_MS (50ms) at 30ms RTT,
    // but their combined duration (~60ms) does.
    const finishIndex =
        traceEvents.findIndex(e => Trace.Types.Events.isResourceFinish(e) && e.args.data.requestId === requestId);
    const finishEvent = structuredClone(traceEvents[finishIndex]) as Trace.Types.Events.ResourceFinish;
    finishEvent.args.data.encodedDataLength = 100;
    traceEvents[finishIndex] = finishEvent;

    const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();
    await processor.parse(traceEvents, {
      isCPUProfile: false,
      isFreshRecording: true,
      lanternSettings: {
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 30,
          throughputKbps: 100_000,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 30,
          downloadThroughputKbps: 100_000,
          uploadThroughputKbps: 100_000,
        },
      },
    });
    assert.isOk(processor.data);
    assert.isOk(processor.insights);

    const insight = getInsightOrError('RenderBlocking', processor.insights,
                                      processor.data.Meta.navigationsByNavigationId.values().next().value);
    assert.exists(insight.requestIdToWastedMs);
    assert.isAtLeast(insight.requestIdToWastedMs.get(requestId) ?? 0, 60);
  });
});
