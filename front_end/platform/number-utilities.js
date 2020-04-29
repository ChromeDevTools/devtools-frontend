// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {UIString} from './UIString.js';

/**
 * @param {number} num
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
export const clamp = (num, min, max) => {
  let clampedNumber = num;
  if (num < min) {
    clampedNumber = min;
  } else if (num > max) {
    clampedNumber = max;
  }
  return clampedNumber;
};

/**
 * @param {number} m
 * @param {number} n
 * @return {number}
 */
export const mod = (m, n) => {
  return ((m % n) + n) % n;
};

/**
 * @param {number} bytes
 * @return {string}
 */
export const bytesToString = bytes => {
  if (bytes < 1000) {
    return UIString('%.0f\xA0B', bytes);
  }

  const kilobytes = bytes / 1000;
  if (kilobytes < 100) {
    return UIString('%.1f\xA0kB', kilobytes);
  }
  if (kilobytes < 1000) {
    return UIString('%.0f\xA0kB', kilobytes);
  }

  const megabytes = kilobytes / 1000;
  if (megabytes < 100) {
    return UIString('%.1f\xA0MB', megabytes);
  }
  return UIString('%.0f\xA0MB', megabytes);
};
