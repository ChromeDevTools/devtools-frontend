// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
/**
 * Owns access to `MultitargetNetworkManager` for `StateManager`: lists network state,
 * reveals it, resets it, and reports changes.
 */
export class NetworkStateProvider extends Common.ObjectWrapper.ObjectWrapper {
    #networkManager;
    #eventListeners;
    #lastUserAgent;
    constructor(networkManager) {
        super();
        this.#networkManager = networkManager;
        this.#lastUserAgent = networkManager.customUserAgent();
        this.#eventListeners = [
            this.#networkManager.addEventListener("CustomUserAgentChanged" /* SDK.NetworkManager.MultitargetNetworkManager.Events.CUSTOM_USER_AGENT_CHANGED */, () => {
                const state = this.#userAgentState();
                if (state.value === this.#lastUserAgent) {
                    return;
                }
                this.#lastUserAgent = state.value;
                this.dispatchEventToListeners("StateChanged" /* Events.STATE_CHANGED */, state);
            }),
        ];
    }
    allStates() {
        return [this.#userAgentState()];
    }
    async reveal(kind) {
        if (kind === "user-agent" /* StateKind.USER_AGENT */) {
            await Common.Revealer.reveal(new SDK.NetworkManager.RevealableCustomUserAgent());
        }
    }
    reset(kind) {
        if (kind === "user-agent" /* StateKind.USER_AGENT */ && this.#networkManager.customUserAgentEnabled()) {
            this.#networkManager.setCustomUserAgentEnabled(false);
        }
    }
    #userAgentState() {
        const userAgent = this.#networkManager.customUserAgent();
        return {
            kind: "user-agent" /* StateKind.USER_AGENT */,
            value: userAgent,
            isDefault: userAgent === '',
        };
    }
    dispose() {
        Common.EventTarget.removeEventListeners(this.#eventListeners);
    }
}
//# sourceMappingURL=NetworkStateProvider.js.map