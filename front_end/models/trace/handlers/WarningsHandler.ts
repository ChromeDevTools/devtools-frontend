// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

export interface WarningsData {
  // Tracks warnings keyed by the event.
  perEvent: Map<Types.TraceEvents.TraceEventData, Warning[]>;
  // The same data in reverse: for each type of warning, track the events.
  // Useful if we need to enumerate issues by type of issue
  perWarning: Map<Warning, Types.TraceEvents.TraceEventData[]>;
}

export type Warning = 'LONG_TASK'|'IDLE_CALLBACK_OVER_TIME'|'FORCED_LAYOUT'|'FORCED_STYLE';

const warningsPerEvent: WarningsData['perEvent'] = new Map();
const eventsPerWarning: WarningsData['perWarning'] = new Map();

const FORCED_LAYOUT_AND_STYLES_THRESHOLD = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(10));

export function reset(): void {
  warningsPerEvent.clear();
  eventsPerWarning.clear();
}

function storeWarning(event: Types.TraceEvents.TraceEventData, warning: Warning): void {
  const existingWarnings = Platform.MapUtilities.getWithDefault(warningsPerEvent, event, () => []);
  existingWarnings.push(warning);
  warningsPerEvent.set(event, existingWarnings);

  const existingEvents = Platform.MapUtilities.getWithDefault(eventsPerWarning, warning, () => []);
  existingEvents.push(event);
  eventsPerWarning.set(warning, existingEvents);
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (event.name === Types.TraceEvents.KnownEventName.RunTask) {
    const longTaskThreshold = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(50));
    const {duration} = Helpers.Timing.eventTimingsMicroSeconds(event);
    if (duration > longTaskThreshold) {
      storeWarning(event, 'LONG_TASK');
    }
    return;
  }

  if (Types.TraceEvents.isTraceEventFireIdleCallback(event)) {
    const {duration} = Helpers.Timing.eventTimingsMilliSeconds(event);
    if (duration > event.args.data.allottedMilliseconds) {
      storeWarning(event, 'IDLE_CALLBACK_OVER_TIME');
    }
    return;
  }

  if (event.name === Types.TraceEvents.KnownEventName.Layout) {
    if (event.dur && event.dur >= FORCED_LAYOUT_AND_STYLES_THRESHOLD) {
      storeWarning(event, 'FORCED_LAYOUT');
    }
    return;
  }

  if (event.name === Types.TraceEvents.KnownEventName.RecalculateStyles ||
      event.name === Types.TraceEvents.KnownEventName.UpdateLayoutTree) {
    if (event.dur && event.dur >= FORCED_LAYOUT_AND_STYLES_THRESHOLD) {
      storeWarning(event, 'FORCED_STYLE');
    }
    return;
  }
}

export function data(): WarningsData {
  return {
    perEvent: new Map(warningsPerEvent),
    perWarning: new Map(eventsPerWarning),
  };
}
