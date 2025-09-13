// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as Trace from '../../models/trace/trace.js';

// We could add a `type` field here to distinguish them, but it is not needed
// as we use the existence of "event" or "bounds" to do that.
export interface EventSelection {
  event: Trace.Types.Events.Event;
}

export interface TimeRangeSelection {
  bounds: Trace.Types.Timing.TraceWindowMicro;
}

export type TimelineSelection = EventSelection|TimeRangeSelection;

export function selectionFromEvent(event: Trace.Types.Events.Event): EventSelection {
  return {
    event,
  };
}

export function selectionFromRangeMicroSeconds(
    min: Trace.Types.Timing.Micro, max: Trace.Types.Timing.Micro): TimeRangeSelection {
  return {
    bounds: Trace.Helpers.Timing.traceWindowFromMicroSeconds(min, max),
  };
}

export function selectionFromRangeMilliSeconds(
    min: Trace.Types.Timing.Milli, max: Trace.Types.Timing.Milli): TimeRangeSelection {
  return {
    bounds: Trace.Helpers.Timing.traceWindowFromMilliSeconds(min, max),
  };
}

export function selectionIsEvent(selection: TimelineSelection|null): selection is EventSelection {
  return Boolean(selection && 'event' in selection);
}

export function selectionIsRange(selection: TimelineSelection|null): selection is TimeRangeSelection {
  return Boolean(selection && 'bounds' in selection);
}

export function rangeForSelection(selection: TimelineSelection): Trace.Types.Timing.TraceWindowMicro {
  if (selectionIsRange(selection)) {
    return selection.bounds;
  }

  if (selectionIsEvent(selection)) {
    const timings = Trace.Helpers.Timing.eventTimingsMicroSeconds(selection.event);
    return Trace.Helpers.Timing.traceWindowFromMicroSeconds(timings.startTime, timings.endTime);
  }
  Platform.assertNever(selection, 'Unknown selection type');
}

export function selectionsEqual(s1: TimelineSelection, s2: TimelineSelection): boolean {
  if (selectionIsEvent(s1) && selectionIsEvent(s2)) {
    return s1.event === s2.event;
  }

  if (selectionIsRange(s1) && selectionIsRange(s2)) {
    return Trace.Helpers.Timing.windowsEqual(s1.bounds, s2.bounds);
  }

  return false;
}
