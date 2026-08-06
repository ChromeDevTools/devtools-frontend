// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { CalibratedMidTierMobileThrottlingOption, MidTierThrottlingOption, } from './CPUThrottlingOption.js';
/**
 * Computes the recommended CPU and network throttling presets based on CrUX
 * field metric data.
 */
export function getThrottlingRecommendations() {
    let cpuOption = CalibratedMidTierMobileThrottlingOption;
    if (cpuOption.rate() === 0) {
        cpuOption = MidTierThrottlingOption;
    }
    return {
        cpuOption,
    };
}
//# sourceMappingURL=ThrottlingUtils.js.map