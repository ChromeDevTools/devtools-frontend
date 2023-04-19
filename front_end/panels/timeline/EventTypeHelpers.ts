// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
import * as TraceEngine from '../../models/trace/trace.js';

export interface TimesForEventMs {
  startTime: TraceEngine.Types.Timing.MilliSeconds;
  endTime: TraceEngine.Types.Timing.MilliSeconds;
  selfTime: TraceEngine.Types.Timing.MilliSeconds;
  duration: TraceEngine.Types.Timing.MilliSeconds;
}

export function timesForEventInMilliseconds(event: SDK.TracingModel.Event|
                                            TraceEngine.Types.TraceEvents.TraceEventData): TimesForEventMs {
  if (event instanceof SDK.TracingModel.Event) {
    return {
      startTime: TraceEngine.Types.Timing.MilliSeconds(event.startTime),
      endTime: TraceEngine.Types.Timing.MilliSeconds(event.endTime || event.startTime),
      duration: TraceEngine.Types.Timing.MilliSeconds(event.duration || 0),
      selfTime: TraceEngine.Types.Timing.MilliSeconds(event.selfTime),
    };
  }
  const duration = event.dur ? TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.dur) :
                               TraceEngine.Types.Timing.MilliSeconds(0);
  return {
    startTime: TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts),
    endTime: TraceEngine.Helpers.Timing.microSecondsToMilliseconds(
        TraceEngine.Types.Timing.MicroSeconds(event.ts + (event.dur || 0))),
    duration: event.dur ? TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.dur) :
                          TraceEngine.Types.Timing.MilliSeconds(0),
    // TODO(crbug.com/1434599): Implement selfTime calculation for events
    // from the new engine.
    selfTime: duration,
  };
}
// Parsed categories are cached to prevent calling cat.split() multiple
// times on the same categories string.
const parsedCategories = new Map<string, Set<string>>();
export function eventHasCategory(
    event: SDK.TracingModel.Event|TraceEngine.Types.TraceEvents.TraceEventData, category: string): boolean {
  if (event instanceof SDK.TracingModel.Event) {
    return event.hasCategory(category);
  }
  let parsedCategoriesForEvent = parsedCategories.get(event.cat);
  if (!parsedCategoriesForEvent) {
    parsedCategoriesForEvent = new Set(event.cat.split(',') || []);
  }
  return parsedCategoriesForEvent.has(category);
}

export function phaseForEvent(event: SDK.TracingModel.Event|
                              TraceEngine.Types.TraceEvents.TraceEventData): TraceEngine.Types.TraceEvents.Phase {
  if (event instanceof SDK.TracingModel.Event) {
    return event.phase;
  }
  return event.ph;
}

export function threadIDForEvent(event: SDK.TracingModel.Event|
                                 TraceEngine.Types.TraceEvents.TraceEventData): TraceEngine.Types.TraceEvents.ThreadID {
  if (event instanceof SDK.TracingModel.Event) {
    return event.thread.idInternal as TraceEngine.Types.TraceEvents.ThreadID;
  }
  return event.tid;
}

export function eventIsFromNewEngine(event: SDK.TracingModel.Event|TraceEngine.Types.TraceEvents.TraceEventData|
                                     null): event is TraceEngine.Types.TraceEvents.TraceEventData {
  return event !== null && !(event instanceof SDK.TracingModel.Event);
}
