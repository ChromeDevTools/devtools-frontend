// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';

type PermittedObjectTypes = TimelineModel.TimelineFrameModel.TimelineFrame|TraceEngine.Legacy.Event|
                            TraceEngine.Types.TraceEvents.TraceEventData|SelectionRange;

const SelectionRangeSymbol = Symbol('SelectionRange');
export type SelectionRange = typeof SelectionRangeSymbol;

export class TimelineSelection {
  readonly startTime: TraceEngine.Types.Timing.MilliSeconds;
  readonly endTime: TraceEngine.Types.Timing.MilliSeconds;
  readonly object: PermittedObjectTypes;

  constructor(
      startTime: TraceEngine.Types.Timing.MilliSeconds, endTime: TraceEngine.Types.Timing.MilliSeconds,
      object: PermittedObjectTypes) {
    this.startTime = startTime;
    this.endTime = endTime;
    this.object = object;
  }

  static isFrameObject(object: PermittedObjectTypes): object is TimelineModel.TimelineFrameModel.TimelineFrame {
    return object instanceof TimelineModel.TimelineFrameModel.TimelineFrame;
  }

  static fromFrame(frame: TimelineModel.TimelineFrameModel.TimelineFrame): TimelineSelection {
    return new TimelineSelection(
        TraceEngine.Types.Timing.MilliSeconds(frame.startTime), TraceEngine.Types.Timing.MilliSeconds(frame.endTime),
        frame);
  }

  static isSyntheticNetworkRequestDetailsEventSelection(object: PermittedObjectTypes):
      object is TraceEngine.Types.TraceEvents.TraceEventSyntheticNetworkRequest {
    if (object instanceof TraceEngine.Legacy.Event) {
      return false;
    }
    // Sadly new trace events are just raw objects, so now we have to confirm it is a trace event by ruling everything else out.
    if (TimelineSelection.isFrameObject(object) || TimelineSelection.isRangeSelection(object)) {
      return false;
    }
    if (TraceEngine.Legacy.eventIsFromNewEngine(object)) {
      return TraceEngine.Types.TraceEvents.isSyntheticNetworkRequestDetailsEvent(object);
    }
    return false;
  }

  static isTraceEventSelection(object: PermittedObjectTypes): object is TraceEngine.Legacy.Event
      |TraceEngine.Types.TraceEvents.TraceEventData {
    if (object instanceof TraceEngine.Legacy.Event) {
      return true;
    }
    // Sadly new trace events are just raw objects, so now we have to confirm it is a trace event by ruling everything else out.
    if (TimelineSelection.isFrameObject(object) || TimelineSelection.isRangeSelection(object)) {
      return false;
    }
    // Now the network request will be handled separately, so return false here.
    if (TraceEngine.Types.TraceEvents.isSyntheticNetworkRequestDetailsEvent(object)) {
      return false;
    }
    return TraceEngine.Legacy.eventIsFromNewEngine(object);
  }

  static fromTraceEvent(event: TraceEngine.Legacy.CompatibleTraceEvent): TimelineSelection {
    const {startTime, endTime} = TraceEngine.Legacy.timesForEventInMilliseconds(event);
    return new TimelineSelection(startTime, TraceEngine.Types.Timing.MilliSeconds(endTime || (startTime + 1)), event);
  }

  static isRangeSelection(object: PermittedObjectTypes): object is SelectionRange {
    return object === SelectionRangeSymbol;
  }

  static fromRange(startTime: number, endTime: number): TimelineSelection {
    return new TimelineSelection(
        TraceEngine.Types.Timing.MilliSeconds(startTime), TraceEngine.Types.Timing.MilliSeconds(endTime),
        SelectionRangeSymbol);
  }
}
