// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {calculateDocFirstByteTs} from './Common.js';
import {
  InsightCategory,
  InsightKeys,
  type InsightModel,
  type InsightSetContext,
  InsightWarning,
  type PartialInsightModel,
} from './types.js';

export const UIStrings = {
  /**
   * @description Title of an insight that provides details about the LCP metric, broken down by parts.
   */
  title: 'LCP breakdown',
  /**
   * @description Description of a DevTools insight that presents a breakdown for the LCP metric by subparts.
   * This is displayed after a user expands the section to see more. No character length limits.
   */
  description:
      'Each [subpart has specific improvement strategies](https://web.dev/articles/optimize-lcp#lcp-breakdown). Ideally, most of the LCP time should be spent on loading the resources, not within delays.',
  /**
   * @description Time to first byte title for the Largest Contentful Paint's subparts timespan breakdown.
   */
  timeToFirstByte: 'Time to first byte',
  /**
   * @description Resource load delay title for the Largest Contentful Paint subparts timespan breakdown.
   */
  resourceLoadDelay: 'Resource load delay',
  /**
   * @description Resource load duration title for the Largest Contentful Paint subparts timespan breakdown.
   */
  resourceLoadDuration: 'Resource load duration',
  /**
   * @description Element render delay title for the Largest Contentful Paint subparts timespan breakdown.
   */
  elementRenderDelay: 'Element render delay',
  /**
   * @description Label used for the subpart (section) of a larger duration.
   */
  subpart: 'Subpart',
  /**
   * @description Label used for the duration a single subpart (section) takes up of a larger duration.
   */
  duration: 'Duration',
  /**
   * @description Label used for the duration a single subpart (section) takes up of a larger duration. The value will be the 75th percentile of aggregate data. "Field" means that the data was collected from real users in the field as opposed to the developers local environment. "Field" is synonymous with "Real user data".
   */
  fieldDuration: 'Field p75',
  /**
   * @description Text status indicating that the the Largest Contentful Paint (LCP) metric timing was not found. "LCP" is an acronym and should not be translated.
   */
  noLcp: 'No LCP detected',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/trace/insights/LCPBreakdown.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// A TraceWindow plus its UIString.
export type Subpart = Types.Timing.TraceWindowMicro&{label: Common.UIString.LocalizedString};
interface LCPSubparts {
  /**
   * The time between when the user initiates loading the page until when
   * the browser receives the first byte of the html response.
   */
  ttfb: Subpart;
  /**
   * The time between ttfb and the LCP request request being started.
   * For a text LCP, this is undefined given no request is loaded.
   */
  loadDelay?: Subpart;
  /**
   * The time it takes to load the LCP request.
   */
  loadDuration?: Subpart;
  /**
   * The time between when the LCP request finishes loading and when
   * the LCP element is rendered.
   */
  renderDelay: Subpart;
}

export function isLCPBreakdown(model: InsightModel): model is LCPBreakdownInsightModel {
  return model.insightKey === 'LCPBreakdown';
}
export type LCPBreakdownInsightModel = InsightModel<typeof UIStrings, {
  lcpMs?: Types.Timing.Milli,
  lcpTs?: Types.Timing.Milli,
  lcpEvent?: Types.Events.LargestContentfulPaintCandidate,
  /** The network request for the LCP image, if there was one. */
  lcpRequest?: Types.Events.SyntheticNetworkRequest,
  subparts?: LCPSubparts,
}>;

function anyValuesNaN(...values: number[]): boolean {
  return values.some(v => Number.isNaN(v));
}
/**
 * Calculates the 2–4 subparts of an LCP as bounds.
 * Will return `null` if any required values were missing. We don't ever expect
 * them to be missing on newer traces, but old trace files may lack some of the
 * data we rely on, so we want to handle that case.
 */
function determineSubparts(
    nav: Types.Events.NavigationStart, docRequest: Types.Events.SyntheticNetworkRequest,
    lcpEvent: Types.Events.LargestContentfulPaintCandidate,
    lcpRequest: Types.Events.SyntheticNetworkRequest|undefined): LCPSubparts|null {
  const firstDocByteTs = calculateDocFirstByteTs(docRequest);
  if (firstDocByteTs === null) {
    return null;
  }

  const ttfb = Helpers.Timing.traceWindowFromMicroSeconds(nav.ts, firstDocByteTs) as Subpart;
  ttfb.label = i18nString(UIStrings.timeToFirstByte);

  let renderDelay = Helpers.Timing.traceWindowFromMicroSeconds(ttfb.max, lcpEvent.ts) as Subpart;
  renderDelay.label = i18nString(UIStrings.elementRenderDelay);

  // If the LCP is text, we don't have a request, so just 2 subparts.
  if (!lcpRequest) {
    /**
     * Text LCP. 2 subparts, thus 3 timestamps
     *
     *       |          ttfb           |             renderDelay              |
     *                                                                        ^ lcpEvent.ts
     *                                 ^ firstDocByteTs
     *       ^ navStartTs
     */
    if (anyValuesNaN(ttfb.range, renderDelay.range)) {
      return null;
    }
    return {ttfb, renderDelay};
  }

  /**
   * Image LCP. 4 subparts means 5 timestamps
   *
   *       |  ttfb   |    loadDelay     |     loadTime    |    renderDelay    |
   *                                                                          ^ lcpEvent.ts
   *                                                      ^ lcpReqEndTs
   *                                    ^ lcpStartTs
   *                 ^ ttfbTs
   *       ^ navStartTs
   */
  const lcpStartTs = lcpRequest.ts;
  const lcpReqEndTs = lcpRequest.args.data.syntheticData.finishTime;

  const loadDelay = Helpers.Timing.traceWindowFromMicroSeconds(ttfb.max, lcpStartTs) as Subpart;
  const loadDuration = Helpers.Timing.traceWindowFromMicroSeconds(lcpStartTs, lcpReqEndTs) as Subpart;
  renderDelay = Helpers.Timing.traceWindowFromMicroSeconds(lcpReqEndTs, lcpEvent.ts) as Subpart;
  loadDelay.label = i18nString(UIStrings.resourceLoadDelay);
  loadDuration.label = i18nString(UIStrings.resourceLoadDuration);
  renderDelay.label = i18nString(UIStrings.elementRenderDelay);
  if (anyValuesNaN(ttfb.range, loadDelay.range, loadDuration.range, renderDelay.range)) {
    return null;
  }

  return {
    ttfb,
    loadDelay,
    loadDuration,
    renderDelay,
  };
}

function finalize(partialModel: PartialInsightModel<LCPBreakdownInsightModel>): LCPBreakdownInsightModel {
  const relatedEvents = [];
  if (partialModel.lcpEvent) {
    relatedEvents.push(partialModel.lcpEvent);
  }
  if (partialModel.lcpRequest) {
    relatedEvents.push(partialModel.lcpRequest);
  }
  return {
    insightKey: InsightKeys.LCP_BREAKDOWN,
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.LCP,
    state: partialModel.lcpEvent || partialModel.lcpRequest ? 'informative' : 'pass',
    ...partialModel,
    relatedEvents,
  };
}

export function generateInsight(
    parsedTrace: Handlers.Types.ParsedTrace, context: InsightSetContext): LCPBreakdownInsightModel {
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

  // This helps calculate the subparts.
  const lcpMs = Helpers.Timing.microToMilli(metricScore.timing);
  // This helps position things on the timeline's UI accurately for a trace.
  const lcpTs = metricScore.event?.ts ? Helpers.Timing.microToMilli(metricScore.event?.ts) : undefined;
  const lcpRequest = parsedTrace.LargestImagePaint.lcpRequestByNavigationId.get(context.navigationId);

  const docRequest = networkRequests.byId.get(context.navigationId);
  if (!docRequest) {
    return finalize({lcpMs, lcpTs, lcpEvent, lcpRequest, warnings: [InsightWarning.NO_DOCUMENT_REQUEST]});
  }

  return finalize({
    lcpMs,
    lcpTs,
    lcpEvent,
    lcpRequest,
    subparts: determineSubparts(context.navigation, docRequest, lcpEvent, lcpRequest) ?? undefined,
  });
}

export function createOverlays(model: LCPBreakdownInsightModel): Types.Overlays.Overlay[] {
  if (!model.subparts || !model.lcpTs) {
    return [];
  }

  const overlays: Types.Overlays.Overlay[] = [
    {
      type: 'TIMESPAN_BREAKDOWN',
      sections: Object.values(model.subparts)
                    .map((subpart: Subpart) => ({bounds: subpart, label: subpart.label, showDuration: true})),
    },
  ];
  if (model.lcpRequest) {
    overlays.push({type: 'ENTRY_OUTLINE', entry: model.lcpRequest, outlineReason: 'INFO'});
  }

  return overlays;
}
