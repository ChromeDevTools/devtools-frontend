// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
/**
 * Wrapper around a plain {@link Common.Settings.Setting} for AI features whose availability
 * can change dynamically over the lifetime of a DevTools session (e.g., due to changes in
 * AIDA availability, network connectivity, authentication, or enterprise policy).
 *
 * This wrapper listens to {@link Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED} and emits
 * {@link Events.CHANGED} when either the underlying setting value changes or when AIDA status
 * changes, allowing UI components to dynamically react without polluting the plain `Setting`
 * class with dynamic availability state.
 */
export class AiSetting extends Common.ObjectWrapper.ObjectWrapper {
    #setting;
    #descriptor;
    #hostConfigTracker;
    #settings;
    #boundOnSettingChanged = this.#onSettingChanged.bind(this);
    #boundOnAidaAvailabilityChanged = this.#onAidaAvailabilityChanged.bind(this);
    constructor(descriptor, hostConfigTracker, settings) {
        super();
        this.#descriptor = descriptor;
        this.#hostConfigTracker = hostConfigTracker;
        this.#settings = settings;
        this.#hostConfigTracker.addEventListener("aidaAvailabilityChanged" /* Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED */, this.#boundOnAidaAvailabilityChanged);
        this.#tryResolveSetting();
    }
    #tryResolveSetting() {
        const result = this.#settings.maybeResolve(this.#descriptor);
        if ('setting' in result) {
            if (this.#setting !== result.setting) {
                if (this.#setting) {
                    this.#setting.removeChangeListener(this.#boundOnSettingChanged);
                }
                this.#setting = result.setting;
                this.#setting.addChangeListener(this.#boundOnSettingChanged);
            }
        }
    }
    get unavailable() {
        const availability = this.#descriptor.isAvailable(Root.Runtime.hostConfig);
        return availability.status === 2 /* Common.Settings.SettingAvailability.UNAVAILABLE */;
    }
    get disabled() {
        const availability = this.#descriptor.isAvailable(Root.Runtime.hostConfig);
        return availability.status === 3 /* Common.Settings.SettingAvailability.DISABLED */;
    }
    get disabledReasons() {
        const availability = this.#descriptor.isAvailable(Root.Runtime.hostConfig);
        if (availability.status === 3 /* Common.Settings.SettingAvailability.DISABLED */) {
            return availability.reason;
        }
        return [];
    }
    getIfNotDisabled() {
        if (this.disabled || this.unavailable) {
            return undefined;
        }
        return this.#setting?.get();
    }
    setIfNotDisabled(value) {
        if (this.disabled || this.unavailable) {
            return;
        }
        this.#setting?.set(value);
    }
    #onSettingChanged() {
        this.dispatchEventToListeners("Changed" /* Events.CHANGED */);
    }
    #onAidaAvailabilityChanged() {
        this.#tryResolveSetting();
        this.dispatchEventToListeners("Changed" /* Events.CHANGED */);
    }
}
//# sourceMappingURL=AiSetting.js.map