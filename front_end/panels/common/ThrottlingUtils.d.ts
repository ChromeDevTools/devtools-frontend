import { type CPUThrottlingOption } from './CPUThrottlingOption.js';
export interface ThrottlingRecommendations {
    cpuOption: CPUThrottlingOption | null;
}
/**
 * Computes the recommended CPU and network throttling presets based on CrUX
 * field metric data.
 */
export declare function getThrottlingRecommendations(): ThrottlingRecommendations;
