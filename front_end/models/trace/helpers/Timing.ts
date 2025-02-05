// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

import {getNavigationForTraceEvent} from './Trace.js';

export const milliToMicro = (value: Types.Timing.Milli): Types.Timing.Micro => Types.Timing.Micro(value * 1000);

export const secondsToMilli = (value: Types.Timing.Seconds): Types.Timing.Milli => Types.Timing.Milli(value * 1000);

export const secondsToMicro = (value: Types.Timing.Seconds): Types.Timing.Micro => milliToMicro(secondsToMilli(value));

export const microToMilli = (value: Types.Timing.Micro): Types.Timing.Milli => Types.Timing.Milli(value / 1000);

export const microToSeconds = (value: Types.Timing.Micro): Types.Timing.Seconds =>
    Types.Timing.Seconds(value / 1000 / 1000);

export function timeStampForEventAdjustedByClosestNavigation(
    event: Types.Events.Event,
    traceBounds: Types.Timing.TraceWindowMicro,
    navigationsByNavigationId: Map<string, Types.Events.NavigationStart>,
    navigationsByFrameId: Map<string, Types.Events.NavigationStart[]>,
    ): Types.Timing.Micro {
  let eventTimeStamp = event.ts - traceBounds.min;
  if (event.args?.data?.navigationId) {
    const navigationForEvent = navigationsByNavigationId.get(event.args.data.navigationId);
    if (navigationForEvent) {
      eventTimeStamp = event.ts - navigationForEvent.ts;
    }
  } else if (event.args?.data?.frame) {
    const navigationForEvent = getNavigationForTraceEvent(event, event.args.data.frame, navigationsByFrameId);
    if (navigationForEvent) {
      eventTimeStamp = event.ts - navigationForEvent.ts;
    }
  }
  return Types.Timing.Micro(eventTimeStamp);
}

// Expands the trace window by a provided percentage or, if it the expanded window is smaller than 1 millisecond, expands it to 1 millisecond.
// If the expanded window is outside of the max trace window, cut the overflowing bound to the max trace window bound.
export function expandWindowByPercentOrToOneMillisecond(
    annotationWindow: Types.Timing.TraceWindowMicro, maxTraceWindow: Types.Timing.TraceWindowMicro,
    percentage: number): Types.Timing.TraceWindowMicro {
  // Expand min and max of the window by half of the provided percentage. That way, in total, the window will be expanded by the provided percentage.
  let newMin = annotationWindow.min - annotationWindow.range * (percentage / 100) / 2;
  let newMax = annotationWindow.max + annotationWindow.range * (percentage / 100) / 2;

  if (newMax - newMin < 1_000) {
    const rangeMiddle = (annotationWindow.min + annotationWindow.max) / 2;
    newMin = rangeMiddle - 500;
    newMax = rangeMiddle + 500;
  }

  newMin = Math.max(newMin, maxTraceWindow.min);
  newMax = Math.min(newMax, maxTraceWindow.max);

  const expandedWindow: Types.Timing.TraceWindowMicro = {
    min: Types.Timing.Micro(newMin),
    max: Types.Timing.Micro(newMax),
    range: Types.Timing.Micro(newMax - newMin),
  };

  return expandedWindow;
}

export interface EventTimingsData<ValueType extends Types.Timing.Micro|Types.Timing.Milli|Types.Timing.Seconds, > {
  startTime: ValueType;
  endTime: ValueType;
  duration: ValueType;
}

export function eventTimingsMicroSeconds(event: Types.Events.Event): EventTimingsData<Types.Timing.Micro> {
  return {
    startTime: event.ts as Types.Timing.Micro,
    endTime: (event.ts + (event.dur ?? 0)) as Types.Timing.Micro,
    duration: (event.dur || 0) as Types.Timing.Micro,
  };
}
export function eventTimingsMilliSeconds(event: Types.Events.Event): EventTimingsData<Types.Timing.Milli> {
  return {
    startTime: (event.ts / 1000) as Types.Timing.Milli,
    endTime: (event.ts + (event.dur ?? 0)) / 1000 as Types.Timing.Milli,
    duration: (event.dur || 0) / 1000 as Types.Timing.Milli,
  };
}

export function traceWindowMilliSeconds(bounds: Types.Timing.TraceWindowMicro): Types.Timing.TraceWindowMilli {
  return {
    min: microToMilli(bounds.min),
    max: microToMilli(bounds.max),
    range: microToMilli(bounds.range),
  };
}

export function traceWindowMicroSecondsToMilliSeconds(bounds: Types.Timing.TraceWindowMicro):
    Types.Timing.TraceWindowMilli {
  return {
    min: microToMilli(bounds.min),
    max: microToMilli(bounds.max),
    range: microToMilli(bounds.range),
  };
}

export function traceWindowFromMilliSeconds(
    min: Types.Timing.Milli, max: Types.Timing.Milli): Types.Timing.TraceWindowMicro {
  const traceWindow: Types.Timing.TraceWindowMicro = {
    min: milliToMicro(min),
    max: milliToMicro(max),
    range: Types.Timing.Micro(milliToMicro(max) - milliToMicro(min)),
  };
  return traceWindow;
}

export function traceWindowFromMicroSeconds(
    min: Types.Timing.Micro, max: Types.Timing.Micro): Types.Timing.TraceWindowMicro {
  const traceWindow: Types.Timing.TraceWindowMicro = {
    min,
    max,
    range: Types.Timing.Micro(max - min),
  };
  return traceWindow;
}

export function traceWindowFromEvent(event: Types.Events.Event): Types.Timing.TraceWindowMicro {
  return {
    min: event.ts,
    max: Types.Timing.Micro(event.ts + (event.dur ?? 0)),
    range: event.dur ?? Types.Timing.Micro(0),
  };
}

export interface BoundsIncludeTimeRange {
  timeRange: Types.Timing.TraceWindowMicro;
  bounds: Types.Timing.TraceWindowMicro;
}

/**
 * Checks to see if the timeRange is within the bounds. By "within" we mean
 * "has any overlap":
 *         |------------------------|
 *      ==                                     no overlap (entirely before)
 *       =========                             overlap
 *            =========                        overlap
 *                             =========       overlap
 *                                     ====    no overlap (entirely after)
 *        ==============================       overlap (time range is larger than bounds)
 *         |------------------------|
 */
export function boundsIncludeTimeRange(data: BoundsIncludeTimeRange): boolean {
  const {min: visibleMin, max: visibleMax} = data.bounds;
  const {min: rangeMin, max: rangeMax} = data.timeRange;

  return visibleMin <= rangeMax && visibleMax >= rangeMin;
}

/** Checks to see if the event is within or overlaps the bounds */
export function eventIsInBounds(event: Types.Events.Event, bounds: Types.Timing.TraceWindowMicro): boolean {
  const startTime = event.ts;
  return startTime <= bounds.max && bounds.min <= (startTime + (event.dur ?? 0));
}

export function timestampIsInBounds(bounds: Types.Timing.TraceWindowMicro, timestamp: Types.Timing.Micro): boolean {
  return timestamp >= bounds.min && timestamp <= bounds.max;
}

export interface WindowFitsInsideBounds {
  window: Types.Timing.TraceWindowMicro;
  bounds: Types.Timing.TraceWindowMicro;
}

/**
 * Returns true if the window fits entirely within the bounds.
 * Note that if the window is equivalent to the bounds, that is considered to fit
 */
export function windowFitsInsideBounds(data: WindowFitsInsideBounds): boolean {
  return data.window.min >= data.bounds.min && data.window.max <= data.bounds.max;
}

export function windowsEqual(w1: Types.Timing.TraceWindowMicro, w2: Types.Timing.TraceWindowMicro): boolean {
  return w1.min === w2.min && w1.max === w2.max;
}
