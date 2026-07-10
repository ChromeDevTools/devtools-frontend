// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Root from '../root/root.js';
import { EmulationModel } from './EmulationModel.js';
import { TargetManager } from './TargetManager.js';
export class CPUThrottlingManager extends Common.ObjectWrapper.ObjectWrapper {
    #targetManager;
    #cpuThrottlingRate;
    #hardwareConcurrency;
    #pendingMainTargetPromise;
    constructor(settings, targetManager) {
        super();
        this.#targetManager = targetManager;
        this.#cpuThrottlingRate = 1; // No throttling
    }
    initialize() {
        this.#targetManager.observeModels(EmulationModel, this);
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!Root.DevToolsContext.globalInstance().has(CPUThrottlingManager) || forceNew) {
            const manager = new CPUThrottlingManager(opts.settings ?? Common.Settings.Settings.instance(), opts.targetManager ?? TargetManager.instance());
            manager.initialize();
            Root.DevToolsContext.globalInstance().set(CPUThrottlingManager, manager);
        }
        return Root.DevToolsContext.globalInstance().get(CPUThrottlingManager);
    }
    static removeInstance() {
        Root.DevToolsContext.globalInstance().delete(CPUThrottlingManager);
    }
    cpuThrottlingRate() {
        return this.#cpuThrottlingRate;
    }
    setCPUThrottlingRate(rate) {
        if (rate === this.#cpuThrottlingRate) {
            return;
        }
        this.#cpuThrottlingRate = rate;
        for (const emulationModel of this.#targetManager.models(EmulationModel)) {
            void emulationModel.setCPUThrottlingRate(this.#cpuThrottlingRate);
        }
        this.dispatchEventToListeners("RateChanged" /* Events.RATE_CHANGED */, this.#cpuThrottlingRate);
    }
    setHardwareConcurrency(concurrency) {
        this.#hardwareConcurrency = concurrency;
        for (const emulationModel of this.#targetManager.models(EmulationModel)) {
            void emulationModel.setHardwareConcurrency(concurrency);
        }
        this.dispatchEventToListeners("HardwareConcurrencyChanged" /* Events.HARDWARE_CONCURRENCY_CHANGED */, this.#hardwareConcurrency);
    }
    hasPrimaryPageTargetSet() {
        // In some environments, such as Node, trying to check if we have a page
        // target may error. So if we get any errors here at all, assume that we do
        // not have a target.
        try {
            return this.#targetManager.primaryPageTarget() !== null;
        }
        catch {
            return false;
        }
    }
    async getHardwareConcurrency() {
        const target = this.#targetManager.primaryPageTarget();
        const existingCallback = this.#pendingMainTargetPromise;
        // If the main target hasn't attached yet, block callers until it appears.
        if (!target) {
            if (existingCallback) {
                return await new Promise(r => {
                    this.#pendingMainTargetPromise = (result) => {
                        r(result);
                        existingCallback(result);
                    };
                });
            }
            return await new Promise(r => {
                this.#pendingMainTargetPromise = r;
            });
        }
        const evalResult = await target.runtimeAgent().invoke_evaluate({ expression: 'navigator.hardwareConcurrency', returnByValue: true, silent: true, throwOnSideEffect: true });
        const error = evalResult.getError();
        if (error) {
            throw new Error(error);
        }
        const { result, exceptionDetails } = evalResult;
        if (exceptionDetails) {
            throw new Error(exceptionDetails.text);
        }
        return result.value;
    }
    modelAdded(emulationModel) {
        if (this.#cpuThrottlingRate !== 1) {
            void emulationModel.setCPUThrottlingRate(this.#cpuThrottlingRate);
        }
        if (this.#hardwareConcurrency !== undefined) {
            void emulationModel.setHardwareConcurrency(this.#hardwareConcurrency);
        }
        // If there are any callers blocked on a getHardwareConcurrency call, let's wake them now.
        if (this.#pendingMainTargetPromise) {
            const existingCallback = this.#pendingMainTargetPromise;
            this.#pendingMainTargetPromise = undefined;
            void this.getHardwareConcurrency().then(existingCallback);
        }
    }
    modelRemoved(_emulationModel) {
        // Implemented as a requirement for being a SDKModelObserver.
    }
}
//# sourceMappingURL=CPUThrottlingManager.js.map