// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

declare module 'resemblejs' {
  interface ResembleComparisonResult {
    dimensionDifference: { width: number, height: number };
    rawMisMatchPercentage: number;
  }

  export function compare(file1: string, file2: string, options: {},
      cb:(err: Error, data: ResembleComparisonResult) => void): void;
}
