// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

/**
 * IMPORTANT!
 * See UserTimings.md in this directory for some handy documentation on
 * UserTimings and the trace events we parse currently.
 **/
let syntheticEvents: Array<Types.Events.SyntheticEventPair<Types.Events.PairableAsync>> = [];

// There are two events dispatched for performance.measure calls: one to
// represent the measured timing in the tracing clock (which we type as
// PerformanceMeasure) and another one for the call itself (which we
// type as UserTimingMeasure). The two events corresponding to the same
// call are linked together by a common trace_id. The reason two events
// are dispatched is because the first was originally added with the
// implementation of the performance.measure API and it uses an
// overridden timestamp and duration. To prevent breaking potential deps
// created since then, a second event was added instead of changing the
// params of the first.
const measureTraceByTraceId = new Map<number, Types.Events.UserTimingMeasure>();
const performanceMeasureEvents: Types.Events.PerformanceMeasure[] = [];
const performanceMarkEvents: Types.Events.PerformanceMark[] = [];

const consoleTimings: Array<Types.Events.ConsoleTimeBegin|Types.Events.ConsoleTimeEnd> = [];

let timestampEvents: Types.Events.ConsoleTimeStamp[] = [];

export interface UserTimingsData {
  /**
   * Events triggered with the performance.measure() API.
   * https://developer.mozilla.org/en-US/docs/Web/API/Performance/measure
   */
  performanceMeasures: readonly Types.Events.SyntheticUserTimingPair[];
  /**
   * Events triggered with the performance.mark() API.
   * https://developer.mozilla.org/en-US/docs/Web/API/Performance/mark
   */
  performanceMarks: readonly Types.Events.PerformanceMark[];
  /**
   * Events triggered with the console.time(), console.timeEnd() and
   * console.timeLog() API.
   * https://developer.mozilla.org/en-US/docs/Web/API/console/time
   */
  consoleTimings: readonly Types.Events.SyntheticConsoleTimingPair[];
  /**
   * Events triggered with the console.timeStamp() API
   * https://developer.mozilla.org/en-US/docs/Web/API/console/timeStamp
   */
  timestampEvents: readonly Types.Events.ConsoleTimeStamp[];
  /**
   * Events triggered to trace the call to performance.measure itself,
   * cached by trace_id.
   */
  measureTraceByTraceId: Map<number, Types.Events.UserTimingMeasure>;
}

export function reset(): void {
  syntheticEvents.length = 0;
  performanceMeasureEvents.length = 0;
  performanceMarkEvents.length = 0;
  consoleTimings.length = 0;
  timestampEvents.length = 0;
  measureTraceByTraceId.clear();
}

const resourceTimingNames = [
  'workerStart',
  'redirectStart',
  'redirectEnd',
  'fetchStart',
  'domainLookupStart',
  'domainLookupEnd',
  'connectStart',
  'connectEnd',
  'secureConnectionStart',
  'requestStart',
  'responseStart',
  'responseEnd',
];
const navTimingNames = [
  'navigationStart',
  'unloadEventStart',
  'unloadEventEnd',
  'redirectStart',
  'redirectEnd',
  'fetchStart',
  'commitNavigationEnd',
  'domainLookupStart',
  'domainLookupEnd',
  'connectStart',
  'connectEnd',
  'secureConnectionStart',
  'requestStart',
  'responseStart',
  'responseEnd',
  'domLoading',
  'domInteractive',
  'domContentLoadedEventStart',
  'domContentLoadedEventEnd',
  'domComplete',
  'loadEventStart',
  'loadEventEnd',
];
// These are events dispatched under the blink.user_timing category
// but that the user didn't add. Filter them out so that they do not
// Appear in the timings track (they still appear in the main thread
// flame chart).
const ignoredNames = [...resourceTimingNames, ...navTimingNames];

function getEventTimings(event: Types.Events.SyntheticEventPair|Types.Events.ConsoleTimeStamp):
    {start: Types.Timing.Micro, end: Types.Timing.Micro} {
  if ('dur' in event) {
    // It's a SyntheticEventPair.
    return {start: event.ts, end: Types.Timing.Micro(event.ts + (event.dur ?? 0))};
  }

  if (Types.Events.isConsoleTimeStamp(event)) {
    const {start, end} = event.args.data || {};
    if (typeof start === 'number' && typeof end === 'number') {
      return {start: Types.Timing.Micro(start), end: Types.Timing.Micro(end)};
    }
  }

  // A ConsoleTimeStamp without start/end is just a point in time, so dur is 0.
  return {start: event.ts, end: event.ts};
}

function getEventTrack(event: Types.Events.SyntheticEventPair|Types.Events.ConsoleTimeStamp): string|undefined {
  if (event.cat === 'blink.user_timing') {
    // This is a SyntheticUserTimingPair
    const detailString =
        ((event as Types.Events.SyntheticUserTimingPair).args.data.beginEvent.args as {detail?: string})?.detail;
    if (detailString) {
      const details = Helpers.Trace.parseDevtoolsDetails(detailString, 'devtools');
      if (details && 'track' in details) {
        return details.track;
      }
    }
  } else if (Types.Events.isConsoleTimeStamp(event)) {
    const track = event.args.data?.track;
    return typeof track === 'string' ? track : undefined;
  }

  // SyntheticConsoleTimingPair does not have track info.
  return undefined;
}

/**
 * Similar to the default {@see Helpers.Trace.eventTimeComparator}
 * but with a twist:
 * In case of equal start and end times, put the second event (within a
 * track) first.
 *
 * Explanation:
 * User timing entries come as trace events dispatched when
 * performance.measure/mark is called. The trace events buffered in
 * devtools frontend are sorted by the start time. If their start time
 * is the same, then the event for the first call will appear first.
 *
 * When entries are meant to be stacked, the corresponding
 * performance.measure calls usually are done in bottom-up direction:
 * calls for children first and for parent later (because the call
 * is usually done when the measured task is over). This means that
 * when two user timing events have the same start and end time, usually
 * the second event is the parent of the first. Hence the switch.
 *
 */
export function userTimingComparator<T extends Types.Events.SyntheticEventPair|Types.Events.ConsoleTimeStamp>(
    a: T, b: T, originalArray: readonly T[]): number {
  const {start: aStart, end: aEnd} = getEventTimings(a);
  const {start: bStart, end: bEnd} = getEventTimings(b);
  const timeDifference = Helpers.Trace.compareBeginAndEnd(aStart, bStart, aEnd, bEnd);
  if (timeDifference) {
    return timeDifference;
  }

  // Never re-order entries across different tracks.
  const aTrack = getEventTrack(a);
  const bTrack = getEventTrack(b);
  if (aTrack !== bTrack) {
    return 0;  // Preserve current positions.
  }

  // Prefer the event located in a further position in the original array.
  const aIndex = originalArray.indexOf(a);
  const bIndex = originalArray.indexOf(b);
  return bIndex - aIndex;
}

export function handleEvent(event: Types.Events.Event): void {
  if (ignoredNames.includes(event.name)) {
    return;
  }
  if (Types.Events.isUserTimingMeasure(event)) {
    measureTraceByTraceId.set(event.args.traceId, event);
  }
  if (Types.Events.isPerformanceMeasure(event)) {
    performanceMeasureEvents.push(event);
    return;
  }
  if (Types.Events.isPerformanceMark(event)) {
    performanceMarkEvents.push(event);
  }
  if (Types.Events.isConsoleTime(event)) {
    consoleTimings.push(event);
  }
  if (Types.Events.isConsoleTimeStamp(event)) {
    timestampEvents.push(event);
  }
}

export async function finalize(): Promise<void> {
  const asyncEvents = [...performanceMeasureEvents, ...consoleTimings];
  syntheticEvents = Helpers.Trace.createMatchedSortedSyntheticEvents(asyncEvents);
  syntheticEvents = syntheticEvents.sort((a, b) => userTimingComparator(a, b, [...syntheticEvents]));
  timestampEvents = timestampEvents.sort((a, b) => userTimingComparator(a, b, [...timestampEvents]));
}

export function data(): UserTimingsData {
  return {
    performanceMeasures: syntheticEvents.filter(e => e.cat === 'blink.user_timing') as
        Types.Events.SyntheticUserTimingPair[],
    consoleTimings: syntheticEvents.filter(e => e.cat === 'blink.console') as Types.Events.SyntheticConsoleTimingPair[],
    // TODO(crbug/41484172): UserTimingsHandler.test.ts fails if this is not copied.
    performanceMarks: [...performanceMarkEvents],
    timestampEvents: [...timestampEvents],
    measureTraceByTraceId: new Map(measureTraceByTraceId),
  };
}
