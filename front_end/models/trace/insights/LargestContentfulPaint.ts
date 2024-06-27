// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {InsightWarning, type LCPInsightResult, type NavigationInsightContext, type RequiredData} from './types.js';

export function deps(): ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint', 'Meta'] {
  return ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint', 'Meta'];
}

export interface LCPPhases {
  /**
   * The time between when the user initiates loading the page until when
   * the browser receives the first byte of the html response.
   */
  ttfb: Types.Timing.MilliSeconds;
  /**
   * The time between ttfb and the LCP resource request being started.
   * For a text LCP, this is undefined given no resource is loaded.
   */
  loadDelay?: Types.Timing.MilliSeconds;
  /**
   * The time it takes to load the LCP resource.
   */
  loadTime?: Types.Timing.MilliSeconds;
  /**
   * The time between when the LCP resource finishes loading and when
   * the LCP element is rendered.
   */
  renderDelay: Types.Timing.MilliSeconds;
}

function breakdownPhases(
    nav: Types.TraceEvents.TraceEventNavigationStart, mainRequest: Types.TraceEvents.SyntheticNetworkRequest,
    lcpMs: Types.Timing.MilliSeconds, lcpRequest: Types.TraceEvents.SyntheticNetworkRequest|null): LCPPhases {
  const mainReqTiming = mainRequest.args.data.timing;
  if (!mainReqTiming) {
    throw new Error('no timing for main resource');
  }
  const firstDocByteTs = Helpers.Timing.secondsToMicroseconds(mainReqTiming.requestTime) +
      Helpers.Timing.millisecondsToMicroseconds(mainReqTiming.receiveHeadersStart);

  const firstDocByteTiming = Types.Timing.MicroSeconds(firstDocByteTs - nav.ts);
  const ttfb = Helpers.Timing.microSecondsToMilliseconds(firstDocByteTiming);
  let renderDelay = Types.Timing.MilliSeconds(lcpMs - ttfb);

  if (!lcpRequest) {
    return {ttfb, renderDelay};
  }

  const lcpStartTs = Types.Timing.MicroSeconds(lcpRequest.ts - nav.ts);
  const resourceStart = Helpers.Timing.microSecondsToMilliseconds(lcpStartTs);

  const lcpReqEndTs = Types.Timing.MicroSeconds(lcpRequest.args.data.syntheticData.finishTime - nav.ts);
  const resourceEnd = Helpers.Timing.microSecondsToMilliseconds(lcpReqEndTs);

  const loadDelay = Types.Timing.MilliSeconds(resourceStart - ttfb);
  const loadTime = Types.Timing.MilliSeconds(resourceEnd - resourceStart);
  renderDelay = Types.Timing.MilliSeconds(lcpMs - resourceEnd);

  return {
    ttfb,
    loadDelay,
    loadTime,
    renderDelay,
  };
}

function findLCPRequest(
    traceParsedData: RequiredData<typeof deps>, context: NavigationInsightContext,
    lcpEvent: Types.TraceEvents.TraceEventLargestContentfulPaintCandidate): Types.TraceEvents.SyntheticNetworkRequest|
    null {
  const lcpNodeId = lcpEvent.args.data?.nodeId;
  if (!lcpNodeId) {
    throw new Error('no lcp node id');
  }

  const imagePaint = traceParsedData.LargestImagePaint.get(lcpNodeId);
  if (!imagePaint) {
    return null;
  }

  const lcpUrl = imagePaint.args.data?.imageUrl;
  if (!lcpUrl) {
    throw new Error('no lcp url');
  }
  // Look for the LCP resource.
  const lcpResource = traceParsedData.NetworkRequests.byTime.find(req => {
    const nav =
        Helpers.Trace.getNavigationForTraceEvent(req, context.frameId, traceParsedData.Meta.navigationsByFrameId);
    return (nav?.args.data?.navigationId === context.navigationId) && (req.args.data.url === lcpUrl);
  });

  if (!lcpResource) {
    throw new Error('no lcp resource found');
  }

  return lcpResource;
}

export function generateInsight(
    traceParsedData: RequiredData<typeof deps>, context: NavigationInsightContext): LCPInsightResult {
  const networkRequests = traceParsedData.NetworkRequests;

  const nav = traceParsedData.Meta.navigationsByNavigationId.get(context.navigationId);
  if (!nav) {
    throw new Error('no trace navigation');
  }

  const frameMetrics = traceParsedData.PageLoadMetrics.metricScoresByFrameId.get(context.frameId);
  if (!frameMetrics) {
    throw new Error('no frame metrics');
  }

  const navMetrics = frameMetrics.get(context.navigationId);
  if (!navMetrics) {
    throw new Error('no navigation metrics');
  }
  const metricScore = navMetrics.get(Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP);
  const lcpEvent = metricScore?.event;
  if (!lcpEvent || !Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(lcpEvent)) {
    return {warnings: [InsightWarning.NO_LCP]};
  }

  // This helps calculate the phases.
  const lcpMs = Helpers.Timing.microSecondsToMilliseconds(metricScore.timing);
  // This helps position things on the timeline's UI accurately for a trace.
  const lcpTs = metricScore.event?.ts ? Helpers.Timing.microSecondsToMilliseconds(metricScore.event?.ts) : undefined;
  const lcpResource = findLCPRequest(traceParsedData, context, lcpEvent);
  const mainReq = networkRequests.byTime.find(req => req.args.data.requestId === context.navigationId);
  if (!mainReq) {
    return {lcpMs, lcpTs, warnings: [InsightWarning.NO_DOCUMENT_REQUEST]};
  }

  if (!lcpResource) {
    return {
      lcpMs: lcpMs,
      lcpTs: lcpTs,
      phases: breakdownPhases(nav, mainReq, lcpMs, lcpResource),
    };
  }

  const imageLoadingAttr = lcpEvent.args.data?.loadingAttr;
  const imagePreloaded = lcpResource?.args.data.isLinkPreload || lcpResource?.args.data.initiator?.type === 'preload';
  const imageFetchPriorityHint = lcpResource?.args.data.fetchPriorityHint;

  return {
    lcpMs: lcpMs,
    lcpTs: lcpTs,
    phases: breakdownPhases(nav, mainReq, lcpMs, lcpResource),
    shouldRemoveLazyLoading: imageLoadingAttr === 'lazy',
    shouldIncreasePriorityHint: imageFetchPriorityHint !== 'high',
    shouldPreloadImage: !imagePreloaded,
  };
}
