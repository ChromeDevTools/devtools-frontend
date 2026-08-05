// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  CalibratedMidTierMobileThrottlingOption,
  type CPUThrottlingOption,
  MidTierThrottlingOption,
} from './CPUThrottlingOption.js';

export interface ThrottlingRecommendations {
  cpuOption: CPUThrottlingOption|null;
}

/**
 * Computes the recommended CPU and network throttling presets based on CrUX
 * field metric data.
 */
export function getThrottlingRecommendations(): ThrottlingRecommendations {
  let cpuOption: CPUThrottlingOption = CalibratedMidTierMobileThrottlingOption;
  if (cpuOption.rate() === 0) {
    cpuOption = MidTierThrottlingOption;
  }

  return {
    cpuOption,
  };
}
