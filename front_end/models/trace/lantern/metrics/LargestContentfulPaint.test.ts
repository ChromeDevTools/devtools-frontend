// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../../testing/TraceLoader.js';
import * as Lantern from '../lantern.js';
import {getComputationDataFromFixture, toLanternTrace} from '../testing/testing.js';

const {FirstContentfulPaint, LargestContentfulPaint} = Lantern.Metrics;

describe('Metrics: Lantern LCP', function() {
  TraceLoader.setTestTimeout(this);
  let trace: Lantern.Types.Trace;
  before(async function() {
    trace = toLanternTrace(await TraceLoader.rawEvents(this, 'lantern/paul/trace.json.gz'));
  });

  it('should compute predicted value', async () => {
    const data = await getComputationDataFromFixture(this, {trace});
    const result = LargestContentfulPaint.compute(data, {
      fcpResult: FirstContentfulPaint.compute(data),
    });

    assert.deepEqual(
        {
          timing: Math.round(result.timing),
          optimistic: Math.round(result.optimisticEstimate.timeInMs),
          pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
          optimisticNodeTimings: result.optimisticEstimate.nodeTimings.size,
          pessimisticNodeTimings: result.pessimisticEstimate.nodeTimings.size,
        },
        {
          timing: 1457,
          optimistic: 1457,
          pessimistic: 1457,
          optimisticNodeTimings: 8,
          pessimisticNodeTimings: 8,
        });
    assert.isOk(result.optimisticGraph, 'should have created optimistic graph');
    assert.isOk(result.pessimisticGraph, 'should have created pessimistic graph');
  });
});
