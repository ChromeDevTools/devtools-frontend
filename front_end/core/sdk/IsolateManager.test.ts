// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as SDK from './sdk.js';

describe('MemoryTrend', () => {
  it('fits the slope over a sliding window of the last maxCount samples', () => {
    const memoryTrend = new SDK.IsolateManager.MemoryTrend(4);
    assert.strictEqual(memoryTrend.count(), 0);
    assert.strictEqual(memoryTrend.fitSlope(), 0);

    const samples = [
      {timestamp: 1, heapSize: 1, count: 1, slope: 0},
      {timestamp: 2, heapSize: 2, count: 2, slope: 1},
      {timestamp: 3, heapSize: 4, count: 3, slope: 1.5},
      {timestamp: 4, heapSize: 5, count: 4, slope: 1.4},
      {timestamp: 5, heapSize: 5, count: 4, slope: 1},
      {timestamp: 6, heapSize: 4, count: 4, slope: 0},
      {timestamp: 7, heapSize: 3, count: 4, slope: -0.7},
      {timestamp: 9, heapSize: 1, count: 4, slope: -1},
    ];
    for (const {timestamp, heapSize, count, slope} of samples) {
      memoryTrend.add(heapSize, timestamp);
      assert.strictEqual(memoryTrend.count(), count, `count after (${timestamp}, ${heapSize})`);
      assert.strictEqual(memoryTrend.fitSlope(), slope, `slope after (${timestamp}, ${heapSize})`);
    }
  });
});
