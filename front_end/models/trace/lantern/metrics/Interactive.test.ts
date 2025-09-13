// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../../testing/TraceLoader.js';
import * as Lantern from '../lantern.js';
import {getComputationDataFromFixture, toLanternTrace} from '../testing/testing.js';

const {Interactive, FirstContentfulPaint, LargestContentfulPaint} = Lantern.Metrics;

describe('Metrics: Lantern TTI', function() {
  TraceLoader.setTestTimeout(this);

  let trace: Lantern.Types.Trace;
  let iframeTrace: Lantern.Types.Trace;
  before(async function() {
    trace = toLanternTrace(await TraceLoader.rawEvents(this, 'lantern/progressive-app/trace.json.gz'));
    iframeTrace = toLanternTrace(await TraceLoader.rawEvents(this, 'lantern/iframe/trace.json.gz'));
  });

  it('should compute predicted value', async () => {
    const data = await getComputationDataFromFixture(this, {trace});
    const result = Interactive.compute(data, {
      lcpResult: LargestContentfulPaint.compute(data, {
        fcpResult: FirstContentfulPaint.compute(data),
      }),
    });

    assert.deepEqual(
        {
          timing: Math.round(result.timing),
          optimistic: Math.round(result.optimisticEstimate.timeInMs),
          pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
        },
        {
          optimistic: 1107,
          pessimistic: 1134,
          timing: 1122,
        });
    assert.strictEqual(result.optimisticEstimate.nodeTimings.size, 14);
    assert.strictEqual(result.pessimisticEstimate.nodeTimings.size, 29);
    assert.isOk(result.optimisticGraph, 'should have created optimistic graph');
    assert.isOk(result.pessimisticGraph, 'should have created pessimistic graph');
  });

  it('should compute predicted value on iframes with substantial layout', async () => {
    const data = await getComputationDataFromFixture(this, {
      trace: iframeTrace,
    });
    const result = await Interactive.compute(data, {
      lcpResult: await LargestContentfulPaint.compute(data, {
        fcpResult: await FirstContentfulPaint.compute(data),
      }),
    });

    assert.deepEqual(
        {
          timing: Math.round(result.timing),
          optimistic: Math.round(result.optimisticEstimate.timeInMs),
          pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
        },
        {
          optimistic: 2372,
          pessimistic: 2386,
          timing: 2379,
        });
    assert.isOk(result.optimisticGraph, 'should have created optimistic graph');
    assert.isOk(result.pessimisticGraph, 'should have created pessimistic graph');
  });
});
