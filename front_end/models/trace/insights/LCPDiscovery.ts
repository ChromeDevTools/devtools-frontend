// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {type InsightModel, type InsightSetContext, InsightWarning, type RequiredData} from './types.js';

const UIStrings = {
  /**
   *@description Title of an insight that provides details about the LCP metric, and the network requests necessary to load it. Details how the LCP request was discoverable - in other words, the path necessary to load it (ex: network requests, JavaScript)
   */
  title: 'LCP request discovery',
  /**
   *@description Description of an insight that provides details about the LCP metric, and the network requests necessary to load it.
   */
  description:
      'Optimize LCP by making the LCP image [discoverable](https://web.dev/articles/optimize-lcp#1_eliminate_resource_load_delay) from the HTML immediately, and [avoiding lazy-loading](https://web.dev/articles/lcp-lazy-loading)',
};

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/LCPDiscovery.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function deps(): ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint', 'Meta'] {
  return ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint', 'Meta'];
}

export type LCPDiscoveryInsightModel = InsightModel<{
  lcpEvent?: Types.Events.LargestContentfulPaintCandidate,
  shouldRemoveLazyLoading?: boolean,
  shouldIncreasePriorityHint?: boolean,
  shouldPreloadImage?: boolean,
  /** The network request for the LCP image, if there was one. */
  lcpRequest?: Types.Events.SyntheticNetworkRequest,
  earliestDiscoveryTimeTs?: Types.Timing.MicroSeconds,
}>;

function finalize(partialModel: Omit<LCPDiscoveryInsightModel, 'title'|'description'>): LCPDiscoveryInsightModel {
  const relatedEvents = partialModel.lcpEvent && partialModel.lcpRequest ?
      // TODO: add entire request initiator chain?
      [partialModel.lcpEvent, partialModel.lcpRequest] :
      [];
  return {
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    ...partialModel,
    relatedEvents,
  };
}

export function generateInsight(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): LCPDiscoveryInsightModel {
  if (!context.navigation) {
    return finalize({});
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
    return finalize({warnings: [InsightWarning.NO_LCP]});
  }

  const docRequest = networkRequests.byTime.find(req => req.args.data.requestId === context.navigationId);
  if (!docRequest) {
    return finalize({lcpEvent, warnings: [InsightWarning.NO_DOCUMENT_REQUEST]});
  }

  const lcpRequest = parsedTrace.LargestImagePaint.lcpRequestByNavigation.get(context.navigation);
  if (!lcpRequest) {
    return finalize({lcpEvent});
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

  return finalize({
    lcpEvent,
    shouldRemoveLazyLoading: imageLoadingAttr === 'lazy',
    shouldIncreasePriorityHint: imageFetchPriorityHint !== 'high',
    shouldPreloadImage: !imgPreloadedOrFoundInHTML,
    lcpRequest,
    earliestDiscoveryTimeTs: earliestDiscoveryTime ? Types.Timing.MicroSeconds(earliestDiscoveryTime) : undefined,
  });
}
