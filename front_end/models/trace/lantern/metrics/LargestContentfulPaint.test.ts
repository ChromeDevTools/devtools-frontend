// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {TraceLoader} from '../../../../testing/TraceLoader.js';
import type * as Trace from '../../trace.js';
import * as Lantern from '../lantern.js';
import {getComputationDataFromFixture} from '../testing/testing.js';

const {FirstContentfulPaint, LargestContentfulPaint} = Lantern.Metrics;

describe('Metrics: Lantern LCP', function() {
  let parsedTrace: Trace.TraceModel.ParsedTrace;
  before(async function() {
    parsedTrace =
        await TraceLoader.traceEngine(this, 'lantern/paul/trace.json.gz', undefined, {withTimelinePanel: false});
  });

  it('should compute predicted value', async () => {
    const data = await getComputationDataFromFixture(this, {parsedTrace});
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
