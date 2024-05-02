// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const clamp = (num: number, min: number, max: number): number => {
  let clampedNumber = num;
  if (num < min) {
    clampedNumber = min;
  } else if (num > max) {
    clampedNumber = max;
  }
  return clampedNumber;
};

export const mod = (m: number, n: number): number => {
  return ((m % n) + n) % n;
};

export const bytesToString = (bytes: number): string => {
  if (bytes < 1000) {
    return `${bytes.toFixed(0)}\xA0B`;
  }

  const kilobytes = bytes / 1000;
  if (kilobytes < 100) {
    return `${kilobytes.toFixed(1)}\xA0kB`;
  }
  if (kilobytes < 1000) {
    return `${kilobytes.toFixed(0)}\xA0kB`;
  }

  const megabytes = kilobytes / 1000;
  if (megabytes < 100) {
    return `${megabytes.toFixed(1)}\xA0MB`;
  }
  return `${megabytes.toFixed(0)}\xA0MB`;
};

export const toFixedIfFloating = (value: string): string => {
  if (!value || Number.isNaN(Number(value))) {
    return value;
  }
  const number = Number(value);
  return number % 1 ? number.toFixed(3) : String(number);
};

/**
 * Rounds a number (including float) down.
 */
export const floor = (value: number, precision: number = 0): number => {
  const mult = Math.pow(10, precision);
  return Math.floor(value * mult) / mult;
};

/**
 * Computes the great common divisor for two numbers.
 * If the numbers are floats, they will be rounded to an integer.
 */
export const greatestCommonDivisor = (a: number, b: number): number => {
  a = Math.round(a);
  b = Math.round(b);
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
};

const commonRatios = new Map([
  ['8∶5', '16∶10'],
]);

export const aspectRatio = (width: number, height: number): string => {
  const divisor = greatestCommonDivisor(width, height);
  if (divisor !== 0) {
    width /= divisor;
    height /= divisor;
  }
  const result = `${width}∶${height}`;
  return commonRatios.get(result) || result;
};

export const withThousandsSeparator = function(num: number): string {
  let str = String(num);
  const re = /(\d+)(\d{3})/;
  while (str.match(re)) {
    str = str.replace(re, '$1\xA0$2');
  }  // \xa0 is a non-breaking space
  return str;
};
