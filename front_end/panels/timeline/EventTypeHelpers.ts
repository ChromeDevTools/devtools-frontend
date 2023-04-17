// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
import * as TraceEngine from '../../models/trace/trace.js';

export interface TimesForEventMs {
  startTime: TraceEngine.Types.Timing.MilliSeconds;
  endTime: TraceEngine.Types.Timing.MilliSeconds;
  duration: TraceEngine.Types.Timing.MilliSeconds;
}

export function timesForEventInMilliseconds(event: SDK.TracingModel.Event|
                                            TraceEngine.Types.TraceEvents.TraceEventData): TimesForEventMs {
  if (event instanceof SDK.TracingModel.Event) {
    return {
      startTime: TraceEngine.Types.Timing.MilliSeconds(event.startTime),
      endTime: TraceEngine.Types.Timing.MilliSeconds(event.endTime || event.startTime),
      duration: TraceEngine.Types.Timing.MilliSeconds(event.duration || 0),
    };
  }

  return {
    startTime: TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts),
    endTime: TraceEngine.Helpers.Timing.microSecondsToMilliseconds(
        TraceEngine.Types.Timing.MicroSeconds(event.ts + (event.dur || 0))),
    duration: event.dur ? TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.dur) :
                          TraceEngine.Types.Timing.MilliSeconds(0),
  };
}
