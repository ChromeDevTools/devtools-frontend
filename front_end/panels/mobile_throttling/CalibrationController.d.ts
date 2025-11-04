import * as SDK from '../../core/sdk/sdk.js';
/**
 * Runs a calibration process to determine ideal CPU throttling rates to target a low-tier and mid-tier device.
 *
 * Utilizes a benchmark from Lighthouse (LH BenchmarkIndex) to assess performance. This CPU benchmark serves as
 * a simple alias for device performance - but since results aren't exactly linear with clock speed a "bisect"
 * is run to find the ideal DevTools CPU throttling rate to receive the same results on the benchmark.
 *
 * @see go/cpq:adaptive-throttling
 * @see https://github.com/connorjclark/devtools-throttling-benchmarks/blob/main/calibrate.js
 */
export declare class CalibrationController {
    #private;
    /**
     * The provided `benchmarkDuration` is how long each iteration of the Lighthouse BenchmarkIndex
     * benchmark takes to run. This benchmark will run multiple times throughout the calibration process.
     */
    start(): Promise<boolean>;
    iterator(): AsyncGenerator<{
        progress: number;
    }, void>;
    abort(): void;
    result(): SDK.CPUThrottlingManager.CalibratedCPUThrottling | undefined;
    end(): Promise<void>;
}
