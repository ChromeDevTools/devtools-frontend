// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Debounce utility function, ensures that the function passed in is only called once the function stops being called and the delay has expired.
 */
export const debounce = function(
    func: (...args: any[]) => void,
    delay: number,
    ): ((...args: any[]) => void)&{
  cancel: () => void,
} {
  let timer: ReturnType<typeof setTimeout>;
  const debounced = (...args: any[]): void => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), testDebounceOverride ? 0 : delay);
  };
  debounced.cancel = () => {
    clearTimeout(timer);
  };
  return debounced;
};

let testDebounceOverride = false;
export function enableTestOverride(): void {
  testDebounceOverride = true;
}

export function disableTestOverride(): void {
  testDebounceOverride = false;
}
