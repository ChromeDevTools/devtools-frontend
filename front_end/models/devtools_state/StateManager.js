// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
/**
 * The single place to read, reveal, reset, and listen to changes of the DevTools state. It delegates to providers so
 * callers do not depend on the parts of DevTools that own the underlying state.
 */
export class StateManager extends Common.ObjectWrapper.ObjectWrapper {
    #providers;
    #eventListeners;
    constructor(providers) {
        super();
        this.#providers = providers;
        this.#eventListeners = providers.map(provider => provider.addEventListener("StateChanged" /* Events.STATE_CHANGED */, event => this.dispatchEventToListeners("StateChanged" /* Events.STATE_CHANGED */, event.data)));
    }
    state(kind) {
        return this.allStates().find(state => state.kind === kind) ?? null;
    }
    allStates() {
        return this.#providers.flatMap(provider => provider.allStates());
    }
    nonDefaultStates() {
        return this.allStates().filter(state => !state.isDefault);
    }
    async reveal(kind) {
        for (const provider of this.#providers) {
            await provider.reveal(kind);
        }
    }
    reset(kind) {
        for (const provider of this.#providers) {
            provider.reset(kind);
        }
    }
    dispose() {
        Common.EventTarget.removeEventListeners(this.#eventListeners);
        for (const provider of this.#providers) {
            provider.dispose();
        }
    }
}
//# sourceMappingURL=StateManager.js.map