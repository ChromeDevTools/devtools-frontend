// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TraceModel from '../trace.js';
import * as Types from '../types/types.js';

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
  const insight = navInsights.DocumentLatency;
  if (insight instanceof Error) {
    throw insight;
  }
  return insight;
}

describe('DocumentLatency', function() {
  it('reports savings for main document with redirects', async () => {
    const {data, insights} = await processTrace(this, 'lantern/redirect/trace.json.gz');
    const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);
    assert.strictEqual(insight.redirectDuration, 1779);
    assert.deepEqual(insight.metricSavings, {FCP: 1779, LCP: 1779});
  });

  it('reports no savings for server with low response time', async () => {
    const {data, insights} = await processTrace(this, 'lantern/paul/trace.json.gz');
    const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);
    assert.strictEqual(insight.serverResponseTime, 43);
    assert.deepEqual(insight.metricSavings, {FCP: 0, LCP: 0});
  });

  it('reports savings for server with high response time', async function() {
    const traceEvents = [...await TraceLoader.rawEvents(this, 'lantern/paul/trace.json.gz')];
    const processor = TraceModel.Processor.TraceProcessor.createWithAllHandlers();

    const mainRequestEventIndex = traceEvents.findIndex(e => e.name === 'ResourceReceiveResponse');
    const mainRequestEvent = structuredClone(traceEvents[mainRequestEventIndex]);
    assert(Types.TraceEvents.isTraceEventResourceReceiveResponse(mainRequestEvent));
    assert.strictEqual(mainRequestEvent.args.data.requestId, '1000C0FDC0A75327167272FC7438E999');
    mainRequestEvent.args.data.timing.receiveHeadersStart =
        Types.Timing.MilliSeconds(mainRequestEvent.args.data.timing.receiveHeadersStart + 1000);
    traceEvents[mainRequestEventIndex] = mainRequestEvent;

    await processor.parse(traceEvents);
    const data = processor.traceParsedData;
    if (!data) {
      throw new Error('missing traceParsedData');
    }

    const context = {
      frameId: data.Meta.mainFrameId,
      navigationId: data.Meta.navigationsByNavigationId.keys().next().value,
    };
    const insight = TraceModel.Insights.InsightRunners.DocumentLatency.generateInsight(data, context);
    assert.strictEqual(insight.serverResponseTime, 1043);
    assert.deepEqual(insight.metricSavings, {FCP: 943, LCP: 943});
  });
});
