// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as PanelsCommon from './common.js';

describeWithEnvironment('ThrottlingUtils', () => {
  it('falls back to MidTier CPU throttling when calibrated throttling is unavailable', () => {
    sinon.stub(PanelsCommon.CPUThrottlingOption.CalibratedMidTierMobileThrottlingOption, 'rate').returns(0);
    const result = PanelsCommon.ThrottlingUtils.getThrottlingRecommendations();
    assert.strictEqual(result.cpuOption, PanelsCommon.CPUThrottlingOption.MidTierThrottlingOption);
  });
});
