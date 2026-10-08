// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {TraceLoader} from '../../../../testing/TraceLoader.js';
import * as Lantern from '../lantern.js';
import {getComputationDataFromFixture} from '../testing/testing.js';

const {FirstContentfulPaint, LargestContentfulPaint} = Lantern.Metrics;

describe('Metrics: Lantern LCP', function() {
  it('should compute predicted value', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lantern/paul/trace.json.gz');
    const data = await getComputationDataFromFixture(this, {parsedTrace});
    const result = LargestContentfulPaint.compute(data, {
      fcpResult: FirstContentfulPaint.compute(data),
    });

    assert.deepEqual({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
      optimisticNodeTimings: result.optimisticEstimate.nodeTimings.size,
      pessimisticNodeTimings: result.pessimisticEstimate.nodeTimings.size,
    },
                     {
                       timing: 1066,
                       optimistic: 1066,
                       pessimistic: 1066,
                       optimisticNodeTimings: 3,
                       pessimisticNodeTimings: 3,
                     });
    assert.isOk(result.optimisticGraph, 'should have created optimistic graph');
    assert.isOk(result.pessimisticGraph, 'should have created pessimistic graph');
  });

  it('should compute LCP equal to FCP when text LCP occurs in the same frame as FCP', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-text-fcp-same-frame.json.gz');
    const data = await getComputationDataFromFixture(this, {parsedTrace});
    const fcpResult = FirstContentfulPaint.compute(data);
    const lcpResult = LargestContentfulPaint.compute(data, {fcpResult});

    assert.strictEqual(data.processedNavigation.timestamps.firstContentfulPaint,
                       data.processedNavigation.timestamps.largestContentfulPaint);
    assert.strictEqual(data.processedNavigation.largestContentfulPaintEvt?.args.data?.type, 'text');
    assert.deepEqual({
      timing: Math.round(lcpResult.timing),
      optimistic: Math.round(lcpResult.optimisticEstimate.timeInMs),
      pessimistic: Math.round(lcpResult.pessimisticEstimate.timeInMs),
      optimisticNodeTimings: lcpResult.optimisticEstimate.nodeTimings.size,
      pessimisticNodeTimings: lcpResult.pessimisticEstimate.nodeTimings.size,
    },
                     {
                       timing: Math.round(fcpResult.timing),
                       optimistic: Math.round(fcpResult.optimisticEstimate.timeInMs),
                       pessimistic: Math.round(fcpResult.pessimisticEstimate.timeInMs),
                       optimisticNodeTimings: fcpResult.optimisticEstimate.nodeTimings.size,
                       pessimisticNodeTimings: fcpResult.pessimisticEstimate.nodeTimings.size,
                     });
    assert.strictEqual(Math.round(lcpResult.timing), 1109);
  });

  it('should include image resource when image LCP occurs at the same timestamp as FCP', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lantern/render-blocking/trace.json.gz');
    const data = await getComputationDataFromFixture(this, {parsedTrace});
    const fcpResult = FirstContentfulPaint.compute(data);
    const lcpResult = LargestContentfulPaint.compute(data, {fcpResult});

    assert.strictEqual(data.processedNavigation.timestamps.firstContentfulPaint,
                       data.processedNavigation.timestamps.largestContentfulPaint);
    assert.strictEqual(data.processedNavigation.largestContentfulPaintEvt?.args.data?.type, 'image');
    assert.isAbove(lcpResult.timing, fcpResult.timing);
  });
});
