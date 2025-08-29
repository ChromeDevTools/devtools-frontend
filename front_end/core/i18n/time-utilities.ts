// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Uses Intl.NumberFormat.
 * @see go/cpq:i18n-units-design
 */

import * as Platform from '../platform/platform.js';

import {defineFormatter, type NumberFormatter} from './NumberFormatter.js';

const narrowMillisecondsInteger = defineFormatter({
  style: 'unit',
  unit: 'millisecond',
  unitDisplay: 'narrow',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const longMilliseconds = defineFormatter({
  style: 'unit',
  unit: 'millisecond',
  unitDisplay: 'long',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const narrowMicrosecondsInteger = defineFormatter({
  style: 'unit',
  unit: 'microsecond',
  unitDisplay: 'narrow',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const narrowMillisecondsDecimal = defineFormatter({
  style: 'unit',
  unit: 'millisecond',
  unitDisplay: 'narrow',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const narrowSecondsDecimal = defineFormatter({
  style: 'unit',
  unit: 'second',
  unitDisplay: 'narrow',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const shortMinutesDecimal = defineFormatter({
  style: 'unit',
  unit: 'minute',
  unitDisplay: 'short',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const shortHoursDecimal = defineFormatter({
  style: 'unit',
  unit: 'hour',
  unitDisplay: 'short',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const longDaysDecimal = defineFormatter({
  style: 'unit',
  unit: 'day',
  unitDisplay: 'long',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatMicroSecondsTime(time: Platform.Timing.MicroSeconds): string {
  return millisToString(Platform.Timing.microSecondsToMilliSeconds(time), true);
}

export function formatMicroSecondsAsSeconds(time: Platform.Timing.MicroSeconds): string {
  const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
  const seconds = Platform.Timing.milliSecondsToSeconds(milliseconds);
  return narrowSecondsDecimal.format(seconds);
}

export function formatMicroSecondsAsMillisFixed(time: Platform.Timing.MicroSeconds): string {
  const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
  return narrowMillisecondsInteger.format(milliseconds);
}

export function formatMicroSecondsAsMillisFixedExpanded(time: Platform.Timing.MicroSeconds): string {
  const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
  return longMilliseconds.format(milliseconds);
}

/**
 * @param higherResolution if true, the output may show as microsends or as milliseconds with a fractional component
 */
export function millisToString(ms: number, higherResolution?: boolean): string {
  if (!isFinite(ms)) {
    return '-';
  }

  if (higherResolution && ms < 0.1) {
    return narrowMicrosecondsInteger.format(ms * 1000);
  }
  if (higherResolution && ms < 1000) {
    return narrowMillisecondsDecimal.format(ms);
  }
  if (ms < 1000) {
    return narrowMillisecondsInteger.format(ms);
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return narrowSecondsDecimal.format(seconds);
  }

  const minutes = seconds / 60;
  if (minutes < 60) {
    return shortMinutesDecimal.format(minutes);
  }

  const hours = minutes / 60;
  if (hours < 24) {
    return shortHoursDecimal.format(hours);
  }

  const days = hours / 24;
  return longDaysDecimal.format(days);
}

const preciseMillisToStringFormattersCache = new Map<number, NumberFormatter>();

export function preciseMillisToString(ms: number, precision = 0, separator?: string): string {
  let formatter = preciseMillisToStringFormattersCache.get(precision);
  if (!formatter) {
    formatter = defineFormatter({
      style: 'unit',
      unit: 'millisecond',
      unitDisplay: 'narrow',
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
    preciseMillisToStringFormattersCache.set(precision, formatter);
  }
  return formatter.format(ms, separator);
}

const preciseSecondsToStringFormattersCache = new Map<number, NumberFormatter>();

export function preciseSecondsToString(ms: number, precision = 0): string {
  let formatter = preciseSecondsToStringFormattersCache.get(precision);
  if (!formatter) {
    formatter = defineFormatter({
      style: 'unit',
      unit: 'second',
      unitDisplay: 'narrow',
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
    preciseSecondsToStringFormattersCache.set(precision, formatter);
  }
  return formatter.format(ms);
}

export function secondsToString(seconds: number, higherResolution?: boolean): string {
  if (!isFinite(seconds)) {
    return '-';
  }
  return millisToString(seconds * 1000, higherResolution);
}
