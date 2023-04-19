// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';

import {type TraceEventHandlerName, HandlerState} from './types.js';

import {ScoreClassification} from './PageLoadMetricsHandler.js';

import {data as metaHandlerData} from './MetaHandler.js';
import {data as screenshotsHandlerData} from './ScreenshotsHandler.js';
import * as Platform from '../../../core/platform/platform.js';

import * as Types from '../types/types.js';

// We start with a score of zero and step through all Layout Shift records from
// all renderers. Each record not only tells us which renderer it is, but also
// the unweighted and weighted scores. The unweighted score is the score we would
// get if the renderer were the only one in the viewport. The weighted score, on
// the other hand, accounts for how much of the viewport that particular render
// takes up when the shift happened. An ad frame in the corner of the viewport
// that shifts is considered less disruptive, therefore, than if it were taking
// up the whole viewport.
//
// Next, we step through all the records from all renderers and add the weighted
// score to a running total across all of the renderers. We create a new "cluster"
// and reset the running total when:
//
// 1. We observe a outermost frame navigation, or
// 2. When there's a gap between records of > 1s, or
// 3. When there's more than 5 seconds of continuous layout shifting.
//
// Note that for it to be Cumulative Layout Shift in the sense described in the
// documentation we would need to guarantee that we are tracking from navigation
// to unload. However, we don't make any such guarantees here (since a developer
// can record and stop when they please), so we support the cluster approach,
// and we can give them a score, but it is effectively a "session" score, a
// score for the given recording, and almost certainly not the
// navigation-to-unload CLS score.

interface LayoutShifts {
  clusters: LayoutShiftCluster[];
  sessionMaxScore: number;
  // The session window which contains the SessionMaxScore
  clsWindowID: number;
  // We use these to calculate root causes for a given LayoutShift
  prePaintEvents: Types.TraceEvents.TraceEventPrePaint[];
  layoutInvalidationEvents: Types.TraceEvents.TraceEventLayoutInvalidation[];
  styleRecalcInvalidationEvents: Types.TraceEvents.TraceEventStyleRecalcInvalidation[];
  scoreRecords: ScoreRecord[];
}

// This represents the maximum #time we will allow a cluster to go before we
// reset it.
export const MAX_CLUSTER_DURATION = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(5000));

// This represents the maximum #time we will allow between layout shift events
// before considering it to be the start of a new cluster.
export const MAX_SHIFT_TIME_DELTA = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(1000));

// Layout shifts are reported globally to the developer, irrespective of which
// frame they originated in. However, each process does have its own individual
// CLS score, so we need to segment by process. This means Layout Shifts from
// sites with one process (no subframes, or subframes from the same origin)
// will be reported together. In the case of multiple renderers (frames across
// different origins), we offer the developer the ability to switch renderer in
// the UI.
const layoutShiftEvents: Types.TraceEvents.TraceEventLayoutShift[] = [];

// These events denote potential node resizings. We store them to link captured
// layout shifts to the resizing of unsized elements.
const layoutInvalidationEvents: Types.TraceEvents.TraceEventLayoutInvalidation[] = [];
const styleRecalcInvalidationEvents: Types.TraceEvents.TraceEventStyleRecalcInvalidation[] = [];

// Layout shifts happen during PrePaint as part of the rendering lifecycle.
// We determine if a LayoutInvalidation event is a potential root cause of a layout
// shift if the next PrePaint after the LayoutInvalidation is the parent
// node of such shift.
const prePaintEvents: Types.TraceEvents.TraceEventPrePaint[] = [];

let sessionMaxScore = 0;

let clsWindowID = -1;

const clusters: LayoutShiftCluster[] = [];

// Represents a point in time in which a  LS score change
// was recorded.
type ScoreRecord = {
  ts: number,
  score: number,
};

// The complete timeline of LS score changes in a trace.
// Includes drops to 0 when session windows end.
const scoreRecords: ScoreRecord[] = [];

let handlerState = HandlerState.UNINITIALIZED;

export function initialize(): void {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error('LayoutShifts Handler was not reset');
  }
  handlerState = HandlerState.INITIALIZED;
}

export function reset(): void {
  handlerState = HandlerState.UNINITIALIZED;
  layoutShiftEvents.length = 0;
  layoutInvalidationEvents.length = 0;
  prePaintEvents.length = 0;
  clusters.length = 0;
  sessionMaxScore = 0;
  scoreRecords.length = 0;
  clsWindowID = -1;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Handler is not initialized');
  }

  if (Types.TraceEvents.isTraceEventLayoutShift(event) && !event.args.data?.had_recent_input) {
    layoutShiftEvents.push(event);
    return;
  }
  if (Types.TraceEvents.isTraceEventLayoutInvalidation(event)) {
    layoutInvalidationEvents.push(event);
    return;
  }
  if (Types.TraceEvents.isTraceEventStyleRecalcInvalidation(event)) {
    styleRecalcInvalidationEvents.push(event);
  }
  if (Types.TraceEvents.isTraceEventPrePaint(event)) {
    prePaintEvents.push(event);
    return;
  }
}

function traceWindowFromTime(time: Types.Timing.MicroSeconds): Types.Timing.TraceWindow {
  return {
    min: time,
    max: time,
    range: Types.Timing.MicroSeconds(0),
  };
}

function updateTraceWindowMax(traceWindow: Types.Timing.TraceWindow, newMax: Types.Timing.MicroSeconds): void {
  traceWindow.max = newMax;
  traceWindow.range = Types.Timing.MicroSeconds(traceWindow.max - traceWindow.min);
}

function findNextScreenshotSource(timestamp: Types.Timing.MicroSeconds): string|undefined {
  const screenshots = screenshotsHandlerData();
  const screenshotIndex = findNextScreenshotEventIndex(screenshots, timestamp);
  if (!screenshotIndex) {
    return undefined;
  }
  return `data:img/png;base64,${screenshots[screenshotIndex].args.snapshot}`;
}

export function findNextScreenshotEventIndex(
    screenshots: Types.TraceEvents.TraceEventSnapshot[], timestamp: Types.Timing.MicroSeconds): number|null {
  return Platform.ArrayUtilities.nearestIndexFromBeginning(screenshots, frame => frame.ts > timestamp);
}

function buildScoreRecords(): void {
  const {traceBounds} = metaHandlerData();
  scoreRecords.push({ts: traceBounds.min, score: 0});

  for (const cluster of clusters) {
    let clusterScore = 0;
    if (cluster.events[0].args.data) {
      scoreRecords.push({ts: cluster.clusterWindow.min, score: cluster.events[0].args.data.weighted_score_delta});
    }
    for (let i = 0; i < cluster.events.length; i++) {
      const event = cluster.events[i];
      if (!event.args.data) {
        continue;
      }
      clusterScore += event.args.data.weighted_score_delta;
      scoreRecords.push({ts: event.ts, score: clusterScore});
    }
    scoreRecords.push({ts: cluster.clusterWindow.max, score: 0});
  }
}

export async function finalize(): Promise<void> {
  // Ensure the events are sorted by #time ascending.
  layoutShiftEvents.sort((a, b) => a.ts - b.ts);
  prePaintEvents.sort((a, b) => a.ts - b.ts);
  layoutInvalidationEvents.sort((a, b) => a.ts - b.ts);

  // Each function transforms the data used by the next, as such the invoke order
  // is important.
  await buildLayoutShiftsClusters();
  buildScoreRecords();
  handlerState = HandlerState.FINALIZED;
}
async function buildLayoutShiftsClusters(): Promise<void> {
  const {navigationsByFrameId, mainFrameId, traceBounds} = metaHandlerData();
  const navigations = navigationsByFrameId.get(mainFrameId) || [];
  if (layoutShiftEvents.length === 0) {
    return;
  }
  let firstShiftTime = layoutShiftEvents[0].ts;
  let lastShiftTime = layoutShiftEvents[0].ts;
  let lastShiftNavigation = null;
  // Now step through each and create clusters.
  // A cluster is equivalent to a session window (see https://web.dev/cls/#what-is-cls).
  // To make the line chart clear, we explicitly demark the limits of each session window
  // by starting the cumulative score of the window at the time of the first layout shift
  // and ending it (dropping the line back to 0) when the window ends according to the
  // thresholds (MAX_CLUSTER_DURATION, MAX_SHIFT_TIME_DELTA).
  for (const event of layoutShiftEvents) {
    // First detect if either the cluster duration or the #time between this and
    // the last shift has been exceeded.
    const clusterDurationExceeded = event.ts - firstShiftTime > MAX_CLUSTER_DURATION;
    const maxTimeDeltaSinceLastShiftExceeded = event.ts - lastShiftTime > MAX_SHIFT_TIME_DELTA;

    // Next take a look at navigations. If between this and the last shift we have navigated,
    // note it.
    const currentShiftNavigation = Platform.ArrayUtilities.nearestIndexFromEnd(navigations, nav => nav.ts < event.ts);
    const hasNavigated = lastShiftNavigation !== currentShiftNavigation && currentShiftNavigation !== null;

    // If any of the above criteria are met or if we don't have any cluster yet we should
    // start a new one.
    if (clusterDurationExceeded || maxTimeDeltaSinceLastShiftExceeded || hasNavigated || !clusters.length) {
      // The cluster starts #time should be the timestamp of the first layout shift in it.
      const clusterStartTime = event.ts;

      // If the last session window ended because the max delta time between shifts
      // was exceeded set the endtime to MAX_SHIFT_TIME_DELTA microseconds after the
      // last shift in the session.
      const endTimeByMaxSessionDuration = clusterDurationExceeded ? firstShiftTime + MAX_CLUSTER_DURATION : Infinity;

      // If the last session window ended because the max session duration was
      // surpassed, set the endtime so that the window length = MAX_CLUSTER_DURATION;
      const endTimeByMaxShiftGap = maxTimeDeltaSinceLastShiftExceeded ? lastShiftTime + MAX_SHIFT_TIME_DELTA : Infinity;

      // If there was a navigation during the last window, close it at the time
      // of the navigation.
      const endTimeByNavigation = hasNavigated ? navigations[currentShiftNavigation].ts : Infinity;

      // End the previous cluster at the time of the first of the criteria above that was met.
      const previousClusterEndTime = Math.min(endTimeByMaxSessionDuration, endTimeByMaxShiftGap, endTimeByNavigation);

      // If there is an existing cluster update its closing time.
      if (clusters.length > 0) {
        const currentCluster = clusters[clusters.length - 1];
        updateTraceWindowMax(currentCluster.clusterWindow, Types.Timing.MicroSeconds(previousClusterEndTime));
      }

      clusters.push({
        events: [],
        clusterWindow: traceWindowFromTime(clusterStartTime),
        clusterCumulativeScore: 0,
        scoreWindows: {
          good: traceWindowFromTime(clusterStartTime),
          needsImprovement: null,
          bad: null,
        },
      });

      firstShiftTime = clusterStartTime;
    }

    // Given the above we should have a cluster available, so pick the most
    // recent one and append the shift, bump its score and window values accordingly.
    const currentCluster = clusters[clusters.length - 1];
    const timeFromNavigation = currentShiftNavigation !== null ?
        Types.Timing.MicroSeconds(event.ts - navigations[currentShiftNavigation].ts) :
        undefined;

    currentCluster.clusterCumulativeScore += event.args.data ? event.args.data.weighted_score_delta : 0;
    if (!event.args.data) {
      continue;
    }
    const shift: Types.TraceEvents.SyntheticLayoutShift = {
      ...event,
      args: {
        frame: event.args.frame,
        data: {
          ...event.args.data,
          rawEvent: event,
        },
      },
      parsedData: {
        screenshotSource: findNextScreenshotSource(event.ts),
        timeFromNavigation,
        cumulativeWeightedScoreInWindow: currentCluster.clusterCumulativeScore,
        // The score of the session window is temporarily set to 0 just
        // to initialize it. Since we need to get the score of all shifts
        // in the session window to determine its value, its definite
        // value is set when stepping through the built clusters.
        sessionWindowData: {cumulativeWindowScore: 0, id: clusters.length},
      },
    };
    currentCluster.events.push(shift);
    updateTraceWindowMax(currentCluster.clusterWindow, event.ts);

    lastShiftTime = event.ts;
    lastShiftNavigation = currentShiftNavigation;
  }

  // Now step through each cluster and set up the times at which the value
  // goes from Good, to needs improvement, to Bad. Note that if there is a
  // large jump we may go from Good to Bad without ever creating a Needs
  // Improvement window at all.
  for (const cluster of clusters) {
    let weightedScore = 0;
    let windowID = -1;
    // If this is the last cluster update its window. The cluster duration is determined
    // by the minimum between: time to next navigation, trace end time, time to maximum
    // cluster duration and time to maximum gap between layout shifts.
    if (cluster === clusters[clusters.length - 1]) {
      const clusterEndByMaxDuration = MAX_CLUSTER_DURATION + cluster.clusterWindow.min;
      const clusterEndByMaxGap = cluster.clusterWindow.max + MAX_SHIFT_TIME_DELTA;
      const nextNavigationIndex =
          Platform.ArrayUtilities.nearestIndexFromBeginning(navigations, nav => nav.ts > cluster.clusterWindow.max);
      const nextNavigationTime = nextNavigationIndex ? navigations[nextNavigationIndex].ts : Infinity;
      const clusterEnd = Math.min(clusterEndByMaxDuration, clusterEndByMaxGap, traceBounds.max, nextNavigationTime);
      updateTraceWindowMax(cluster.clusterWindow, Types.Timing.MicroSeconds(clusterEnd));
    }
    for (const shift of cluster.events) {
      weightedScore += shift.args.data ? shift.args.data.weighted_score_delta : 0;
      windowID = shift.parsedData.sessionWindowData.id;
      const ts = shift.ts;
      // Update the the CLS score of this shift's session window now that
      // we have it.
      shift.parsedData.sessionWindowData.cumulativeWindowScore = cluster.clusterCumulativeScore;
      if (weightedScore < LayoutShiftsThreshold.NEEDS_IMPROVEMENT) {
        // Expand the Good window.
        updateTraceWindowMax(cluster.scoreWindows.good, ts);
      } else if (
          weightedScore >= LayoutShiftsThreshold.NEEDS_IMPROVEMENT && weightedScore < LayoutShiftsThreshold.BAD) {
        if (!cluster.scoreWindows.needsImprovement) {
          // Close the Good window, and open the needs improvement window.
          updateTraceWindowMax(cluster.scoreWindows.good, Types.Timing.MicroSeconds(ts - 1));
          cluster.scoreWindows.needsImprovement = traceWindowFromTime(ts);
        }

        // Expand the needs improvement window.
        updateTraceWindowMax(cluster.scoreWindows.needsImprovement, ts);
      } else if (weightedScore >= LayoutShiftsThreshold.BAD) {
        if (!cluster.scoreWindows.bad) {
          // We may jump from Good to Bad here, so update whichever window is open.
          if (cluster.scoreWindows.needsImprovement) {
            updateTraceWindowMax(cluster.scoreWindows.needsImprovement, Types.Timing.MicroSeconds(ts - 1));
          } else {
            updateTraceWindowMax(cluster.scoreWindows.good, Types.Timing.MicroSeconds(ts - 1));
          }

          cluster.scoreWindows.bad = traceWindowFromTime(shift.ts);
        }

        // Expand the Bad window.
        updateTraceWindowMax(cluster.scoreWindows.bad, ts);
      }

      // At this point the windows are set by the timestamps of the events, but the
      // next cluster begins at the timestamp of its first event. As such we now
      // need to expand the score window to the end of the cluster, and we do so
      // by using the Bad widow if it's there, or the NI window, or finally the
      // Good window.
      if (cluster.scoreWindows.bad) {
        updateTraceWindowMax(cluster.scoreWindows.bad, cluster.clusterWindow.max);
      } else if (cluster.scoreWindows.needsImprovement) {
        updateTraceWindowMax(cluster.scoreWindows.needsImprovement, cluster.clusterWindow.max);
      } else {
        updateTraceWindowMax(cluster.scoreWindows.good, cluster.clusterWindow.max);
      }
    }
    if (weightedScore > sessionMaxScore) {
      clsWindowID = windowID;
      sessionMaxScore = weightedScore;
    }
  }
}

export function data(): LayoutShifts {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Layout Shifts Handler is not finalized');
  }

  return {
    clusters: [...clusters],
    sessionMaxScore: sessionMaxScore,
    clsWindowID,
    prePaintEvents: [...prePaintEvents],
    layoutInvalidationEvents: [...layoutInvalidationEvents],
    styleRecalcInvalidationEvents: [],
    scoreRecords: [...scoreRecords],
  };
}

export function deps(): TraceEventHandlerName[] {
  return ['Screenshots', 'Meta'];
}

export function stateForLayoutShiftScore(score: number): ScoreClassification {
  let state = ScoreClassification.GOOD;
  if (score >= LayoutShiftsThreshold.NEEDS_IMPROVEMENT) {
    state = ScoreClassification.OK;
  }

  if (score >= LayoutShiftsThreshold.BAD) {
    state = ScoreClassification.BAD;
  }

  return state;
}

export interface LayoutShiftCluster {
  clusterWindow: Types.Timing.TraceWindow;
  clusterCumulativeScore: number;
  events: Types.TraceEvents.SyntheticLayoutShift[];
  // For convenience we split apart the cluster into good, NI, and bad windows.
  // Since a cluster may remain in the good window, we mark NI and bad as being
  // possibly null.
  scoreWindows: {
    good: Types.Timing.TraceWindow,
    needsImprovement: Types.Timing.TraceWindow|null,
    bad: Types.Timing.TraceWindow|null,
  };
}

// Based on https://web.dev/cls/
export const enum LayoutShiftsThreshold {
  GOOD = 0,
  NEEDS_IMPROVEMENT = 0.1,
  BAD = 0.25,
}
