// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {
  type Checklist,
  InsightCategory,
  type InsightModel,
  type InsightSetContext,
  InsightWarning,
  type PartialInsightModel,
  type RequiredData,
} from './types.js';

export const UIStrings = {
  /**
   *@description Title of an insight that provides details about the LCP metric, and the network requests necessary to load it. Details how the LCP request was discoverable - in other words, the path necessary to load it (ex: network requests, JavaScript)
   */
  title: 'LCP request discovery',
  /**
   *@description Description of an insight that provides details about the LCP metric, and the network requests necessary to load it.
   */
  description:
      'Optimize LCP by making the LCP image [discoverable](https://web.dev/articles/optimize-lcp#1_eliminate_resource_load_delay) from the HTML immediately, and [avoiding lazy-loading](https://web.dev/articles/lcp-lazy-loading)',
  /**
   * @description Text to tell the user how long after the earliest discovery time their LCP element loaded.
   * @example {401ms} PH1
   */
  lcpLoadDelay: 'LCP image loaded {PH1} after earliest start point.',
  /**
   * @description Text to tell the user that a fetchpriority property value of "high" is applied to the LCP request.
   */
  fetchPriorityApplied: 'fetchpriority=high applied',
  /**
   * @description Text to tell the user that a fetchpriority property value of "high" should be applied to the LCP request.
   */
  fetchPriorityShouldBeApplied: 'fetchpriority=high should be applied',
  /**
   * @description Text to tell the user that the LCP request is discoverable in the initial document.
   */
  requestDiscoverable: 'Request is discoverable in initial document',
  /**
   * @description Text to tell the user that the LCP request does not have the lazy load property applied.
   */
  lazyLoadNotApplied: 'lazy load not applied',
  /**
   * @description Text status indicating that the the Largest Contentful Paint (LCP) metric timing was not found. "LCP" is an acronym and should not be translated.
   */
  noLcp: 'No LCP detected',
  /**
   * @description Text status indicating that the Largest Contentful Paint (LCP) metric was text rather than an image. "LCP" is an acronym and should not be translated.
   */
  noLcpResource: 'No LCP resource detected because the LCP is not an image',
};

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/LCPDiscovery.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function deps(): ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint', 'Meta'] {
  return ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint', 'Meta'];
}

export type LCPDiscoveryInsightModel = InsightModel<typeof UIStrings, {
  lcpEvent?: Types.Events.LargestContentfulPaintCandidate,
  /** The network request for the LCP image, if there was one. */
  lcpRequest?: Types.Events.SyntheticNetworkRequest,
  earliestDiscoveryTimeTs?: Types.Timing.Micro,
  checklist?: Checklist<'priorityHinted'|'requestDiscoverable'|'eagerlyLoaded'>,
}>;

function finalize(partialModel: PartialInsightModel<LCPDiscoveryInsightModel>): LCPDiscoveryInsightModel {
  const relatedEvents = partialModel.lcpEvent && partialModel.lcpRequest ?
      // TODO: add entire request initiator chain?
      [partialModel.lcpEvent, partialModel.lcpRequest] :
      [];
  return {
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.LCP,
    shouldShow: Boolean(
        partialModel.lcpRequest && partialModel.checklist &&
        (!partialModel.checklist.eagerlyLoaded.value || !partialModel.checklist.requestDiscoverable.value ||
         !partialModel.checklist.priorityHinted.value)),
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
      Helpers.Timing.secondsToMicro(docRequest.args.data.timing.requestTime) +
          Helpers.Timing.milliToMicro(docRequest.args.data.timing.receiveHeadersStart) :
      undefined;

  const priorityHintFound = imageFetchPriorityHint === 'high';

  return finalize({
    lcpEvent,
    lcpRequest,
    earliestDiscoveryTimeTs: earliestDiscoveryTime ? Types.Timing.Micro(earliestDiscoveryTime) : undefined,
    checklist: {
      priorityHinted: {
        label: priorityHintFound ? i18nString(UIStrings.fetchPriorityApplied) :
                                   i18nString(UIStrings.fetchPriorityShouldBeApplied),
        value: priorityHintFound
      },
      requestDiscoverable: {label: i18nString(UIStrings.requestDiscoverable), value: imgPreloadedOrFoundInHTML},
      eagerlyLoaded: {label: i18nString(UIStrings.lazyLoadNotApplied), value: imageLoadingAttr !== 'lazy'},
    },
  });
}
