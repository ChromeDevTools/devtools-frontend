// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {!Array<T>} array
 * @param {!T} element
 * @param {boolean=} firstOnly Only remove the first occurrence of `element` from the array.
 * @return {boolean} True, if any element got removed.
 * @template T
 */
export const removeElement = (array, element, firstOnly) => {
  let index = array.indexOf(element);
  if (index === -1) {
    return false;
  }
  if (firstOnly) {
    array.splice(index, 1);
    return true;
  }
  for (let i = index + 1, n = array.length; i < n; ++i) {
    if (array[i] !== element) {
      array[index++] = array[i];
    }
  }
  array.length = index;
  return true;
};
