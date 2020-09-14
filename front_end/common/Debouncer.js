// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Debounce utility function, ensures that the function passed in is only called once the function stops being called and the delay has expired.
 * @param {!Function} func The function to debounce
 * @param {number} delay The time to wait before calling the function
 * @return {!Function} The debounced function
 */
export const debounce = function(func, delay) {
  let timer = 0;
  const debounced = () => {
    clearTimeout(timer);
    timer = setTimeout(() => func(), delay);
  };
  return debounced;
};
