// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../../testing/TraceLoader.js';
import * as Lantern from '../lantern.js';
import {getComputationDataFromFixture, toLanternTrace} from '../testing/testing.js';

const {SpeedIndex, FirstContentfulPaint} = Lantern.Metrics;

const defaultThrottling = Lantern.Simulation.Constants.throttling.mobileSlow4G;

describe('Metrics: Lantern Speed Index', () => {
  let trace: Lantern.Types.Trace;
  before(async function() {
    trace = toLanternTrace(await TraceLoader.rawEvents(this, 'lantern/progressive-app/trace.json.gz'));
  });

  it('should compute predicted value', async () => {
    const data = await getComputationDataFromFixture({trace});
    // TODO: observedSpeedIndex is from the Speedline library, and is used for optimistic
    // mode. At the moment callers must pass the result into Lantern.
    const observedSpeedIndex = 379.04474997520487;
    const result = SpeedIndex.compute(data, {
      fcpResult: FirstContentfulPaint.compute(data),
      observedSpeedIndex,
    });

    assert.deepStrictEqual(
        {
          timing: Math.round(result.timing),
          optimistic: Math.round(result.optimisticEstimate.timeInMs),
          pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
        },
        {
          timing: 1107,
          optimistic: 379,
          pessimistic: 1122,
        });
  });

  it('should compute predicted value for different settings', async () => {
    const settings: Lantern.Types.Simulation.Settings = {
      throttlingMethod: 'simulate',
      throttling: {...defaultThrottling, rttMs: 300},
      // @ts-expect-error: not needed for test
      networkAnalysis: null,
    };
    const data = await getComputationDataFromFixture({trace, settings});
    const observedSpeedIndex = 379.04474997520487;
    const result = SpeedIndex.compute(data, {
      fcpResult: FirstContentfulPaint.compute(data),
      observedSpeedIndex,
    });

    assert.deepStrictEqual(
        {
          timing: Math.round(result.timing),
          optimistic: Math.round(result.optimisticEstimate.timeInMs),
          pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
        },
        {
          timing: 2007,
          optimistic: 379,
          pessimistic: 2022,
        });
  });

  it('should not scale coefficients at default', async () => {
    const result = SpeedIndex.getScaledCoefficients(defaultThrottling.rttMs);
    expect(result).to.deep.equal(SpeedIndex.coefficients);
  });

  it('should scale coefficients back', async () => {
    const result = SpeedIndex.getScaledCoefficients(5);
    expect(result).to.deep.equal({intercept: 0, pessimistic: 0.5, optimistic: 0.5});
  });

  it('should scale coefficients forward', async () => {
    const result = SpeedIndex.getScaledCoefficients(300);
    assert.deepStrictEqual(result, {
      intercept: 0,
      optimistic: 2.525,
      pessimistic: 0.275,
    });
  });
});
