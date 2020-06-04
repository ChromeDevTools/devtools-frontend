// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {!Date} date
 * @return {boolean}
 */
export const isValid = date => {
  return !isNaN(date.getTime());
};

/**
 * @param {!Date} date
 * @return {string}
 */
export const toISO8601Compact = date => {
  /**
   * @param {number} x
   * @return {string}
   */
  function leadZero(x) {
    return (x > 9 ? '' : '0') + x;
  }
  return date.getFullYear() + leadZero(date.getMonth() + 1) + leadZero(date.getDate()) + 'T' +
      leadZero(date.getHours()) + leadZero(date.getMinutes()) + leadZero(date.getSeconds());
};
