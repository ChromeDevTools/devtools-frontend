// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {
  type InsightResult,
  type InsightSetContext,
  type RequiredData,
} from './types.js';

export type CLSInsightResult = InsightResult<{
  animationFailures?: readonly NoncompositedAnimationFailure[],
  shifts?: Map<Types.Events.LayoutShift, LayoutShiftRootCausesData>,
        clusters: Types.Events.SyntheticLayoutShiftCluster[],
}>;

export function deps(): ['Meta', 'Animations', 'LayoutShifts', 'NetworkRequests'] {
  return ['Meta', 'Animations', 'LayoutShifts', 'NetworkRequests'];
}

export const enum AnimationFailureReasons {
  UNSUPPORTED_CSS_PROPERTY = 'UNSUPPORTED_CSS_PROPERTY',
  TRANSFROM_BOX_SIZE_DEPENDENT = 'TRANSFROM_BOX_SIZE_DEPENDENT',
  FILTER_MAY_MOVE_PIXELS = 'FILTER_MAY_MOVE_PIXELS',
  NON_REPLACE_COMPOSITE_MODE = 'NON_REPLACE_COMPOSITE_MODE',
  INCOMPATIBLE_ANIMATIONS = 'INCOMPATIBLE_ANIMATIONS',
  UNSUPPORTED_TIMING_PARAMS = 'UNSUPPORTED_TIMING_PARAMS',
}

export interface NoncompositedAnimationFailure {
  /**
   * Animation name.
   */
  name?: string;
  /**
   * Failure reason based on mask number defined in
   * https://source.chromium.org/search?q=f:compositor_animations.h%20%22enum%20FailureReason%22.
   */
  failureReasons: AnimationFailureReasons[];
  /**
   * Unsupported properties.
   */
  unsupportedProperties?: Types.Events.Animation['args']['data']['unsupportedProperties'];
}

/**
 * Each failure reason is represented by a bit flag. The bit shift operator '<<' is used to define
 * which bit corresponds to each failure reason.
 * https://source.chromium.org/search?q=f:compositor_animations.h%20%22enum%20FailureReason%22
 * @type {{flag: number, failure: AnimationFailureReasons}[]}
 */
const ACTIONABLE_FAILURE_REASONS = [
  {
    flag: 1 << 13,
    failure: AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY,
  },
  {
    flag: 1 << 11,
    failure: AnimationFailureReasons.TRANSFROM_BOX_SIZE_DEPENDENT,
  },
  {
    flag: 1 << 12,
    failure: AnimationFailureReasons.FILTER_MAY_MOVE_PIXELS,
  },
  {
    flag: 1 << 4,
    failure: AnimationFailureReasons.NON_REPLACE_COMPOSITE_MODE,
  },
  {
    flag: 1 << 6,
    failure: AnimationFailureReasons.INCOMPATIBLE_ANIMATIONS,
  },
  {
    flag: 1 << 3,
    failure: AnimationFailureReasons.UNSUPPORTED_TIMING_PARAMS,
  },
];

// 500ms window.
// Use this window to consider events and requests that may have caused a layout shift.
const INVALIDATION_WINDOW = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(0.5));

export interface LayoutShiftRootCausesData {
  iframeIds: string[];
  fontRequests: Types.Events.SyntheticNetworkRequest[];
}

function isInInvalidationWindow(event: Types.Events.Event, targetEvent: Types.Events.Event): boolean {
  const eventEnd = event.dur ? event.ts + event.dur : event.ts;
  return eventEnd < targetEvent.ts && eventEnd >= targetEvent.ts - INVALIDATION_WINDOW;
}

export function getNonCompositedFailure(event: Types.Events.SyntheticAnimationPair): NoncompositedAnimationFailure[] {
  const failures: NoncompositedAnimationFailure[] = [];
  const beginEvent = event.args.data.beginEvent;
  const instantEvents = event.args.data.instantEvents || [];
  /**
   * Animation events containing composite information are ASYNC_NESTABLE_INSTANT ('n').
   * An animation may also contain multiple 'n' events, so we look through those with useful non-composited data.
   */
  for (const event of instantEvents) {
    const failureMask = event.args.data.compositeFailed;
    const unsupportedProperties = event.args.data.unsupportedProperties;
    if (!failureMask || !unsupportedProperties) {
      continue;
    }
    const failureReasons =
        ACTIONABLE_FAILURE_REASONS.filter(reason => failureMask & reason.flag).map(reason => reason.failure);
    const failure: NoncompositedAnimationFailure = {
      name: beginEvent.args.data.displayName,
      failureReasons,
      unsupportedProperties,
    };
    failures.push(failure);
  }
  return failures;
}

/**
 * Given an array of layout shift and PrePaint events, returns a mapping from
 * PrePaint events to layout shifts dispatched within it.
 */
function getShiftsByPrePaintEvents(
    layoutShifts: Types.Events.LayoutShift[],
    prePaintEvents: Types.Events.PrePaint[],
    ): Map<Types.Events.PrePaint, Types.Events.LayoutShift[]> {
  // Maps from PrePaint events to LayoutShifts that occured in each one.
  const shiftsByPrePaint = new Map<Types.Events.PrePaint, Types.Events.LayoutShift[]>();

  // Associate all shifts to their corresponding PrePaint.
  for (const prePaintEvent of prePaintEvents) {
    const firstShiftIndex =
        Platform.ArrayUtilities.nearestIndexFromBeginning(layoutShifts, shift => shift.ts >= prePaintEvent.ts);
    if (firstShiftIndex === null) {
      // No layout shifts registered after this PrePaint start. Continue.
      continue;
    }
    for (let i = firstShiftIndex; i < layoutShifts.length; i++) {
      const shift = layoutShifts[i];
      if (shift.ts >= prePaintEvent.ts && shift.ts <= prePaintEvent.ts + prePaintEvent.dur) {
        const shiftsInPrePaint = Platform.MapUtilities.getWithDefault(shiftsByPrePaint, prePaintEvent, () => []);
        shiftsInPrePaint.push(shift);
      }
      if (shift.ts > prePaintEvent.ts + prePaintEvent.dur) {
        // Reached all layoutShifts of this PrePaint. Break out to continue with the next prePaint event.
        break;
      }
    }
  }
  return shiftsByPrePaint;
}

/**
 * This gets the first prePaint event that follows the provided event and returns it.
 */
function getNextPrePaintEvent(
    prePaintEvents: Types.Events.PrePaint[], targetEvent: Types.Events.Event): Types.Events.PrePaint|undefined {
  // Get the first PrePaint event that happened after the targetEvent.
  const nextPrePaintIndex = Platform.ArrayUtilities.nearestIndexFromBeginning(
      prePaintEvents, prePaint => prePaint.ts > targetEvent.ts + (targetEvent.dur || 0));
  // No PrePaint event registered after this event
  if (nextPrePaintIndex === null) {
    return undefined;
  }

  return prePaintEvents[nextPrePaintIndex];
}

/**
 * An Iframe is considered a root cause if the iframe event occurs before a prePaint event
 * and within this prePaint event a layout shift(s) occurs.
 */
function getIframeRootCauses(
    iframeCreatedEvents: readonly Types.Events.RenderFrameImplCreateChildFrame[],
    prePaintEvents: Types.Events.PrePaint[], shiftsByPrePaint: Map<Types.Events.PrePaint, Types.Events.LayoutShift[]>,
    rootCausesByShift: Map<Types.Events.LayoutShift, LayoutShiftRootCausesData>,
    domLoadingEvents: readonly Types.Events.DomLoading[]): Map<Types.Events.LayoutShift, LayoutShiftRootCausesData> {
  for (const iframeEvent of iframeCreatedEvents) {
    const nextPrePaint = getNextPrePaintEvent(prePaintEvents, iframeEvent);
    // If no following prePaint, this is not a root cause.
    if (!nextPrePaint) {
      continue;
    }
    const shifts = shiftsByPrePaint.get(nextPrePaint);
    // if no layout shift(s), this is not a root cause.
    if (!shifts) {
      continue;
    }
    for (const shift of shifts) {
      const rootCausesForShift = Platform.MapUtilities.getWithDefault(rootCausesByShift, shift, () => {
        return {
          iframeIds: [],
          fontRequests: [],
        };
      });

      // Look for the first dom event that occurs within the bounds of the iframe event.
      // This contains the frame id.
      const domEvent = domLoadingEvents.find(e => {
        const maxIframe = Types.Timing.MicroSeconds(iframeEvent.ts + (iframeEvent.dur ?? 0));
        return e.ts >= iframeEvent.ts && e.ts <= maxIframe;
      });
      if (domEvent && domEvent.args.frame) {
        rootCausesForShift.iframeIds.push(domEvent.args.frame);
      }
    }
  }
  return rootCausesByShift;
}

/**
 * A font request is considered a root cause if the request occurs before a prePaint event
 * and within this prePaint event a layout shift(s) occurs. Additionally, this font request should
 * happen within the INVALIDATION_WINDOW of the prePaint event.
 */
function getFontRootCauses(
    networkRequests: Types.Events.SyntheticNetworkRequest[], prePaintEvents: Types.Events.PrePaint[],
    shiftsByPrePaint: Map<Types.Events.PrePaint, Types.Events.LayoutShift[]>,
    rootCausesByShift: Map<Types.Events.LayoutShift, LayoutShiftRootCausesData>):
    Map<Types.Events.LayoutShift, LayoutShiftRootCausesData> {
  const fontRequests =
      networkRequests.filter(req => req.args.data.resourceType === 'Font' && req.args.data.mimeType.startsWith('font'));

  for (const req of fontRequests) {
    const nextPrePaint = getNextPrePaintEvent(prePaintEvents, req);
    if (!nextPrePaint) {
      continue;
    }

    // If the req is outside the INVALIDATION_WINDOW, it could not be a root cause.
    if (!isInInvalidationWindow(req, nextPrePaint)) {
      continue;
    }

    // Get the shifts that belong to this prepaint
    const shifts = shiftsByPrePaint.get(nextPrePaint);

    // if no layout shift(s) in this prePaint, the request is not a root cause.
    if (!shifts) {
      continue;
    }
    // Include the root cause to the shifts in this prePaint.
    for (const shift of shifts) {
      const rootCausesForShift = Platform.MapUtilities.getWithDefault(rootCausesByShift, shift, () => {
        return {
          iframeIds: [],
          fontRequests: [],
        };
      });
      rootCausesForShift.fontRequests.push(req);
    }
  }
  return rootCausesByShift;
}

export function generateInsight(parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): CLSInsightResult {
  // TODO(crbug.com/366049346): won't work without nav right now. See comment on clusterKey below.
  if (!context.navigation) {
    return {
      clusters: [],
    };
  }

  const isWithinContext = (event: Types.Events.Event): boolean => Helpers.Timing.eventIsInBounds(event, context.bounds);

  const compositeAnimationEvents = parsedTrace.Animations.animations.filter(isWithinContext);
  const animationFailures = compositeAnimationEvents.map(getNonCompositedFailure).flat();

  const iframeEvents = parsedTrace.LayoutShifts.renderFrameImplCreateChildFrameEvents.filter(isWithinContext);
  const networkRequests = parsedTrace.NetworkRequests.byTime.filter(isWithinContext);

  const domLoadingEvents = parsedTrace.LayoutShifts.domLoadingEvents.filter(isWithinContext);

  // Sort by cumulative score, since for insights we interpret these for their "bad" scores.
  // TODO(crbug.com/366049346): buildLayoutShiftsClusters is dropping non-nav clusters.
  const clusterKey = context.navigation ? context.navigationId : '';
  const clusters = parsedTrace.LayoutShifts.clustersByNavigationId.get(clusterKey)
                       ?.sort((a, b) => b.clusterCumulativeScore - a.clusterCumulativeScore) ??
      [];
  const layoutShifts = clusters.flatMap(cluster => cluster.events);
  const prePaintEvents = parsedTrace.LayoutShifts.prePaintEvents.filter(isWithinContext);

  // Get root causes.
  const rootCausesByShift = new Map<Types.Events.LayoutShift, LayoutShiftRootCausesData>();
  const shiftsByPrePaint = getShiftsByPrePaintEvents(layoutShifts, prePaintEvents);

  for (const shift of layoutShifts) {
    rootCausesByShift.set(shift, {iframeIds: [], fontRequests: []});
  }

  getIframeRootCauses(iframeEvents, prePaintEvents, shiftsByPrePaint, rootCausesByShift, domLoadingEvents);
  getFontRootCauses(networkRequests, prePaintEvents, shiftsByPrePaint, rootCausesByShift);

  return {
    animationFailures,
    shifts: rootCausesByShift,
    clusters,
  };
}
