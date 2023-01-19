// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Helpers from '../helpers/helpers.js';

import {KnownEventName, type TraceEventHandlerName, type HandlerData, type Handlers} from './types.js';

import * as Types from '../types/types.js';

import {data as metaHandlerData} from './MetaHandler.js';
import {data as rendererHandlerData} from './RendererHandler.js';

/**
 * This represents the metric scores for all navigations, for all frames in a trace.
 * Given a frame id, the map points to another map from navigation id to metric scores.
 * The metric scores include the event related to the metric as well as the data regarding
 * the score itself.
 */
const metricScoresByFrameId = new Map<string, Map<string, Map<MetricName, MetricScore>>>();

export function reset(): void {
  metricScoresByFrameId.clear();
  pageLoadEventsArray = [];
  selectedLCPCandidateEvents.clear();
}

let pageLoadEventsArray: Types.TraceEvents.PageLoadEvent[] = [];

// Once we've found the LCP events in the trace we want to fetch their DOM Node
// from the backend. We could do this by parsing through our Map of frame =>
// navigation => metric, but it's easier to keep a set of LCP events. As we
// parse the trace, any time we store an LCP candidate as the potential LCP
// event, we store the event here. If we later find a new candidate in the
// trace, we store that and delete the prior event. When we've parsed the
// entire trace this set will contain all the LCP events that were used - e.g.
// the candidates that were the actual LCP events.
const selectedLCPCandidateEvents = new Set<Types.TraceEvents.TraceEventLargestContentfulPaintCandidate>();

function eventIsPageLoadEvent(event: Types.TraceEvents.TraceEventData): event is Types.TraceEvents.PageLoadEvent {
  return Types.TraceEvents.isTraceEventFirstContentfulPaint(event) ||
      Types.TraceEvents.isTraceEventMarkDOMContent(event) || Types.TraceEvents.isTraceEventInteractiveTime(event) ||
      Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(event);
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (!eventIsPageLoadEvent(event)) {
    return;
  }
  pageLoadEventsArray.push(event);
}

function storePageLoadMetricAgainstNavigationId(
    navigation: Types.TraceEvents.TraceEventNavigationStart, event: Types.TraceEvents.PageLoadEvent): void {
  const navigationId = navigation.args.data?.navigationId;
  if (!navigationId) {
    throw new Error('Navigation event unexpectedly had no navigation ID.');
  }
  const frameId = getFrameIdForPageLoadEvent(event);
  const {rendererProcessesByFrame} = metaHandlerData();
  const processData = rendererProcessesByFrame.get(frameId)?.get(event.pid);
  if (!processData) {
    throw new Error('No processes found for page load event.');
  }

  // We compare the timestamp of the event to determine if it happened during the
  // time window in which its process was considered active.
  const eventBelongsToProcess = event.ts >= processData.window.min && event.ts <= processData.window.max;

  if (!eventBelongsToProcess) {
    // If the event occurred outside its process' active time window we ignore it.
    return;
  }

  if (Types.TraceEvents.isTraceEventFirstContentfulPaint(event)) {
    const fcpTime = Types.Timing.MicroSeconds(event.ts - navigation.ts);
    const score = Helpers.Timing.formatMicrosecondsTime(fcpTime, {
      format: Types.Timing.TimeUnit.SECONDS,
      maximumFractionDigits: 2,
    });
    const classification = scoreClassificationForFirstContentfulPaint(fcpTime);
    const metricScore = {event, score, metricName: MetricName.FCP, classification, navigation};
    storeMetricScore(frameId, navigationId, metricScore);
    return;
  }

  if (Types.TraceEvents.isTraceEventMarkDOMContent(event)) {
    const dclTime = Types.Timing.MicroSeconds(event.ts - navigation.ts);
    const score = Helpers.Timing.formatMicrosecondsTime(dclTime, {
      format: Types.Timing.TimeUnit.SECONDS,
      maximumFractionDigits: 2,
    });
    const metricScore = {
      event,
      score,
      metricName: MetricName.DCL,
      classification: scoreClassificationForDOMContentLoaded(dclTime),
      navigation,
    };
    storeMetricScore(frameId, navigationId, metricScore);
    return;
  }

  if (Types.TraceEvents.isTraceEventInteractiveTime(event)) {
    const ttiValue = Types.Timing.MicroSeconds(event.ts - navigation.ts);
    const ttiScore = Helpers.Timing.formatMicrosecondsTime(ttiValue, {
      format: Types.Timing.TimeUnit.SECONDS,
      maximumFractionDigits: 2,
    });
    const tti = {
      event,
      score: ttiScore,
      metricName: MetricName.TTI,
      classification: scoreClassificationForTimeToInteractive(ttiValue),
      navigation,
    };
    storeMetricScore(frameId, navigationId, tti);

    const tbtValue =
        Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(event.args.args.total_blocking_time_ms));
    const tbtScore = Helpers.Timing.formatMicrosecondsTime(tbtValue, {
      format: Types.Timing.TimeUnit.MILLISECONDS,
      maximumFractionDigits: 2,
    });
    const tbt = {
      event,
      score: tbtScore,
      metricName: MetricName.TBT,
      classification: scoreClassificationForTotalBlockingTime(tbtValue),
      navigation,
    };
    storeMetricScore(frameId, navigationId, tbt);
    return;
  }

  if (Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(event)) {
    const candidateIndex = event.args.data?.candidateIndex;
    if (!candidateIndex) {
      throw new Error('Largest Contenful Paint unexpectedly had no candidateIndex.');
    }
    const lcpTime = Types.Timing.MicroSeconds(event.ts - navigation.ts);
    const lcpScore = Helpers.Timing.formatMicrosecondsTime(lcpTime, {
      format: Types.Timing.TimeUnit.SECONDS,
      maximumFractionDigits: 2,
    });
    const lcp = {
      event,
      score: lcpScore,
      metricName: MetricName.LCP,
      classification: scoreClassificationForLargestContentfulPaint(lcpTime),
      navigation,
    };
    const metricsByNavigation = Platform.MapUtilities.getWithDefault(metricScoresByFrameId, frameId, () => new Map());
    const metrics = Platform.MapUtilities.getWithDefault(metricsByNavigation, navigationId, () => new Map());
    const lastLCPCandidate = metrics.get(MetricName.LCP);
    if (lastLCPCandidate === undefined) {
      selectedLCPCandidateEvents.add(lcp.event);
      storeMetricScore(frameId, navigationId, lcp);
      return;
    }
    const lastLCPCandidateEvent = lastLCPCandidate.event;

    if (!Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(lastLCPCandidateEvent)) {
      return;
    }
    const lastCandidateIndex = lastLCPCandidateEvent.args.data?.candidateIndex;
    if (!lastCandidateIndex) {
      // lastCandidateIndex cannot be undefined because don't store candidates with
      // with an undefined candidateIndex value. This check is only to make TypeScript
      // treat the field as not undefined below.
      return;
    }
    if (lastCandidateIndex < candidateIndex) {
      selectedLCPCandidateEvents.delete(lastLCPCandidateEvent);
      selectedLCPCandidateEvents.add(lcp.event);
      storeMetricScore(frameId, navigationId, lcp);
    }
    return;
  }
  if (Types.TraceEvents.isTraceEventLayoutShift(event)) {
    return;
  }
  return Platform.assertNever(event, `Unexpected event type: ${event}`);
}

function storeMetricScore(frameId: string, navigationId: string, metricScore: MetricScore): void {
  const metricsByNavigation = Platform.MapUtilities.getWithDefault(metricScoresByFrameId, frameId, () => new Map());
  const metrics = Platform.MapUtilities.getWithDefault(metricsByNavigation, navigationId, () => new Map());
  // If an entry with that metric name is present, delete it so that the new entry that
  // will replace it is added at the end of the map. This way we guarantee the map entries
  // are ordered in ASC manner by timestamp.
  metrics.delete(metricScore.metricName);
  metrics.set(metricScore.metricName, metricScore);
}

function getFrameIdForPageLoadEvent(event: Types.TraceEvents.PageLoadEvent): string {
  if (Types.TraceEvents.isTraceEventFirstContentfulPaint(event) ||
      Types.TraceEvents.isTraceEventInteractiveTime(event) ||
      Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(event) ||
      Types.TraceEvents.isTraceEventLayoutShift(event)) {
    return event.args.frame;
  }
  if (Types.TraceEvents.isTraceEventMarkDOMContent(event)) {
    const frameId = event.args.data?.frame;
    if (!frameId) {
      throw new Error('MarkDOMContent unexpectedly had no frame ID.');
    }
    return frameId;
  }
  Platform.assertNever(event, `Unexpected event type: ${event}`);
}

function getNavigationForPageLoadEvent(event: Types.TraceEvents.PageLoadEvent):
    Types.TraceEvents.TraceEventNavigationStart|null {
  if (Types.TraceEvents.isTraceEventFirstContentfulPaint(event) ||
      Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(event)) {
    const navigationId = event.args.data?.navigationId;
    if (!navigationId) {
      throw new Error('Trace event unexpectedly had no navigation ID.');
    }
    const {navigationsByNavigationId} = metaHandlerData();
    const navigation = navigationsByNavigationId.get(navigationId);

    if (!navigation) {
      // This event's navigation has been filtered out by the meta handler as a noise event.
      return null;
    }
    return navigation;
  }

  if (Types.TraceEvents.isTraceEventMarkDOMContent(event) || Types.TraceEvents.isTraceEventInteractiveTime(event) ||
      Types.TraceEvents.isTraceEventLayoutShift(event)) {
    const frameId = getFrameIdForPageLoadEvent(event);
    const {navigationsByFrameId} = metaHandlerData();
    return Helpers.Trace.getNavigationForTraceEvent(event, frameId, navigationsByFrameId);
  }

  return Platform.assertNever(event, `Unexpected event type: ${event}`);
}

/**
 * This methods calculates the Total Blocking Time for navigations for which
 * an InteractiveTime event wasn't recorded, that is, navigations without a
 * TBT reported by the backend. This could happen for example if the user
 * stops the recording before the page has settled. Although TBT is officially
 * the sum of the blocking portion of all long tasks between FCP and TTI, we
 * can still report the blocking time between FCP and the instant the recording
 * was stopped, in case TTI wasn't reached.
 */
function estimateTotalBlockingTimes(): void {
  const {processes} = rendererHandlerData();
  const LONG_TASK_THRESHOLD = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(50));
  for (const [frameId, metricsByNavigation] of metricScoresByFrameId) {
    for (const [navigationId, metrics] of metricsByNavigation) {
      const navigationTBT = metrics.get(MetricName.TBT);
      const navigationFCP = metrics.get(MetricName.FCP);
      if (navigationTBT || !navigationFCP) {
        // Either a TBT record was reported for this navigation so we don't
        // need to estimate its value, or FCP wasn't reached so we can't
        // estimate it.
        continue;
      }
      if (!navigationFCP.event) {
        continue;
      }

      // Get Main Thread information
      const renderer = processes.get(navigationFCP.event.pid);
      if (!renderer) {
        // This can happen if the navigation was on a process that had no
        // origin, or an origin we discard, such as about:blank. In this case
        // we can discard the navigation as it's not relevant and we don't need
        // to use it to calculate TBT.
        continue;
      }
      const mainThread = [...renderer.threads.values()].find(thread => thread.name === 'CrRendererMain');
      const mainThreadTree = mainThread?.tree;
      if (!mainThread || !mainThreadTree) {
        throw new Error('Main thread not found.');
      }
      const mainThreadEvents = mainThread.events;
      const mainThreadNodes = mainThreadTree.nodes;
      const fcpTs = navigationFCP.event.ts;
      // Calulate TBT from Main Thread tasks.
      let tbt = 0;
      for (const rootId of mainThreadTree.roots) {
        const node = mainThreadNodes.get(rootId);
        if (node === undefined) {
          throw new Error(`Node not found for id: ${rootId}`);
        }
        if (mainThreadEvents[node.eventIndex] === undefined) {
          throw new Error(`Event not found for index: ${node.eventIndex}`);
        }
        const task = mainThreadEvents[node.eventIndex];
        if (task.name !== KnownEventName.RunTask || Types.TraceEvents.isTraceEventInstant(task)) {
          continue;
        }

        // Discard event if it ended before FCP.
        if (task.ts + task.dur < fcpTs) {
          continue;
        }

        // Following Lighthouse guidance, get the portion of the task occured after FCP
        // before calculating its blocking portion (because tasks before FCP are
        // unimportant, we consider only the blocking time after FCP).
        const timeAfterFCP = task.ts < fcpTs ? fcpTs - task.ts : 0;
        const clippedTaskDuration = task.dur - timeAfterFCP;
        tbt += clippedTaskDuration > LONG_TASK_THRESHOLD ? clippedTaskDuration - LONG_TASK_THRESHOLD : 0;
      }

      const tbtValue = Types.Timing.MicroSeconds(tbt);
      const tbtScore = Helpers.Timing.formatMicrosecondsTime(tbtValue, {
        format: Types.Timing.TimeUnit.MILLISECONDS,
        maximumFractionDigits: 2,
      });
      const tbtMetric = {
        score: tbtScore,
        estimated: true,
        metricName: MetricName.TBT,
        classification: scoreClassificationForTotalBlockingTime(tbtValue),
        navigation: navigationFCP.navigation,
      };
      storeMetricScore(frameId, navigationId, tbtMetric);
    }
  }
}

/*
 * When we first load a new trace, rather than position the playhead at time 0,
* we want to position it such that the thumbnail likely shows something rather
* than a blank white page, and so that it's positioned somewhere that's useful
* for the user.  This function takes the model data, and returns either the
* timestamp of the first FCP event, or null if it couldn't find one.
 */
export function getFirstFCPTimestampFromModelData(model: HandlerData<Handlers>): Types.Timing.MicroSeconds|null {
  const mainFrameID = model.Meta.mainFrameId;
  const metricsForMainFrameByNavigationID = model.PageLoadMetrics.metricScoresByFrameId.get(mainFrameID);
  if (!metricsForMainFrameByNavigationID) {
    return null;
  }

  // Now find the first FCP event by timestamp. Events may not have the raw
  // data including timestamp, and if so we skip that event.
  let firstFCPEventInTimeline: Types.Timing.MicroSeconds|null = null;
  for (const metrics of metricsForMainFrameByNavigationID.values()) {
    const fcpMetric = metrics.get(MetricName.FCP);
    const fcpTimestamp = fcpMetric?.event?.ts;
    if (fcpTimestamp) {
      if (!firstFCPEventInTimeline) {
        firstFCPEventInTimeline = fcpTimestamp;
      } else if (fcpTimestamp < firstFCPEventInTimeline) {
        firstFCPEventInTimeline = fcpTimestamp;
      }
    }
  }
  return firstFCPEventInTimeline;
}

/**
 * Classifications sourced from
 * https://web.dev/fcp/
 */

export function scoreClassificationForFirstContentfulPaint(fcpScoreInMicroseconds: Types.Timing.MicroSeconds):
    ScoreClassification {
  const FCP_GOOD_TIMING = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(1.8));
  const FCP_MEDIUM_TIMING = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(3.0));
  let scoreClassification = ScoreClassification.BAD;
  if (fcpScoreInMicroseconds <= FCP_MEDIUM_TIMING) {
    scoreClassification = ScoreClassification.OK;
  }
  if (fcpScoreInMicroseconds <= FCP_GOOD_TIMING) {
    scoreClassification = ScoreClassification.GOOD;
  }
  return scoreClassification;
}

/**
 * Classifications sourced from
 * https://web.dev/interactive/#how-lighthouse-determines-your-tti-score
 */

export function scoreClassificationForTimeToInteractive(ttiTimeInMicroseconds: Types.Timing.MicroSeconds):
    ScoreClassification {
  const TTI_GOOD_TIMING = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(3.8));
  const TTI_MEDIUM_TIMING = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(7.3));
  let scoreClassification = ScoreClassification.BAD;
  if (ttiTimeInMicroseconds <= TTI_MEDIUM_TIMING) {
    scoreClassification = ScoreClassification.OK;
  }
  if (ttiTimeInMicroseconds <= TTI_GOOD_TIMING) {
    scoreClassification = ScoreClassification.GOOD;
  }
  return scoreClassification;
}

/**
 * Classifications sourced from
 * https://web.dev/lcp/#what-is-lcp
 */

export function scoreClassificationForLargestContentfulPaint(lcpTimeInMicroseconds: Types.Timing.MicroSeconds):
    ScoreClassification {
  const LCP_GOOD_TIMING = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(2.5));
  const LCP_MEDIUM_TIMING = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(4));
  let scoreClassification = ScoreClassification.BAD;
  if (lcpTimeInMicroseconds <= LCP_MEDIUM_TIMING) {
    scoreClassification = ScoreClassification.OK;
  }
  if (lcpTimeInMicroseconds <= LCP_GOOD_TIMING) {
    scoreClassification = ScoreClassification.GOOD;
  }
  return scoreClassification;
}

/**
 * DCL does not have a classification.
 */
export function scoreClassificationForDOMContentLoaded(_dclTimeInMicroseconds: Types.Timing.MicroSeconds):
    ScoreClassification {
  return ScoreClassification.UNCLASSIFIED;
}

/**
 * Classifications sourced from
 * https://web.dev/lighthouse-total-blocking-#time/
 */

export function scoreClassificationForTotalBlockingTime(tbtTimeInMicroseconds: Types.Timing.MicroSeconds):
    ScoreClassification {
  const TBT_GOOD_TIMING = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(200));
  const TBT_MEDIUM_TIMING = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(600));
  let scoreClassification = ScoreClassification.BAD;
  if (tbtTimeInMicroseconds <= TBT_MEDIUM_TIMING) {
    scoreClassification = ScoreClassification.OK;
  }
  if (tbtTimeInMicroseconds <= TBT_GOOD_TIMING) {
    scoreClassification = ScoreClassification.GOOD;
  }
  return scoreClassification;
}

export async function finalize(): Promise<void> {
  pageLoadEventsArray.sort((a, b) => a.ts - b.ts);

  for (const pageLoadEvent of pageLoadEventsArray) {
    const navigation = getNavigationForPageLoadEvent(pageLoadEvent);
    if (navigation) {
      // Event's navigation was not filtered out as noise.
      storePageLoadMetricAgainstNavigationId(navigation, pageLoadEvent);
    }
  }
  estimateTotalBlockingTimes();
}

export function data(): {
  metricScoresByFrameId: Map<string, Map<string, Map<MetricName, MetricScore>>>,
} {
  return {
    metricScoresByFrameId: new Map(metricScoresByFrameId),
  };
}

export function deps(): TraceEventHandlerName[] {
  return ['Meta', 'Renderer'];
}

export const enum ScoreClassification {
  GOOD = 'good',
  OK = 'ok',
  BAD = 'bad',
  // Some metrics (such as DOMContentLoaded) don't have a Good/OK/Bad classification, hence this additional entry.
  UNCLASSIFIED = 'unclassified',
}

export const enum MetricName {
  FCP = 'FCP',
  LCP = 'LCP',
  DCL = 'DCL',
  TTI = 'TTI',
  TBT = 'TBT',
  CLS = 'CLS',
}

export interface MetricScore {
  score: string;
  metricName: MetricName;
  classification: ScoreClassification;
  event?: Types.TraceEvents.PageLoadEvent;
  // The last navigation that occured before this metric score.
  navigation?: Types.TraceEvents.TraceEventNavigationStart;
  estimated?: boolean;
}
