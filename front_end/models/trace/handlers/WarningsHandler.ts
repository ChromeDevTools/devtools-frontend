// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

export interface WarningsData {
  perEvent: Map<Types.TraceEvents.TraceEventData, Warning[]>;
}

export type Warning = 'LONG_TASK';

const warningsPerEvent: WarningsData['perEvent'] = new Map();

export function reset(): void {
  warningsPerEvent.clear();
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (event.name === Types.TraceEvents.KnownEventName.RunTask) {
    const longTaskThreshold = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(50));
    const {duration} = Helpers.Timing.eventTimingsMicroSeconds(event);
    if (duration > longTaskThreshold) {
      const existingWarnings = Platform.MapUtilities.getWithDefault(warningsPerEvent, event, () => []);
      existingWarnings.push('LONG_TASK');
      warningsPerEvent.set(event, existingWarnings);
    }
  }
}

export function data(): WarningsData {
  return {
    perEvent: new Map(warningsPerEvent),
  };
}
