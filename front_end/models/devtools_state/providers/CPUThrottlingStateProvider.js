// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
const NO_CPU_THROTTLING_RATE = 1;
/**
 * Owns access to `CPUThrottlingManager` for `StateManager`: lists CPU throttling state, reveals it, resets it, and
 * reports changes.
 */
export class CPUThrottlingStateProvider extends Common.ObjectWrapper.ObjectWrapper {
    #cpuThrottlingManager;
    #eventListeners;
    constructor(cpuThrottlingManager) {
        super();
        this.#cpuThrottlingManager = cpuThrottlingManager;
        this.#eventListeners = [
            this.#cpuThrottlingManager.addEventListener("RateChanged" /* SDK.CPUThrottlingManager.Events.RATE_CHANGED */, () => {
                this.dispatchEventToListeners("StateChanged" /* Events.STATE_CHANGED */, this.#toState());
            }),
        ];
    }
    allStates() {
        return [this.#toState()];
    }
    async reveal(kind) {
        if (kind === "cpu-throttling" /* StateKind.CPU_THROTTLING */) {
            await Common.Revealer.reveal(this.#cpuThrottlingManager);
        }
    }
    reset(kind) {
        if (kind === "cpu-throttling" /* StateKind.CPU_THROTTLING */ &&
            this.#cpuThrottlingManager.cpuThrottlingRate() !== NO_CPU_THROTTLING_RATE) {
            this.#cpuThrottlingManager.setCPUThrottlingRate(NO_CPU_THROTTLING_RATE);
        }
    }
    #toState() {
        const rate = this.#cpuThrottlingManager.cpuThrottlingRate();
        return {
            kind: "cpu-throttling" /* StateKind.CPU_THROTTLING */,
            value: rate,
            isDefault: rate === NO_CPU_THROTTLING_RATE,
        };
    }
    dispose() {
        Common.EventTarget.removeEventListeners(this.#eventListeners);
    }
}
//# sourceMappingURL=CPUThrottlingStateProvider.js.map