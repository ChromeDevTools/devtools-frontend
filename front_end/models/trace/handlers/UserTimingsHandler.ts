// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

/**
 * IMPORTANT!
 * See UserTimings.md in this directory for some handy documentation on
 * UserTimings and the trace events we parse currently.
 **/
const syntheticEvents: Types.TraceEvents.SyntheticNestableAsyncEvent[] = [];
const performanceMeasureEvents: (Types.TraceEvents.TraceEventPerformanceMeasureBegin|
                                 Types.TraceEvents.TraceEventPerformanceMeasureEnd)[] = [];
const performanceMarkEvents: Types.TraceEvents.TraceEventPerformanceMark[] = [];

const consoleTimings: (Types.TraceEvents.TraceEventConsoleTimeBegin|Types.TraceEvents.TraceEventConsoleTimeEnd)[] = [];

const timestampEvents: Types.TraceEvents.TraceEventTimeStamp[] = [];

export interface UserTimingsData {
  /**
   * Events triggered with the performance.measure() API.
   * https://developer.mozilla.org/en-US/docs/Web/API/Performance/measure
   */
  performanceMeasures: readonly Types.TraceEvents.SyntheticNestableAsyncEvent[];
  /**
   * Events triggered with the performance.mark() API.
   * https://developer.mozilla.org/en-US/docs/Web/API/Performance/mark
   */
  performanceMarks: readonly Types.TraceEvents.TraceEventPerformanceMark[];
  /**
   * Events triggered with the console.time(), console.timeEnd() and
   * console.timeLog() API.
   * https://developer.mozilla.org/en-US/docs/Web/API/console/time
   */
  consoleTimings: readonly Types.TraceEvents.SyntheticNestableAsyncEvent[];
  /**
   * Events triggered with the console.timeStamp() API
   * https://developer.mozilla.org/en-US/docs/Web/API/console/timeStamp
   */
  timestampEvents: readonly Types.TraceEvents.TraceEventTimeStamp[];
}
let handlerState = HandlerState.UNINITIALIZED;

export function reset(): void {
  syntheticEvents.length = 0;
  performanceMeasureEvents.length = 0;
  performanceMarkEvents.length = 0;
  consoleTimings.length = 0;
  timestampEvents.length = 0;
  handlerState = HandlerState.INITIALIZED;
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

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('UserTimings handler is not initialized');
  }

  // These are events dispatched under the blink.user_timing category
  // but that the user didn't add. Filter them out so that they do not
  // Appear in the timings track (they still appear in the main thread
  // flame chart).
  const ignoredNames = [...resourceTimingNames, ...navTimingNames];
  if (ignoredNames.includes(event.name)) {
    return;
  }

  if (Types.TraceEvents.isTraceEventPerformanceMeasure(event)) {
    performanceMeasureEvents.push(event);
    return;
  }
  if (Types.TraceEvents.isTraceEventPerformanceMark(event)) {
    performanceMarkEvents.push(event);
  }
  if (Types.TraceEvents.isTraceEventConsoleTime(event)) {
    consoleTimings.push(event);
  }
  if (Types.TraceEvents.isTraceEventTimeStamp(event)) {
    timestampEvents.push(event);
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('UserTimings handler is not initialized');
  }

  const asyncEvents = [...performanceMeasureEvents, ...consoleTimings];
  syntheticEvents.push(...Helpers.Trace.createMatchedSortedSyntheticEvents(asyncEvents));
  handlerState = HandlerState.FINALIZED;
}

export function data(): UserTimingsData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('UserTimings handler is not finalized');
  }

  return {
    performanceMeasures: syntheticEvents.filter(Types.TraceEvents.isTraceEventPerformanceMeasure),
    consoleTimings: syntheticEvents.filter(Types.TraceEvents.isTraceEventConsoleTime),
    performanceMarks: [...performanceMarkEvents],
    timestampEvents: [...timestampEvents],
  };
}
