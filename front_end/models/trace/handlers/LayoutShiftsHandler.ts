// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {data as metaHandlerData} from './MetaHandler.js';
import {ScoreClassification} from './PageLoadMetricsHandler.js';
import {data as screenshotsHandlerData} from './ScreenshotsHandler.js';
import {type HandlerName, HandlerState} from './types.js';

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
  clusters: readonly Types.Events.SyntheticLayoutShiftCluster[];
  clustersByNavigationId: Map<Types.Events.NavigationId, Types.Events.SyntheticLayoutShiftCluster[]>;
  sessionMaxScore: number;
  // The session window which contains the SessionMaxScore
  clsWindowID: number;
  // We use these to calculate root causes for a given LayoutShift
  // TODO(crbug/41484172): should be readonly
  prePaintEvents: Types.Events.PrePaint[];
  layoutInvalidationEvents: readonly Types.Events.LayoutInvalidationTracking[];
  scheduleStyleInvalidationEvents: readonly Types.Events.ScheduleStyleInvalidationTracking[];
  styleRecalcInvalidationEvents: readonly Types.Events.StyleRecalcInvalidationTracking[];
  renderFrameImplCreateChildFrameEvents: readonly Types.Events.RenderFrameImplCreateChildFrame[];
  domLoadingEvents: readonly Types.Events.DomLoading[];
  beginRemoteFontLoadEvents: readonly Types.Events.BeginRemoteFontLoad[];
  scoreRecords: readonly ScoreRecord[];
  // TODO(crbug/41484172): should be readonly
  backendNodeIds: Protocol.DOM.BackendNodeId[];
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
const layoutShiftEvents: Types.Events.LayoutShift[] = [];

// These events denote potential node resizings. We store them to link captured
// layout shifts to the resizing of unsized elements.
const layoutInvalidationEvents: Types.Events.LayoutInvalidationTracking[] = [];
const scheduleStyleInvalidationEvents: Types.Events.ScheduleStyleInvalidationTracking[] = [];
const styleRecalcInvalidationEvents: Types.Events.StyleRecalcInvalidationTracking[] = [];
const renderFrameImplCreateChildFrameEvents: Types.Events.RenderFrameImplCreateChildFrame[] = [];
const domLoadingEvents: Types.Events.DomLoading[] = [];
const beginRemoteFontLoadEvents: Types.Events.BeginRemoteFontLoad[] = [];

const backendNodeIds = new Set<Protocol.DOM.BackendNodeId>();

// Layout shifts happen during PrePaint as part of the rendering lifecycle.
// We determine if a LayoutInvalidation event is a potential root cause of a layout
// shift if the next PrePaint after the LayoutInvalidation is the parent
// node of such shift.
const prePaintEvents: Types.Events.PrePaint[] = [];

let sessionMaxScore = 0;

let clsWindowID = -1;

const clusters: Types.Events.SyntheticLayoutShiftCluster[] = [];
const clustersByNavigationId = new Map<Types.Events.NavigationId, Types.Events.SyntheticLayoutShiftCluster[]>();

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
  scheduleStyleInvalidationEvents.length = 0;
  styleRecalcInvalidationEvents.length = 0;
  prePaintEvents.length = 0;
  renderFrameImplCreateChildFrameEvents.length = 0;
  domLoadingEvents.length = 0;
  beginRemoteFontLoadEvents.length = 0;
  backendNodeIds.clear();
  clusters.length = 0;
  sessionMaxScore = 0;
  scoreRecords.length = 0;
  clsWindowID = -1;
  clustersByNavigationId.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Handler is not initialized');
  }

  if (Types.Events.isLayoutShift(event) && !event.args.data?.had_recent_input) {
    layoutShiftEvents.push(event);
    return;
  }
  if (Types.Events.isLayoutInvalidationTracking(event)) {
    layoutInvalidationEvents.push(event);
    return;
  }
  if (Types.Events.isScheduleStyleInvalidationTracking(event)) {
    scheduleStyleInvalidationEvents.push(event);
  }
  if (Types.Events.isStyleRecalcInvalidationTracking(event)) {
    styleRecalcInvalidationEvents.push(event);
  }
  if (Types.Events.isPrePaint(event)) {
    prePaintEvents.push(event);
    return;
  }
  if (Types.Events.isRenderFrameImplCreateChildFrame(event)) {
    renderFrameImplCreateChildFrameEvents.push(event);
  }
  if (Types.Events.isDomLoading(event)) {
    domLoadingEvents.push(event);
  }
  if (Types.Events.isBeginRemoteFontLoad(event)) {
    beginRemoteFontLoadEvents.push(event);
  }
}

function traceWindowFromTime(time: Types.Timing.MicroSeconds): Types.Timing.TraceWindowMicroSeconds {
  return {
    min: time,
    max: time,
    range: Types.Timing.MicroSeconds(0),
  };
}

function updateTraceWindowMax(
    traceWindow: Types.Timing.TraceWindowMicroSeconds, newMax: Types.Timing.MicroSeconds): void {
  traceWindow.max = newMax;
  traceWindow.range = Types.Timing.MicroSeconds(traceWindow.max - traceWindow.min);
}

function findScreenshots(timestamp: Types.Timing.MicroSeconds): Types.Events.LayoutShiftParsedData['screenshots'] {
  const screenshots = screenshotsHandlerData().all;
  const before = Helpers.Trace.findPreviousEventBeforeTimestamp(screenshots, timestamp);
  const after = before ? screenshots[screenshots.indexOf(before) + 1] : null;
  return {before, after};
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

/**
 * Collects backend node ids coming from LayoutShift and LayoutInvalidation
 * events.
 */
function collectNodes(): void {
  backendNodeIds.clear();

  // Collect the node ids present in the shifts.
  for (const layoutShift of layoutShiftEvents) {
    if (!layoutShift.args.data?.impacted_nodes) {
      continue;
    }
    for (const node of layoutShift.args.data.impacted_nodes) {
      backendNodeIds.add(node.node_id);
    }
  }

  // Collect the node ids present in LayoutInvalidation & scheduleStyleInvalidation events.
  for (const layoutInvalidation of layoutInvalidationEvents) {
    if (!layoutInvalidation.args.data?.nodeId) {
      continue;
    }
    backendNodeIds.add(layoutInvalidation.args.data.nodeId);
  }
  for (const scheduleStyleInvalidation of scheduleStyleInvalidationEvents) {
    if (!scheduleStyleInvalidation.args.data?.nodeId) {
      continue;
    }
    backendNodeIds.add(scheduleStyleInvalidation.args.data.nodeId);
  }
}

export async function finalize(): Promise<void> {
  // Ensure the events are sorted by #time ascending.
  layoutShiftEvents.sort((a, b) => a.ts - b.ts);
  prePaintEvents.sort((a, b) => a.ts - b.ts);
  layoutInvalidationEvents.sort((a, b) => a.ts - b.ts);
  renderFrameImplCreateChildFrameEvents.sort((a, b) => a.ts - b.ts);
  domLoadingEvents.sort((a, b) => a.ts - b.ts);
  beginRemoteFontLoadEvents.sort((a, b) => a.ts - b.ts);

  // Each function transforms the data used by the next, as such the invoke order
  // is important.
  await buildLayoutShiftsClusters();
  buildScoreRecords();
  collectNodes();
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

      // If this cluster happened after a navigation, set the navigationId to
      // the current navigation. This lets us easily group clusters by
      // navigation.
      const navigationId = currentShiftNavigation === null ?
          Types.Events.NO_NAVIGATION :
          navigations[currentShiftNavigation].args.data?.navigationId;
      // TODO: `navigationId` is `string | undefined`, but the undefined portion
      // comes from `data.navigationId`. I don't think that is possible for this
      // event type. Can we make this typing stronger? In the meantime, we allow
      // `navigationId` to include undefined values.

      clusters.push({
        name: 'SyntheticLayoutShiftCluster',
        events: [],
        clusterWindow: traceWindowFromTime(clusterStartTime),
        clusterCumulativeScore: 0,
        scoreWindows: {
          good: traceWindowFromTime(clusterStartTime),
        },
        navigationId,
        // Set default Event so that this event is treated accordingly for the track appender.
        ts: event.ts,
        pid: event.pid,
        tid: event.tid,
        ph: Types.Events.Phase.COMPLETE,
        cat: '',
        dur: Types.Timing.MicroSeconds(-1),  // This `cluster.dur` is updated below.
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
    const shift =
        Helpers.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent<Types.Events.SyntheticLayoutShift>({
          rawSourceEvent: event,
          ...event,
          args: {
            frame: event.args.frame,
            data: {
              ...event.args.data,
              rawEvent: event,
              navigationId: currentCluster.navigationId ?? undefined,
            },
          },
          parsedData: {
            timeFromNavigation,
            screenshots: findScreenshots(event.ts),
            cumulativeWeightedScoreInWindow: currentCluster.clusterCumulativeScore,
            // The score of the session window is temporarily set to 0 just
            // to initialize it. Since we need to get the score of all shifts
            // in the session window to determine its value, its definite
            // value is set when stepping through the built clusters.
            sessionWindowData: {cumulativeWindowScore: 0, id: clusters.length},
          },
        });
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

    let largestScore: number = 0;
    let worstShiftEvent: Types.Events.Event|null = null;

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

      // Find the worst layout shift of the cluster.
      const score = shift.args.data?.weighted_score_delta;
      if (score !== undefined && score > largestScore) {
        largestScore = score;
        worstShiftEvent = shift;
      }
    }
    // Update the cluster's worst layout shift.
    if (worstShiftEvent) {
      cluster.worstShiftEvent = worstShiftEvent;
    }

    // layout shifts are already sorted by time ascending.
    // Capture the time range of the cluster.
    cluster.ts = cluster.events[0].ts;
    const lastShiftTimings = Helpers.Timing.eventTimingsMicroSeconds(cluster.events[cluster.events.length - 1]);
    // Add MAX_SHIFT_TIME_DELTA, the section gap after the last layout shift. This marks the end of the cluster.
    cluster.dur = Types.Timing.MicroSeconds((lastShiftTimings.endTime - cluster.events[0].ts) + MAX_SHIFT_TIME_DELTA);

    if (weightedScore > sessionMaxScore) {
      clsWindowID = windowID;
      sessionMaxScore = weightedScore;
    }

    if (cluster.navigationId) {
      const clustersForId = Platform.MapUtilities.getWithDefault(clustersByNavigationId, cluster.navigationId, () => {
        return [];
      });
      clustersForId.push(cluster);
    }
  }
}

export function data(): LayoutShifts {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Layout Shifts Handler is not finalized');
  }

  return {
    clusters,
    sessionMaxScore,
    clsWindowID,
    prePaintEvents,
    layoutInvalidationEvents,
    scheduleStyleInvalidationEvents,
    styleRecalcInvalidationEvents: [],
    renderFrameImplCreateChildFrameEvents,
    domLoadingEvents,
    beginRemoteFontLoadEvents,
    scoreRecords,
    // TODO(crbug/41484172): change the type so no need to clone
    backendNodeIds: [...backendNodeIds],
    clustersByNavigationId: new Map(clustersByNavigationId),
  };
}

export function deps(): HandlerName[] {
  return ['Screenshots', 'Meta'];
}

export function scoreClassificationForLayoutShift(score: number): ScoreClassification {
  let state = ScoreClassification.GOOD;
  if (score >= LayoutShiftsThreshold.NEEDS_IMPROVEMENT) {
    state = ScoreClassification.OK;
  }

  if (score >= LayoutShiftsThreshold.BAD) {
    state = ScoreClassification.BAD;
  }

  return state;
}

// Based on https://web.dev/cls/
export const enum LayoutShiftsThreshold {
  GOOD = 0,
  NEEDS_IMPROVEMENT = 0.1,
  BAD = 0.25,
}
