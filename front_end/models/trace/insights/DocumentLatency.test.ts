// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {createContextForNavigation, getFirstOrError, getInsight} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';
import * as Types from '../types/types.js';

export async function processTrace(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const {parsedTrace, insights} = await TraceLoader.traceEngine(testContext, traceFile);
  if (!insights) {
    throw new Error('No insights');
  }

  return {data: parsedTrace, insights};
}

describeWithEnvironment('DocumentLatency', function() {
  it('reports savings for main document with redirects', async () => {
    const {data, insights} = await processTrace(this, 'lantern/redirect/trace.json.gz');
    const insight =
        getInsight('DocumentLatency', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));
    assert.strictEqual(insight.data?.redirectDuration, 1779);
    assert.deepEqual(insight.metricSavings, {FCP: 1779, LCP: 1779});
  });

  it('reports no savings for server with low response time', async () => {
    const {data, insights} = await processTrace(this, 'lantern/paul/trace.json.gz');
    const insight =
        getInsight('DocumentLatency', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));
    assert.strictEqual(insight.data?.serverResponseTime, 43);
    assert(!insight.data?.serverResponseTooSlow);
    assert.deepEqual(insight.metricSavings, {FCP: 0, LCP: 0});
  });

  it('reports savings for server with high response time', async function() {
    const traceEvents = [...await TraceLoader.rawEvents(this, 'lantern/paul/trace.json.gz')];
    const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();

    const mainRequestEventIndex = traceEvents.findIndex(e => e.name === 'ResourceReceiveResponse');
    const mainRequestEvent = structuredClone(traceEvents[mainRequestEventIndex]);
    assert(Types.Events.isResourceReceiveResponse(mainRequestEvent));
    assert.strictEqual(mainRequestEvent.args.data.requestId, '1000C0FDC0A75327167272FC7438E999');
    if (!mainRequestEvent.args.data.timing) {
      throw new Error('missing timing field');
    }
    mainRequestEvent.args.data.timing.receiveHeadersStart =
        Types.Timing.MilliSeconds(mainRequestEvent.args.data.timing.receiveHeadersStart + 1000);
    traceEvents[mainRequestEventIndex] = mainRequestEvent;

    await processor.parse(traceEvents);
    const data = processor.parsedTrace;
    if (!data) {
      throw new Error('missing parsedTrace');
    }

    const navigation = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const context = createContextForNavigation(navigation, data.Meta.mainFrameId);
    const insight = Trace.Insights.InsightRunners.DocumentLatency.generateInsight(data, context);
    assert.strictEqual(insight.data?.serverResponseTime, 1043);
    assert(insight.data?.serverResponseTooSlow);
    assert.deepEqual(insight.metricSavings, {FCP: 943, LCP: 943});
  });

  it('reports no compression savings for compressed text', async () => {
    const {data, insights} = await processTrace(this, 'lantern/paul/trace.json.gz');
    const insight =
        getInsight('DocumentLatency', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));
    assert.strictEqual(insight.data?.uncompressedResponseBytes, 0);
    assert.deepEqual(insight.metricSavings, {FCP: 0, LCP: 0});
  });

  it('reports compression savings for uncompressed text', async function() {
    const traceEvents = [...await TraceLoader.rawEvents(this, 'lantern/paul/trace.json.gz')];
    const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();

    const mainRequestEventIndex = traceEvents.findIndex(e => e.name === 'ResourceReceiveResponse');
    const mainRequestEvent = structuredClone(traceEvents[mainRequestEventIndex]);
    assert(Types.Events.isResourceReceiveResponse(mainRequestEvent));
    assert.strictEqual(mainRequestEvent.args.data.requestId, '1000C0FDC0A75327167272FC7438E999');
    // Delete content-encoding header.
    mainRequestEvent.args.data.headers = mainRequestEvent.args.data.headers?.filter(h => h.name !== 'content-encoding');
    traceEvents[mainRequestEventIndex] = mainRequestEvent;

    await processor.parse(traceEvents);
    const data = processor.parsedTrace;
    if (!data) {
      throw new Error('missing parsedTrace');
    }

    const navigation = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const context = createContextForNavigation(navigation, data.Meta.mainFrameId);
    const insight = Trace.Insights.InsightRunners.DocumentLatency.generateInsight(data, context);
    assert.strictEqual(insight.data?.uncompressedResponseBytes, 39799);
    assert.deepEqual(insight.metricSavings, {FCP: 0, LCP: 0});
  });
});
