// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
import * as CrUXManager from '../../models/crux-manager/crux-manager.js';
/**
 * Computes the recommended CPU and network throttling presets based on CrUX
 * field metric data.
 */
export function getThrottlingRecommendations() {
    const cruxManager = CrUXManager.CrUXManager.instance();
    const roundTripTimeMetricData = cruxManager.getSelectedFieldMetricData('round_trip_time');
    let cpuOption = SDK.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption;
    if (cpuOption.rate() === 0) {
        cpuOption = SDK.CPUThrottlingManager.MidTierThrottlingOption;
    }
    const networkConditions = getRecommendedNetworkConditions(roundTripTimeMetricData);
    return {
        cpuOption,
        networkConditions,
    };
}
/**
 * Computes the recommended network throttling preset based on CrUX RTT field
 * metric data. Returns null if no RTT data is available or no preset matches.
 */
export function getRecommendedNetworkConditions(roundTripTimeMetricData) {
    if (roundTripTimeMetricData?.percentiles) {
        const rtt = Number(roundTripTimeMetricData.percentiles.p75);
        return SDK.NetworkManager.getRecommendedNetworkPreset(rtt);
    }
    return null;
}
//# sourceMappingURL=ThrottlingUtils.js.map