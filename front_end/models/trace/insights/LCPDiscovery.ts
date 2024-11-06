// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {type InsightModel, type InsightSetContext, InsightWarning, type RequiredData} from './types.js';

export function deps(): ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint', 'Meta'] {
  return ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint', 'Meta'];
}

export type LCPDiscoveryModel = InsightModel<{
  lcpEvent?: Types.Events.LargestContentfulPaintCandidate,
  shouldRemoveLazyLoading?: boolean,
  shouldIncreasePriorityHint?: boolean,
  shouldPreloadImage?: boolean,
  /** The network request for the LCP image, if there was one. */
  lcpRequest?: Types.Events.SyntheticNetworkRequest,
  earliestDiscoveryTimeTs?: Types.Timing.MicroSeconds,
}>;

export function generateInsight(parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): LCPDiscoveryModel {
  if (!context.navigation) {
    return {};
  }

  const networkRequests = parsedTrace.NetworkRequests;

  const frameMetrics = parsedTrace.PageLoadMetrics.metricScoresByFrameId.get(context.frameId);
  if (!frameMetrics) {
    throw new Error('no frame metrics');
  }

  const navMetrics = frameMetrics.get(context.navigationId);
  if (!navMetrics) {
    throw new Error('no navigation metrics');
  }
  const metricScore = navMetrics.get(Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP);
  const lcpEvent = metricScore?.event;
  if (!lcpEvent || !Types.Events.isLargestContentfulPaintCandidate(lcpEvent)) {
    return {warnings: [InsightWarning.NO_LCP]};
  }

  const docRequest = networkRequests.byTime.find(req => req.args.data.requestId === context.navigationId);
  if (!docRequest) {
    return {lcpEvent, warnings: [InsightWarning.NO_DOCUMENT_REQUEST]};
  }

  const lcpRequest = parsedTrace.LargestImagePaint.lcpRequestByNavigation.get(context.navigation);
  if (!lcpRequest) {
    return {
      lcpEvent,
    };
  }

  const initiatorUrl = lcpRequest.args.data.initiator?.url;
  // TODO(b/372319476): Explore using trace event HTMLDocumentParser::FetchQueuedPreloads to determine if the request
  // is discovered by the preload scanner.
  const initiatedByMainDoc =
      lcpRequest?.args.data.initiator?.type === 'parser' && docRequest.args.data.url === initiatorUrl;
  const imgPreloadedOrFoundInHTML = lcpRequest?.args.data.isLinkPreload || initiatedByMainDoc;

  const imageLoadingAttr = lcpEvent.args.data?.loadingAttr;
  const imageFetchPriorityHint = lcpRequest?.args.data.fetchPriorityHint;
  // This is the earliest discovery time an LCP request could have - it's TTFB.
  const earliestDiscoveryTime = docRequest && docRequest.args.data.timing ?
      Helpers.Timing.secondsToMicroseconds(docRequest.args.data.timing.requestTime) +
          Helpers.Timing.millisecondsToMicroseconds(docRequest.args.data.timing.receiveHeadersStart) :
      undefined;

  return {
    lcpEvent,
    shouldRemoveLazyLoading: imageLoadingAttr === 'lazy',
    shouldIncreasePriorityHint: imageFetchPriorityHint !== 'high',
    shouldPreloadImage: !imgPreloadedOrFoundInHTML,
    lcpRequest,
    earliestDiscoveryTimeTs: earliestDiscoveryTime ? Types.Timing.MicroSeconds(earliestDiscoveryTime) : undefined,
  };
}
