// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {findLCPRequest} from './Common.js';
import {type BoundedInsightContext, type InsightResult, InsightWarning, type RequiredData} from './types.js';

export function deps(): ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint', 'Meta'] {
  return ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint', 'Meta'];
}

interface LCPPhases {
  /**
   * The time between when the user initiates loading the page until when
   * the browser receives the first byte of the html response.
   */
  ttfb: Types.Timing.MilliSeconds;
  /**
   * The time between ttfb and the LCP request request being started.
   * For a text LCP, this is undefined given no request is loaded.
   */
  loadDelay?: Types.Timing.MilliSeconds;
  /**
   * The time it takes to load the LCP request.
   */
  loadTime?: Types.Timing.MilliSeconds;
  /**
   * The time between when the LCP request finishes loading and when
   * the LCP element is rendered.
   */
  renderDelay: Types.Timing.MilliSeconds;
}

export type LCPInsightResult = InsightResult<{
  lcpMs?: Types.Timing.MilliSeconds,
  lcpTs?: Types.Timing.MilliSeconds,
  phases?: LCPPhases,
  shouldRemoveLazyLoading?: boolean,
  shouldIncreasePriorityHint?: boolean,
  shouldPreloadImage?: boolean,
  /** The network request for the LCP image, if there was one. */
  lcpRequest?: Types.TraceEvents.SyntheticNetworkRequest,
  earliestDiscoveryTimeTs?: Types.Timing.MicroSeconds,
}>;

function breakdownPhases(
    nav: Types.TraceEvents.TraceEventNavigationStart, docRequest: Types.TraceEvents.SyntheticNetworkRequest,
    lcpMs: Types.Timing.MilliSeconds, lcpRequest: Types.TraceEvents.SyntheticNetworkRequest|null): LCPPhases {
  const docReqTiming = docRequest.args.data.timing;
  if (!docReqTiming) {
    throw new Error('no timing for document request');
  }
  const firstDocByteTs = Helpers.Timing.secondsToMicroseconds(docReqTiming.requestTime) +
      Helpers.Timing.millisecondsToMicroseconds(docReqTiming.receiveHeadersStart);

  const firstDocByteTiming = Types.Timing.MicroSeconds(firstDocByteTs - nav.ts);
  const ttfb = Helpers.Timing.microSecondsToMilliseconds(firstDocByteTiming);
  let renderDelay = Types.Timing.MilliSeconds(lcpMs - ttfb);

  if (!lcpRequest) {
    return {ttfb, renderDelay};
  }

  const lcpStartTs = Types.Timing.MicroSeconds(lcpRequest.ts - nav.ts);
  const requestStart = Helpers.Timing.microSecondsToMilliseconds(lcpStartTs);

  const lcpReqEndTs = Types.Timing.MicroSeconds(lcpRequest.args.data.syntheticData.finishTime - nav.ts);
  const requestEnd = Helpers.Timing.microSecondsToMilliseconds(lcpReqEndTs);

  const loadDelay = Types.Timing.MilliSeconds(requestStart - ttfb);
  const loadTime = Types.Timing.MilliSeconds(requestEnd - requestStart);
  renderDelay = Types.Timing.MilliSeconds(lcpMs - requestEnd);

  return {
    ttfb,
    loadDelay,
    loadTime,
    renderDelay,
  };
}

export function generateInsight(
    traceParsedData: RequiredData<typeof deps>, context: BoundedInsightContext): LCPInsightResult {
  // TODO(crbug.com/366049346) make this work w/o a navigation.
  if (!context.navigation) {
    return {};
  }

  const networkRequests = traceParsedData.NetworkRequests;

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
  const lcpRequest = findLCPRequest(traceParsedData, context, lcpEvent);
  const docRequest = networkRequests.byTime.find(req => req.args.data.requestId === context.navigationId);
  if (!docRequest) {
    return {lcpMs, lcpTs, warnings: [InsightWarning.NO_DOCUMENT_REQUEST]};
  }

  if (!lcpRequest) {
    return {
      lcpMs,
      lcpTs,
      phases: breakdownPhases(context.navigation, docRequest, lcpMs, lcpRequest),
    };
  }

  const imageLoadingAttr = lcpEvent.args.data?.loadingAttr;
  const imagePreloaded = lcpRequest?.args.data.isLinkPreload || lcpRequest?.args.data.initiator?.type === 'preload';
  const imageFetchPriorityHint = lcpRequest?.args.data.fetchPriorityHint;

  // This is the earliest discovery time an LCP request could have - it's TTFB.
  const earliestDiscoveryTime = docRequest && docRequest.args.data.timing ?
      Helpers.Timing.secondsToMicroseconds(docRequest.args.data.timing.requestTime) +
          Helpers.Timing.millisecondsToMicroseconds(docRequest.args.data.timing.receiveHeadersStart) :
      undefined;

  return {
    lcpMs,
    lcpTs,
    phases: breakdownPhases(context.navigation, docRequest, lcpMs, lcpRequest),
    shouldRemoveLazyLoading: imageLoadingAttr === 'lazy',
    shouldIncreasePriorityHint: imageFetchPriorityHint !== 'high',
    shouldPreloadImage: !imagePreloaded,
    lcpRequest,
    earliestDiscoveryTimeTs: earliestDiscoveryTime ? Types.Timing.MicroSeconds(earliestDiscoveryTime) : undefined,
  };
}
