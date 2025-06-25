// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

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
   *@description Title of an insight that provides details about the LCP metric, broken down by phases / parts.
   */
  title: 'LCP by phase',
  /**
   * @description Description of a DevTools insight that presents a breakdown for the LCP metric by phases.
   * This is displayed after a user expands the section to see more. No character length limits.
   */
  description:
      'Each [phase has specific improvement strategies](https://web.dev/articles/optimize-lcp#lcp-breakdown). Ideally, most of the LCP time should be spent on loading the resources, not within delays.',
  /**
   *@description Time to first byte title for the Largest Contentful Paint's phases timespan breakdown.
   */
  timeToFirstByte: 'Time to first byte',
  /**
   *@description Resource load delay title for the Largest Contentful Paint phases timespan breakdown.
   */
  resourceLoadDelay: 'Resource load delay',
  /**
   *@description Resource load duration title for the Largest Contentful Paint phases timespan breakdown.
   */
  resourceLoadDuration: 'Resource load duration',
  /**
   *@description Element render delay title for the Largest Contentful Paint phases timespan breakdown.
   */
  elementRenderDelay: 'Element render delay',
  /**
   *@description Label used for the phase/component/stage/section of a larger duration.
   */
  phase: 'Phase',
  /**
   * @description Label used for the duration a single phase/component/stage/section takes up of a larger duration.
   */
  duration: 'Duration',
  /**
   * @description Label used for the duration a single phase/component/stage/section takes up of a larger duration. The value will be the 75th percentile of aggregate data. "Field" means that the data was collected from real users in the field as opposed to the developers local environment. "Field" is synonymous with "Real user data".
   */
  fieldDuration: 'Field p75',
  /**
   * @description Text status indicating that the the Largest Contentful Paint (LCP) metric timing was not found. "LCP" is an acronym and should not be translated.
   */
  noLcp: 'No LCP detected',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/trace/insights/LCPPhases.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// A TraceWindow plus its UIString.
export type Phase = Types.Timing.TraceWindowMicro&{label: Common.UIString.LocalizedString};
interface LCPPhases {
  /**
   * The time between when the user initiates loading the page until when
   * the browser receives the first byte of the html response.
   */
  ttfb: Phase;
  /**
   * The time between ttfb and the LCP request request being started.
   * For a text LCP, this is undefined given no request is loaded.
   */
  loadDelay?: Phase;
  /**
   * The time it takes to load the LCP request.
   */
  loadDuration?: Phase;
  /**
   * The time between when the LCP request finishes loading and when
   * the LCP element is rendered.
   */
  renderDelay: Phase;
}

export function isLCPPhases(model: InsightModel): model is LCPPhasesInsightModel {
  return model.insightKey === 'LCPPhases';
}
export type LCPPhasesInsightModel = InsightModel<typeof UIStrings, {
  lcpMs?: Types.Timing.Milli,
  lcpTs?: Types.Timing.Milli,
  lcpEvent?: Types.Events.LargestContentfulPaintCandidate,
  /** The network request for the LCP image, if there was one. */
  lcpRequest?: Types.Events.SyntheticNetworkRequest,
  phases?: LCPPhases,
}>;

function anyValuesNaN(...values: number[]): boolean {
  return values.some(v => Number.isNaN(v));
}
/**
 * Calculates the 4 phases of an LCP as bounds.
 * Will return `null` if any required values were missing. We don't ever expect
 * them to be missing on newer traces, but old trace files may lack some of the
 * data we rely on, so we want to handle that case.
 */
function phaseTimings(
    nav: Types.Events.NavigationStart, docRequest: Types.Events.SyntheticNetworkRequest,
    lcpEvent: Types.Events.LargestContentfulPaintCandidate,
    lcpRequest: Types.Events.SyntheticNetworkRequest|undefined): LCPPhases|null {
  const docReqTiming = docRequest.args.data.timing;
  if (!docReqTiming) {
    throw new Error('no timing for document request');
  }
  const firstDocByteTs = Types.Timing.Micro(
      Helpers.Timing.secondsToMicro(docReqTiming.requestTime) +
      Helpers.Timing.milliToMicro(docReqTiming.receiveHeadersStart));

  const ttfb = Helpers.Timing.traceWindowFromMicroSeconds(nav.ts, firstDocByteTs) as Phase;
  ttfb.label = i18nString(UIStrings.timeToFirstByte);

  let renderDelay = Helpers.Timing.traceWindowFromMicroSeconds(ttfb.max, lcpEvent.ts) as Phase;
  renderDelay.label = i18nString(UIStrings.elementRenderDelay);

  // If the LCP is text, we don't have a request, so just 2 phases.
  if (!lcpRequest) {
    /** Text LCP. 2 phases, thus 3 timestamps
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

  /** Image LCP. 4 phases means 5 timestamps
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

  const loadDelay = Helpers.Timing.traceWindowFromMicroSeconds(ttfb.max, lcpStartTs) as Phase;
  const loadDuration = Helpers.Timing.traceWindowFromMicroSeconds(lcpStartTs, lcpReqEndTs) as Phase;
  renderDelay = Helpers.Timing.traceWindowFromMicroSeconds(lcpReqEndTs, lcpEvent.ts) as Phase;
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

function finalize(partialModel: PartialInsightModel<LCPPhasesInsightModel>): LCPPhasesInsightModel {
  const relatedEvents = [];
  if (partialModel.lcpEvent) {
    relatedEvents.push(partialModel.lcpEvent);
  }
  if (partialModel.lcpRequest) {
    relatedEvents.push(partialModel.lcpRequest);
  }
  return {
    insightKey: InsightKeys.LCP_PHASES,
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
    parsedTrace: Handlers.Types.ParsedTrace, context: InsightSetContext): LCPPhasesInsightModel {
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

  // This helps calculate the phases.
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
    phases: phaseTimings(context.navigation, docRequest, lcpEvent, lcpRequest) ?? undefined,
  });
}
