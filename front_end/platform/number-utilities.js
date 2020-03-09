// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
