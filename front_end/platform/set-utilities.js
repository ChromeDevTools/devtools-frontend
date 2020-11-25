// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {!Set<T>} set
 * @param {!Iterable<!T>} iterable
 * @template T
 */
export const addAll = function(set, iterable) {
  for (const item of iterable) {
    set.add(item);
  }
};

/**
 * @param {!Set<T>} setA
 * @param {!Set<T>} setB
 * @template T
 */
export const isEqual = function(setA, setB) {
  if (setA === setB) {
    return true;
  }
  if (setA.size !== setB.size) {
    return false;
  }
  for (const item of setA) {
    if (!setB.has(item)) {
      return false;
    }
  }
  return true;
};
