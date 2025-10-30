// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * Debounce utility function, ensures that the function passed in is only called once the function stops being called and the delay has expired.
 */
export const debounce = function (func, delay) {
    let timer = 0;
    const debounced = (...args) => {
        clearTimeout(timer);
        timer = window.setTimeout(() => func(...args), delay);
    };
    return debounced;
};
//# sourceMappingURL=Debouncer.js.map