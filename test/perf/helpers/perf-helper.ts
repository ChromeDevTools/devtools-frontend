// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const percentile = (values: number[], position: number): number => {
  if (values.length === 0) {
    return 0;
  }

  values = Array.from(values).sort((a, b) => a - b);
  const idx = Math.floor(values.length * position);
  if (values.length % 2 === 1) {
    return values[idx];
  }
  return (values[idx] + values[idx - 1]) / 2;
};

export const mean = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((prev, curr) => prev + curr, 0) / values.length;
};
