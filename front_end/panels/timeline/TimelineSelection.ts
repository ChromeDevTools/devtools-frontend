// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';

type PermittedObjectTypes =
    TraceEngine.Handlers.ModelHandlers.Frames.TimelineFrame|TraceEngine.Types.TraceEvents.TraceEventData|SelectionRange;

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

  static isFrameObject(object: PermittedObjectTypes):
      object is TraceEngine.Handlers.ModelHandlers.Frames.TimelineFrame {
    return object instanceof TraceEngine.Handlers.ModelHandlers.Frames.TimelineFrame;
  }

  static fromFrame(frame: TraceEngine.Handlers.ModelHandlers.Frames.TimelineFrame): TimelineSelection {
    return new TimelineSelection(
        TraceEngine.Helpers.Timing.microSecondsToMilliseconds(frame.startTime),
        TraceEngine.Helpers.Timing.microSecondsToMilliseconds(frame.endTime), frame);
  }

  static isSyntheticNetworkRequestDetailsEventSelection(object: PermittedObjectTypes):
      object is TraceEngine.Types.TraceEvents.SyntheticNetworkRequest {
    if (TimelineSelection.isFrameObject(object) || TimelineSelection.isRangeSelection(object)) {
      return false;
    }
    // At this point we know the selection is a raw trace event, so we just
    // need to check it's the right type of raw event.
    return TraceEngine.Types.TraceEvents.isSyntheticNetworkRequestEvent(object);
  }

  static isNetworkEventSelection(object: PermittedObjectTypes):
      object is TraceEngine.Types.TraceEvents.SyntheticNetworkRequest|TraceEngine.Types.TraceEvents.WebSocketEvent {
    if (TimelineSelection.isFrameObject(object) || TimelineSelection.isRangeSelection(object)) {
      return false;
    }
    // At this point we know the selection is a raw trace event, so we just
    // need to check it's the right type of raw event.
    return TraceEngine.Types.TraceEvents.isNetworkTrackEntry(object);
  }

  static isTraceEventSelection(object: PermittedObjectTypes): object is TraceEngine.Types.TraceEvents.TraceEventData {
    // Trace events are just raw objects, so now we have to confirm it is a trace event by ruling everything else out.
    if (TimelineSelection.isFrameObject(object) || TimelineSelection.isRangeSelection(object)) {
      return false;
    }

    // Although Network Requests are trace events, in TimelineSelection we
    // treat Network requests distinctly
    if (TraceEngine.Types.TraceEvents.isSyntheticNetworkRequestEvent(object)) {
      return false;
    }
    return true;
  }

  static fromTraceEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): TimelineSelection {
    const {startTime, endTime} = TraceEngine.Helpers.Timing.eventTimingsMilliSeconds(event);
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
