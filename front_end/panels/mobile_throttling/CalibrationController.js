// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
const UIStrings = {
    /**
     * @description Text to display to user while a calibration process is running.
     */
    runningCalibration: 'Running CPU calibration, please do not leave this tab or close DevTools.',
};
const str_ = i18n.i18n.registerUIStrings('panels/mobile_throttling/CalibrationController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * How long each iteration of the Lighthouse BenchmarkIndex benchmark runs for.
 * This benchmark runs multiple times throughout the calibration process.
 *
 * The entire calibration process has an upper-bound of running the benchmark 20 times:
 *   - 1 to "warm up" v8
 *   - 1 to check if device is powerful enough
 *   - up to 9 for each preset (uses bisect, so likely to be fewer)
 *
 * Therefore, the maximum duration for the calibration is 5 seconds.
 */
const benchmarkDurationMs = 250;
/**
 * The benchmark score of a mid-tier device (like a Pixel 5).
 */
const midScore = 1000;
/**
 * The benchmark score of a low-tier device (like a Moto G4 Power 2022).
 */
const lowScore = 264;
function truncate(n) {
    return Number(n.toFixed(2));
}
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
export class CalibrationController {
    #runtimeModel;
    #emulationModel;
    #originalUrl;
    #result;
    #state = 'idle';
    /**
     * The provided `benchmarkDuration` is how long each iteration of the Lighthouse BenchmarkIndex
     * benchmark takes to run. This benchmark will run multiple times throughout the calibration process.
     */
    async start() {
        const primaryPageTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!primaryPageTarget) {
            return false;
        }
        const runtimeModel = primaryPageTarget.model(SDK.RuntimeModel.RuntimeModel);
        const emulationModel = primaryPageTarget.model(SDK.EmulationModel.EmulationModel);
        if (!runtimeModel || !emulationModel) {
            return false;
        }
        this.#state = 'running';
        this.#runtimeModel = runtimeModel;
        this.#emulationModel = emulationModel;
        this.#originalUrl = primaryPageTarget.inspectedURL();
        function setupTestPage(text) {
            const textEl = document.createElement('span');
            textEl.textContent = text;
            document.body.append(textEl);
            document.body.style.cssText = `
        font-family: system-ui, sans-serif;
        height: 100vh;
        margin: 0;
        background-color: antiquewhite;
        font-size: 18px;
        text-align: center;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `;
            const moonEl = document.createElement('span');
            document.body.append(moonEl);
            moonEl.id = 'moon';
            moonEl.textContent = '🌑';
            moonEl.style.cssText = 'font-size: 5em';
        }
        await primaryPageTarget.pageAgent().invoke_navigate({ url: 'about:blank' });
        await runtimeModel.agent.invoke_evaluate({
            expression: `
          (${setupTestPage})(${JSON.stringify(i18nString(UIStrings.runningCalibration))});

          window.runBenchmark = () => {
            window.runs = window.runs ?? 0;
            moon.textContent = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][window.runs++ % 8];
            return (${computeBenchmarkIndex})(${benchmarkDurationMs});
          }`,
        });
        // Warm up - give v8 a change to optimize.
        await this.#benchmark();
        return true;
    }
    async #throttle(rate) {
        if (this.#state !== 'running') {
            this.#result = undefined;
            throw new Error('Calibration has been canceled');
        }
        await this.#emulationModel.setCPUThrottlingRate(rate);
    }
    async #benchmark() {
        if (this.#state !== 'running') {
            this.#result = undefined;
            throw new Error('Calibration has been canceled');
        }
        const { result } = await this.#runtimeModel.agent.invoke_evaluate({
            expression: 'runBenchmark()',
        });
        if (!Number.isFinite(result.value)) {
            let err = `unexpected score from benchmark: ${result.value}`;
            if (result.description) {
                err += `\n${result.description}`;
            }
            throw new Error(err);
        }
        return result.value;
    }
    async *iterator() {
        const controller = this;
        let isHalfwayDone = false;
        yield { progress: 0 };
        const scoreCache = new Map();
        async function run(rate) {
            const cached = scoreCache.get(rate);
            if (cached !== undefined) {
                return cached;
            }
            await controller.#throttle(rate);
            const score = await controller.#benchmark();
            scoreCache.set(rate, score);
            return score;
        }
        /**
         * Perform a binary bisect to find a CPU rate that results in the benchmark closely matching the target score.
         */
        async function* find(target, lowerRate, upperRate) {
            const lower = { rate: lowerRate, score: await run(lowerRate) };
            const upper = { rate: upperRate, score: await run(upperRate) };
            let rate = 0;
            let iterations = 0;
            const maxIterations = 8;
            while (iterations++ < maxIterations) {
                // The throttling agent backend truncates values to the hundredths place (aka 1%).
                rate = truncate((upper.rate + lower.rate) / 2);
                const score = await run(rate);
                // Within 10 points is close enough for a match.
                if (Math.abs(target - score) < 10) {
                    break;
                }
                if (score < target) {
                    upper.rate = rate;
                    upper.score = score;
                }
                else {
                    lower.rate = rate;
                    lower.score = score;
                }
                yield { progress: iterations / maxIterations / 2 + (isHalfwayDone ? 0.5 : 0) };
            }
            return truncate(rate);
        }
        this.#result = {};
        // Check if developer's device is weaker than the target devices.
        let actualScore = await run(1);
        if (actualScore < midScore) {
            // Give it one more chance ...
            scoreCache.clear();
            actualScore = await run(1);
            if (actualScore < midScore) {
                if (actualScore < lowScore) {
                    this.#result = {
                        low: SDK.CPUThrottlingManager.CalibrationError.DEVICE_TOO_WEAK,
                        mid: SDK.CPUThrottlingManager.CalibrationError.DEVICE_TOO_WEAK,
                    };
                    return;
                }
                // Can still emulate the low-end device.
                this.#result = { mid: SDK.CPUThrottlingManager.CalibrationError.DEVICE_TOO_WEAK };
                isHalfwayDone = true;
            }
        }
        const initialLowerRate = 1;
        const initialUpperRate = actualScore / lowScore * 1.5;
        const low = yield* find(lowScore, initialLowerRate, initialUpperRate);
        this.#result.low = low;
        if (!this.#result.mid) {
            isHalfwayDone = true;
            yield { progress: 0.5 };
            // "bootstrap" the bisect by using the results for the low-tier calibration.
            const midToLowRatio = midScore / lowScore;
            const r = low / midToLowRatio;
            const mid = yield* find(midScore, r - r / 4, r + r / 4);
            this.#result.mid = mid;
        }
        yield { progress: 1 };
    }
    abort() {
        if (this.#state === 'running') {
            this.#state = 'aborting';
        }
    }
    result() {
        return this.#result;
    }
    async end() {
        if (this.#state === 'idle') {
            return;
        }
        this.#state = 'idle';
        if (this.#originalUrl.startsWith('chrome://')) {
            await this.#runtimeModel.agent.invoke_evaluate({
                expression: 'history.back()',
            });
        }
        else {
            await this.#runtimeModel.agent.invoke_evaluate({
                expression: `window.location.href = ${JSON.stringify(this.#originalUrl)}`,
            });
        }
    }
}
/**
 * Lifted from Lighthouse.
 *
 * Computes a memory/CPU performance benchmark index to determine rough device class.
 * @see https://github.com/GoogleChrome/lighthouse/issues/9085
 * @see https://docs.google.com/spreadsheets/d/1E0gZwKsxegudkjJl8Fki_sOwHKpqgXwt8aBAfuUaB8A/edit?usp=sharing
 *
 * Historically (until LH 6.3), this benchmark created a string of length 100,000 in a loop, and returned
 * the number of times per second the string can be created.
 *
 * Changes to v8 in 8.6.106 changed this number and also made Chrome more variable w.r.t GC interupts.
 * This benchmark now is a hybrid of a similar GC-heavy approach to the original benchmark and an array
 * copy benchmark.
 *
 * As of Chrome m86...
 *
 *  - 1000+ is a desktop-class device, Core i3 PC, iPhone X, etc
 *  - 800+ is a high-end Android phone, Galaxy S8, low-end Chromebook, etc
 *  - 125+ is a mid-tier Android phone, Moto G4, etc
 *  - <125 is a budget Android phone, Alcatel Ideal, Galaxy J2, etc
 */
function computeBenchmarkIndex(duration = 1000) {
    const halfTime = duration / 2;
    /**
     * The GC-heavy benchmark that creates a string of length 10000 in a loop.
     * The returned index is the number of times per second the string can be created divided by 10.
     * The division by 10 is to keep similar magnitudes to an earlier version of BenchmarkIndex that
     * used a string length of 100000 instead of 10000.
     */
    function benchmarkIndexGC() {
        const start = Date.now();
        let iterations = 0;
        while (Date.now() - start < halfTime) {
            let s = '';
            for (let j = 0; j < 10000; j++) {
                s += 'a';
            }
            if (s.length === 1) {
                throw new Error('will never happen, but prevents compiler optimizations');
            }
            iterations++;
        }
        const durationInSeconds = (Date.now() - start) / 1000;
        return Math.round(iterations / 10 / durationInSeconds);
    }
    /**
     * The non-GC-dependent benchmark that copies integers back and forth between two arrays of length 100000.
     * The returned index is the number of times per second a copy can be made, divided by 10.
     * The division by 10 is to keep similar magnitudes to the GC-dependent version.
     */
    function benchmarkIndexNoGC() {
        const arrA = [];
        const arrB = [];
        for (let i = 0; i < 100000; i++) {
            arrA[i] = arrB[i] = i;
        }
        const start = Date.now();
        let iterations = 0;
        // Some Intel CPUs have a performance cliff due to unlucky JCC instruction alignment.
        // Two possible fixes: call Date.now less often, or manually unroll the inner loop a bit.
        // We'll call Date.now less and only check the duration on every 10th iteration for simplicity.
        // See https://bugs.chromium.org/p/v8/issues/detail?id=10954#c1.
        while (iterations % 10 !== 0 || Date.now() - start < halfTime) {
            const src = iterations % 2 === 0 ? arrA : arrB;
            const tgt = iterations % 2 === 0 ? arrB : arrA;
            for (let j = 0; j < src.length; j++) {
                tgt[j] = src[j];
            }
            iterations++;
        }
        const durationInSeconds = (Date.now() - start) / 1000;
        return Math.round(iterations / 10 / durationInSeconds);
    }
    // The final BenchmarkIndex is a simple average of the two components.
    return (benchmarkIndexGC() + benchmarkIndexNoGC()) / 2;
}
//# sourceMappingURL=CalibrationController.js.map