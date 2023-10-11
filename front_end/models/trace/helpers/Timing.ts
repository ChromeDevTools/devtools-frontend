// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Types from '../types/types.js';

import {getNavigationForTraceEvent} from './Trace.js';

export const millisecondsToMicroseconds = (value: Types.Timing.MilliSeconds): Types.Timing.MicroSeconds =>
    Types.Timing.MicroSeconds(value * 1000);

export const secondsToMilliseconds = (value: Types.Timing.Seconds): Types.Timing.MilliSeconds =>
    Types.Timing.MilliSeconds(value * 1000);

export const secondsToMicroseconds = (value: Types.Timing.Seconds): Types.Timing.MicroSeconds =>
    millisecondsToMicroseconds(secondsToMilliseconds(value));

export const microSecondsToMilliseconds = (value: Types.Timing.MicroSeconds): Types.Timing.MilliSeconds =>
    Types.Timing.MilliSeconds(value / 1000);

export const microSecondsToSeconds = (value: Types.Timing.MicroSeconds): Types.Timing.Seconds =>
    Types.Timing.Seconds(value / 1000 / 1000);

export function detectBestTimeUnit(timeInMicroseconds: Types.Timing.MicroSeconds): Types.Timing.TimeUnit {
  if (timeInMicroseconds < 1000) {
    return Types.Timing.TimeUnit.MICROSECONDS;
  }

  const timeInMilliseconds = timeInMicroseconds / 1000;
  if (timeInMilliseconds < 1000) {
    return Types.Timing.TimeUnit.MILLISECONDS;
  }

  const timeInSeconds = timeInMilliseconds / 1000;
  if (timeInSeconds < 60) {
    return Types.Timing.TimeUnit.SECONDS;
  }

  return Types.Timing.TimeUnit.MINUTES;
}

interface FormatOptions extends Intl.NumberFormatOptions {
  format?: Types.Timing.TimeUnit;
}

const defaultFormatOptions = {
  style: 'unit',
  unit: 'millisecond',
  unitDisplay: 'narrow',
};

// Create a bunch of common formatters up front, so that we're not creating
// them repeatedly during rendering.
const serialize = (value: {}): string => JSON.stringify(value);
const formatterFactory = (key: string|undefined): Intl.NumberFormat => {
  // If we pass undefined as the locale, that achieves two things:
  // 1. Avoids us referencing window.navigatior to fetch the locale, which is
  //    useful given long term we would like this engine to run in NodeJS
  //    environments.
  // 2. Will cause the formatter to fallback to the locale of the system, which
  //    is likely going to be the most accurate one to use anyway.
  return new Intl.NumberFormat(undefined, key ? JSON.parse(key) : {});
};
const formatters = new Map<string, Intl.NumberFormat>();

// Microsecond Formatter.
Platform.MapUtilities.getWithDefault(formatters, serialize({style: 'decimal'}), formatterFactory);

// Millisecond Formatter
Platform.MapUtilities.getWithDefault(formatters, serialize(defaultFormatOptions), formatterFactory);

// Second Formatter
Platform.MapUtilities.getWithDefault(
    formatters, serialize({...defaultFormatOptions, unit: 'second'}), formatterFactory);

// Minute Formatter
Platform.MapUtilities.getWithDefault(
    formatters, serialize({...defaultFormatOptions, unit: 'minute'}), formatterFactory);

export function formatMicrosecondsTime(
    timeInMicroseconds: Types.Timing.MicroSeconds, opts: FormatOptions = {}): string {
  if (!opts.format) {
    opts.format = detectBestTimeUnit(timeInMicroseconds);
  }

  const timeInMilliseconds = timeInMicroseconds / 1000;
  const timeInSeconds = timeInMilliseconds / 1000;
  const formatterOpts = {...defaultFormatOptions, ...opts};

  switch (opts.format) {
    case Types.Timing.TimeUnit.MICROSECONDS: {
      const formatter =
          Platform.MapUtilities.getWithDefault(formatters, serialize({style: 'decimal'}), formatterFactory);
      return `${formatter.format(timeInMicroseconds)}μs`;
    }

    case Types.Timing.TimeUnit.MILLISECONDS: {
      const formatter = Platform.MapUtilities.getWithDefault(formatters, serialize(formatterOpts), formatterFactory);
      return formatter.format(timeInMilliseconds);
    }

    case Types.Timing.TimeUnit.SECONDS: {
      const formatter = Platform.MapUtilities.getWithDefault(
          formatters, serialize({...formatterOpts, unit: 'second'}), formatterFactory);
      return formatter.format(timeInSeconds);
    }

    default: {
      // Switch to mins & seconds.
      const minuteFormatter = Platform.MapUtilities.getWithDefault(
          formatters, serialize({...formatterOpts, unit: 'minute'}), formatterFactory);
      const secondFormatter = Platform.MapUtilities.getWithDefault(
          formatters, serialize({...formatterOpts, unit: 'second'}), formatterFactory);
      const timeInMinutes = timeInSeconds / 60;
      const [mins, divider, fraction] = minuteFormatter.formatToParts(timeInMinutes);

      let seconds = 0;
      if (divider && fraction) {
        // Convert the fraction value (a string) to the nearest second.
        seconds = Math.round(Number(`0.${fraction.value}`) * 60);
      }
      return `${minuteFormatter.format(Number(mins.value))} ${secondFormatter.format(seconds)}`;
    }
  }
}

export function timeStampForEventAdjustedByClosestNavigation(
    event: Types.TraceEvents.TraceEventData,
    traceBounds: Types.Timing.TraceWindow,
    navigationsByNavigationId: Map<string, Types.TraceEvents.TraceEventNavigationStart>,
    navigationsByFrameId: Map<string, Types.TraceEvents.TraceEventNavigationStart[]>,
    ): Types.Timing.MicroSeconds {
  let eventTimeStamp = event.ts - traceBounds.min;
  if (event.args?.data?.navigationId) {
    const navigationForEvent = navigationsByNavigationId.get(event.args.data.navigationId);
    if (navigationForEvent) {
      eventTimeStamp = event.ts - navigationForEvent.ts;
    }
  } else if (event.args?.data?.frame) {
    const navigationForEvent = getNavigationForTraceEvent(event, event.args.data.frame, navigationsByFrameId);
    if (navigationForEvent) {
      eventTimeStamp = event.ts - navigationForEvent.ts;
    }
  }
  return Types.Timing.MicroSeconds(eventTimeStamp);
}

export interface EventTimingsData<
  ValueType extends Types.Timing.MicroSeconds|Types.Timing.MilliSeconds|Types.Timing.Seconds,
> {
  startTime: ValueType;
  endTime: ValueType;
  duration: ValueType;
  selfTime: ValueType;
}

export function eventTimingsMicroSeconds(event: Types.TraceEvents.TraceEventData):
    EventTimingsData<Types.Timing.MicroSeconds> {
  return {
    startTime: event.ts,
    endTime: Types.Timing.MicroSeconds(event.ts + (event.dur || Types.Timing.MicroSeconds(0))),
    duration: Types.Timing.MicroSeconds(event.dur || 0),
    // TODO(crbug.com/1434599): Implement selfTime calculation for events
    // from the new engine.
    selfTime: Types.TraceEvents.isRendererEvent(event) ? Types.Timing.MicroSeconds(event.selfTime || 0) :
                                                         Types.Timing.MicroSeconds(event.dur || 0),
  };
}
export function eventTimingsMilliSeconds(event: Types.TraceEvents.TraceEventData):
    EventTimingsData<Types.Timing.MilliSeconds> {
  const microTimes = eventTimingsMicroSeconds(event);
  return {
    startTime: microSecondsToMilliseconds(microTimes.startTime),
    endTime: microSecondsToMilliseconds(microTimes.endTime),
    duration: microSecondsToMilliseconds(microTimes.duration),
    selfTime: microSecondsToMilliseconds(microTimes.selfTime),
  };
}
export function eventTimingsSeconds(event: Types.TraceEvents.TraceEventData): EventTimingsData<Types.Timing.Seconds> {
  const microTimes = eventTimingsMicroSeconds(event);
  return {
    startTime: microSecondsToSeconds(microTimes.startTime),
    endTime: microSecondsToSeconds(microTimes.endTime),
    duration: microSecondsToSeconds(microTimes.duration),
    selfTime: microSecondsToSeconds(microTimes.selfTime),
  };
}

export function traceWindowMilliSeconds(bounds: Types.Timing.TraceWindow): Types.Timing.TraceWindowMilliSeconds {
  return {
    min: microSecondsToMilliseconds(bounds.min),
    max: microSecondsToMilliseconds(bounds.max),
    range: microSecondsToMilliseconds(bounds.range),
  };
}

export function traceWindowMillisecondsToMicroSeconds(bounds: Types.Timing.TraceWindowMilliSeconds):
    Types.Timing.TraceWindow {
  return {
    min: millisecondsToMicroseconds(bounds.min),
    max: millisecondsToMicroseconds(bounds.max),
    range: millisecondsToMicroseconds(bounds.range),
  };
}

export function traceWindowFromMilliSeconds(
    min: Types.Timing.MilliSeconds, max: Types.Timing.MilliSeconds): Types.Timing.TraceWindow {
  const traceWindow: Types.Timing.TraceWindow = {
    min: millisecondsToMicroseconds(min),
    max: millisecondsToMicroseconds(max),
    range: millisecondsToMicroseconds(Types.Timing.MilliSeconds(max - min)),
  };
  return traceWindow;
}
