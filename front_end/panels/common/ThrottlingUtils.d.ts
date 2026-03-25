import * as SDK from '../../core/sdk/sdk.js';
import * as CrUXManager from '../../models/crux-manager/crux-manager.js';
export interface ThrottlingRecommendations {
    cpuOption: SDK.CPUThrottlingManager.CPUThrottlingOption | null;
    networkConditions: SDK.NetworkManager.Conditions | null;
}
/**
 * Computes the recommended CPU and network throttling presets based on CrUX
 * field metric data.
 */
export declare function getThrottlingRecommendations(): ThrottlingRecommendations;
/**
 * Computes the recommended network throttling preset based on CrUX RTT field
 * metric data. Returns null if no RTT data is available or no preset matches.
 */
export declare function getRecommendedNetworkConditions(roundTripTimeMetricData?: CrUXManager.MetricResponse): SDK.NetworkManager.Conditions | null;
