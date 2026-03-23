// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {
  createContextForNavigation,
  getFirstOrError,
  getInsightOrError,
  processTrace,
} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';
import * as Types from '../types/types.js';

const TRACE_FILE = 'web-dev-with-commit.json.gz';

interface InsightOverrides {
  isLinkPreload?: boolean;
  fetchPriorityHint?: Types.Events.FetchPriorityHint;
  loadingAttr?: string;
}

async function generateInsightWithOverrides(testContext: Mocha.Context, overrides: InsightOverrides):
    Promise<Trace.Insights.Models.LCPDiscovery.LCPDiscoveryInsightModel> {
  const {data: seedData, insights: seedInsights} = await processTrace(testContext, TRACE_FILE);
  const seedNavigation = getFirstOrError(seedData.Meta.navigationsByNavigationId.values());
  const seedContext = createContextForNavigation(seedData, seedNavigation, seedData.Meta.mainFrameId);
  const seedInsight = getInsightOrError('LCPDiscovery', seedInsights, seedNavigation);
  const seedLcpRequest = seedData.LargestImagePaint.lcpRequestByNavigationId.get(seedContext.navigationId);

  const seedNavigationId = seedNavigation.args.data?.navigationId;
  const seedLcpNodeId = seedInsight.lcpEvent?.args.data?.nodeId;
  if (!seedLcpRequest || !seedNavigationId || !seedLcpNodeId) {
    throw new Error('missing LCP seed data');
  }

  const traceEvents = [...await TraceLoader.rawEvents(testContext, TRACE_FILE)];

  const lcpSendRequestEventIndex = traceEvents.findIndex(event => {
    return Types.Events.isResourceSendRequest(event) &&
        event.args.data.requestId === seedLcpRequest.args.data.requestId;
  });
  if (lcpSendRequestEventIndex === -1) {
    throw new Error('missing LCP ResourceSendRequest');
  }

  const lcpSendRequest = structuredClone(traceEvents[lcpSendRequestEventIndex]);
  assert(Types.Events.isResourceSendRequest(lcpSendRequest));
  if (overrides.isLinkPreload !== undefined) {
    lcpSendRequest.args.data.isLinkPreload = overrides.isLinkPreload;
  }
  if (overrides.fetchPriorityHint !== undefined) {
    lcpSendRequest.args.data.fetchPriorityHint = overrides.fetchPriorityHint;
  }
  traceEvents[lcpSendRequestEventIndex] = lcpSendRequest;

  if (overrides.loadingAttr !== undefined) {
    const lcpEventIndex = traceEvents.findIndex(event => {
      return Types.Events.isAnyLargestContentfulPaintCandidate(event) &&
          event.args.data?.navigationId === seedNavigationId && event.args.data?.nodeId === seedLcpNodeId;
    });
    if (lcpEventIndex === -1) {
      throw new Error('missing LCP candidate event');
    }

    const lcpEvent = structuredClone(traceEvents[lcpEventIndex]);
    assert(Types.Events.isAnyLargestContentfulPaintCandidate(lcpEvent));
    if (!lcpEvent.args.data) {
      throw new Error('missing LCP candidate data');
    }
    lcpEvent.args.data.loadingAttr = overrides.loadingAttr;
    traceEvents[lcpEventIndex] = lcpEvent;
  }

  const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();
  await processor.parse(traceEvents, {isCPUProfile: false, isFreshRecording: true});
  const data = processor.data;
  if (!data) {
    throw new Error('missing parsed data');
  }

  const navigation = getFirstOrError(data.Meta.navigationsByNavigationId.values());
  const context = createContextForNavigation(data, navigation, data.Meta.mainFrameId);
  return Trace.Insights.Models.LCPDiscovery.generateInsight(data, context);
}

describeWithEnvironment('LCPDiscovery', function() {
  it('calculates image lcp attributes', async function() {
    const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPDiscovery', insights, firstNav);
    const {checklist} = insight;

    assert.exists(checklist);
    assert.isFalse(checklist.priorityHinted.value);
    assert.isTrue(checklist.requestDiscoverable.value);
    assert.isTrue(checklist.eagerlyLoaded.value);
  });

  it('uses the fetchpriority=high text when the image has fetchpriority set', async function() {
    const {data, insights} = await processTrace(this, 'lcp-fetchpriority-high.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPDiscovery', insights, firstNav);
    assert.isOk(insight.checklist);
    assert.isTrue(insight.checklist.priorityHinted.value);
    assert.strictEqual(insight.checklist.priorityHinted.label, 'fetchpriority=high applied');
  });

  it('uses the should apply fetchpriority=high text when the image does not fetchpriority set', async function() {
    const {data, insights} = await processTrace(this, TRACE_FILE);
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPDiscovery', insights, firstNav);
    assert.isOk(insight.checklist);
    assert.isFalse(insight.checklist.priorityHinted.value);
    assert.strictEqual(insight.checklist.priorityHinted.label, 'fetchpriority=high should be applied');
  });

  it('uses preload-specific fetchpriority text when preload request misses fetchpriority', async function() {
    const insight = await generateInsightWithOverrides(this, {
      isLinkPreload: true,
      fetchPriorityHint: 'auto',
    });

    assert.isOk(insight.checklist);
    assert.isFalse(insight.checklist.priorityHinted.value);
    assert.strictEqual(
        insight.checklist.priorityHinted.label,
        'fetchpriority=high should be applied to the image preload request',
    );
  });

  it('does not fail lazy-load check when lazy image is preloaded with fetchpriority=high', async function() {
    const insight = await generateInsightWithOverrides(this, {
      isLinkPreload: true,
      fetchPriorityHint: 'high',
      loadingAttr: 'lazy',
    });

    assert.isOk(insight.checklist);
    assert.isTrue(insight.checklist.priorityHinted.value);
    assert.isTrue(insight.checklist.requestDiscoverable.value);
    assert.isTrue(insight.checklist.eagerlyLoaded.value);
    assert.strictEqual(insight.checklist.eagerlyLoaded.label, 'LCP resources should not use loading=lazy');
    assert.strictEqual(insight.state, 'pass');
  });

  it('does not fail lazy-load check when lazy image preload is not fetchpriority=high', async function() {
    const insight = await generateInsightWithOverrides(this, {
      isLinkPreload: true,
      fetchPriorityHint: 'auto',
      loadingAttr: 'lazy',
    });

    assert.isOk(insight.checklist);
    assert.isFalse(insight.checklist.priorityHinted.value);
    assert.isTrue(insight.checklist.requestDiscoverable.value);
    assert.isTrue(insight.checklist.eagerlyLoaded.value);
    assert.strictEqual(insight.checklist.eagerlyLoaded.label, 'LCP resources should not use loading=lazy');
    assert.strictEqual(
        insight.checklist.priorityHinted.label,
        'fetchpriority=high should be applied to the image preload request',
    );
    assert.strictEqual(insight.state, 'fail');
  });

  it('calculates the LCP optimal time as the document request download start time', async function() {
    const {data, insights} = await processTrace(this, TRACE_FILE);
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPDiscovery', insights, firstNav);
    assert.strictEqual(
        insight.earliestDiscoveryTimeTs,
        // this is the TTFB for the document request
        122411004828,
    );
  });

  describe('warnings', function() {
    it('warns when there is no lcp', async function() {
      const {data, insights} = await processTrace(this, 'user-timings.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPDiscovery', insights, firstNav);

      assert.strictEqual(insight.warnings?.[0], 'NO_LCP');
    });

    it('no main document url', async function() {
      const {data, insights} = await processTrace(this, 'about-blank-first.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPDiscovery', insights, firstNav);

      assert.strictEqual(insight.warnings?.[0], 'NO_DOCUMENT_REQUEST');
    });
  });
});
