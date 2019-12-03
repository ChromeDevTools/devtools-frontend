// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function percentile(values, position) {
    if (values.length === 0) {
        return 0;
    }

    values = Array.from(values).sort();
    const idx = Math.floor(values.length * position);
    if (values.length % 2 == 1) {
        return values[idx];
    } else {
        return (values[idx] + values[idx - 1]) / 2;
    }
}

function mean(values) {
    if (values.length === 0) {
        return 0;
    }

    return values.reduce((prev, curr) => prev + curr, 0) / values.length;
}

module.exports = {
    mean,
    percentile
};
