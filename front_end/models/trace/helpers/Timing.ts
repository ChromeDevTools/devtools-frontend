// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Types from '../types/types.js';

export const millisecondsToMicroseconds = (value: Types.Timing.MilliSeconds): Types.Timing.MicroSeconds =>
    Types.Timing.MicroSeconds(value * 1000);

export const secondsToMilliseconds = (value: Types.Timing.Seconds): Types.Timing.MilliSeconds =>
    Types.Timing.MilliSeconds(value * 1000);

export const secondsToMicroseconds = (value: Types.Timing.Seconds): Types.Timing.MicroSeconds =>
    millisecondsToMicroseconds(secondsToMilliseconds(value));

export const microSecondsToMilliseconds = (value: Types.Timing.MicroSeconds): Types.Timing.MilliSeconds =>
    Types.Timing.MilliSeconds(value / 1000);

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
  return new Intl.NumberFormat(navigator.language, key ? JSON.parse(key) : {});
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
