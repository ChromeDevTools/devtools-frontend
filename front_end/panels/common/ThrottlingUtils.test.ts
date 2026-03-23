// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as CrUXManager from '../../models/crux-manager/crux-manager.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as PanelsCommon from './common.js';

describeWithEnvironment('ThrottlingUtils', () => {
  it('returns null when RTT data is missing', () => {
    const result = PanelsCommon.ThrottlingUtils.getRecommendedNetworkConditions(undefined);

    assert.isNull(result);
  });

  it('returns a matching preset when RTT data is available', () => {
    const result = PanelsCommon.ThrottlingUtils.getRecommendedNetworkConditions({
      percentiles: {p75: '150'},
    });

    assert.strictEqual(result, SDK.NetworkManager.Slow4GConditions);
  });

  it('returns null when RTT data is invalid or too low', () => {
    const invalidResult = PanelsCommon.ThrottlingUtils.getRecommendedNetworkConditions({
      percentiles: {p75: 'not-a-number'},
    });
    assert.isNull(invalidResult);

    const tooLowResult = PanelsCommon.ThrottlingUtils.getRecommendedNetworkConditions({
      percentiles: {p75: '10'},
    });
    assert.isNull(tooLowResult);
  });

  it('returns throttling recommendations', () => {
    sinon.stub(CrUXManager.CrUXManager.instance(), 'getSelectedFieldMetricData').returns({
      percentiles: {p75: '150'},
    });

    const result = PanelsCommon.ThrottlingUtils.getThrottlingRecommendations();

    assert.exists(result.cpuOption);
    assert.strictEqual(result.networkConditions, SDK.NetworkManager.Slow4GConditions);
  });

  it('falls back to MidTier CPU throttling when calibrated throttling is unavailable', () => {
    sinon.stub(SDK.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption, 'rate').returns(0);
    const result = PanelsCommon.ThrottlingUtils.getThrottlingRecommendations();
    assert.strictEqual(result.cpuOption, SDK.CPUThrottlingManager.MidTierThrottlingOption);
  });
});
