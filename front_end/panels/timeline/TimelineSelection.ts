// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';

import {eventIsFromNewEngine, timesForEventInMilliseconds} from './EventTypeHelpers.js';

export const enum SelectionType {
  Frame = 'Frame',
  NetworkRequest = 'NetworkRequest',
  TraceEvent = 'TraceEvent',
  Range = 'Range',
}

type PermittedObjectTypes = TimelineModel.TimelineFrameModel.TimelineFrame|
                            TimelineModel.TimelineModel.NetworkRequest|SDK.TracingModel.Event|
                            TraceEngine.Types.TraceEvents.TraceEventData;

export class TimelineSelection {
  private readonly startTimeInternal: TraceEngine.Types.Timing.MilliSeconds;
  readonly endTimeInternal: TraceEngine.Types.Timing.MilliSeconds;
  // The object is null if we are using a range
  readonly #obj: PermittedObjectTypes|null;

  private constructor(
      startTime: TraceEngine.Types.Timing.MilliSeconds, endTime: TraceEngine.Types.Timing.MilliSeconds,
      object?: PermittedObjectTypes|null) {
    this.startTimeInternal = startTime;
    this.endTimeInternal = endTime;
    this.#obj = object || null;
  }

  static fromFrame(frame: TimelineModel.TimelineFrameModel.TimelineFrame): TimelineSelection {
    return new TimelineSelection(
        TraceEngine.Types.Timing.MilliSeconds(frame.startTime), TraceEngine.Types.Timing.MilliSeconds(frame.endTime),
        frame);
  }

  static fromNetworkRequest(request: TimelineModel.TimelineModel.NetworkRequest): TimelineSelection {
    return new TimelineSelection(
        TraceEngine.Types.Timing.MilliSeconds(request.startTime),
        TraceEngine.Types.Timing.MilliSeconds(request.endTime || request.startTime), request);
  }

  static fromTraceEvent(event: SDK.TracingModel.Event|TraceEngine.Types.TraceEvents.TraceEventData): TimelineSelection {
    const {startTime, endTime} = timesForEventInMilliseconds(event);
    return new TimelineSelection(startTime, TraceEngine.Types.Timing.MilliSeconds(endTime || (startTime + 1)), event);
  }

  static fromRange(startTime: number, endTime: number): TimelineSelection {
    return new TimelineSelection(
        TraceEngine.Types.Timing.MilliSeconds(startTime), TraceEngine.Types.Timing.MilliSeconds(endTime));
  }

  type(): SelectionType {
    if (!this.#obj) {
      return SelectionType.Range;
    }
    if (this.#obj instanceof TimelineModel.TimelineFrameModel.TimelineFrame) {
      return SelectionType.Frame;
    }
    if (this.#obj instanceof TimelineModel.TimelineModel.NetworkRequest) {
      // TODO: when we migrate the Network track to the new engine, we will need to rework this.
      return SelectionType.NetworkRequest;
    }

    if (this.#obj instanceof SDK.TracingModel.Event || eventIsFromNewEngine(this.#obj)) {
      return SelectionType.TraceEvent;
    }

    console.error(this.#obj);
    throw new Error('Unsupported TimelineSelection object');
  }

  object(): PermittedObjectTypes|null {
    return this.#obj;
  }

  startTime(): TraceEngine.Types.Timing.MilliSeconds {
    return this.startTimeInternal;
  }

  endTime(): TraceEngine.Types.Timing.MilliSeconds {
    return this.endTimeInternal;
  }
}
