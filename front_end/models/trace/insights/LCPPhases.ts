// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {
  InsightCategory,
  type InsightModel,
  type InsightSetContext,
  InsightWarning,
  type PartialInsightModel,
  type RequiredData,
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
   *@description Label used for the percentage a single phase/component/stage/section takes up of a larger duration.
   */
  percentLCP: '% of LCP',
  /**
   * @description Text status indicating that the the Largest Contentful Paint (LCP) metric timing was not found. "LCP" is an acronym and should not be translated.
   */
  noLcp: 'No LCP detected',
};
const str_ = i18n.i18n.registerUIStrings('models/trace/insights/LCPPhases.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function deps(): ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint', 'Meta'] {
  return ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint', 'Meta'];
}

interface LCPPhases {
  /**
   * The time between when the user initiates loading the page until when
   * the browser receives the first byte of the html response.
   */
  ttfb: Types.Timing.Milli;
  /**
   * The time between ttfb and the LCP request request being started.
   * For a text LCP, this is undefined given no request is loaded.
   */
  loadDelay?: Types.Timing.Milli;
  /**
   * The time it takes to load the LCP request.
   */
  loadTime?: Types.Timing.Milli;
  /**
   * The time between when the LCP request finishes loading and when
   * the LCP element is rendered.
   */
  renderDelay: Types.Timing.Milli;
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
 * Calculates the 4 phases of an LCP and the timings of each.
 * Will return `null` if any required values were missing. We don't ever expect
 * them to be missing on newer traces, but old trace files may lack some of the
 * data we rely on, so we want to handle that case.
 */
function breakdownPhases(
    nav: Types.Events.NavigationStart, docRequest: Types.Events.SyntheticNetworkRequest, lcpMs: Types.Timing.Milli,
    lcpRequest: Types.Events.SyntheticNetworkRequest|undefined): LCPPhases|null {
  const docReqTiming = docRequest.args.data.timing;
  if (!docReqTiming) {
    throw new Error('no timing for document request');
  }
  const firstDocByteTs = Helpers.Timing.secondsToMicro(docReqTiming.requestTime) +
      Helpers.Timing.milliToMicro(docReqTiming.receiveHeadersStart);

  const firstDocByteTiming = Types.Timing.Micro(firstDocByteTs - nav.ts);
  const ttfb = Helpers.Timing.microToMilli(firstDocByteTiming);
  let renderDelay = Types.Timing.Milli(lcpMs - ttfb);

  if (!lcpRequest) {
    if (anyValuesNaN(ttfb, renderDelay)) {
      return null;
    }
    return {ttfb, renderDelay};
  }

  const lcpStartTs = Types.Timing.Micro(lcpRequest.ts - nav.ts);
  const requestStart = Helpers.Timing.microToMilli(lcpStartTs);

  const lcpReqEndTs = Types.Timing.Micro(lcpRequest.args.data.syntheticData.finishTime - nav.ts);
  const requestEnd = Helpers.Timing.microToMilli(lcpReqEndTs);

  const loadDelay = Types.Timing.Milli(requestStart - ttfb);
  const loadTime = Types.Timing.Milli(requestEnd - requestStart);
  renderDelay = Types.Timing.Milli(lcpMs - requestEnd);
  if (anyValuesNaN(ttfb, loadDelay, loadTime, renderDelay)) {
    return null;
  }

  return {
    ttfb,
    loadDelay,
    loadTime,
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
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.LCP,
    // TODO: should move the component's "getPhaseData" to model.
    shouldShow: Boolean(partialModel.phases) && (partialModel.lcpMs ?? 0) > 0,
    ...partialModel,
    relatedEvents,
  };
}

export function generateInsight(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): LCPPhasesInsightModel {
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
  const lcpRequest = parsedTrace.LargestImagePaint.lcpRequestByNavigation.get(context.navigation);

  const docRequest = networkRequests.byTime.find(req => req.args.data.requestId === context.navigationId);
  if (!docRequest) {
    return finalize({lcpMs, lcpTs, lcpEvent, lcpRequest, warnings: [InsightWarning.NO_DOCUMENT_REQUEST]});
  }

  if (!lcpRequest) {
    return finalize({
      lcpMs,
      lcpTs,
      lcpEvent,
      lcpRequest,
      phases: breakdownPhases(context.navigation, docRequest, lcpMs, lcpRequest) ?? undefined,
    });
  }

  return finalize({
    lcpMs,
    lcpTs,
    lcpEvent,
    lcpRequest,
    phases: breakdownPhases(context.navigation, docRequest, lcpMs, lcpRequest) ?? undefined,
  });
}
