// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
const TRACKED_SETTINGS = [
    { kind: "cache-disabled" /* StateKind.CACHE_DISABLED */, descriptor: SDK.SDKSettings.cacheDisabledSettingDescriptor },
    { kind: "java-script-disabled" /* StateKind.JAVASCRIPT_DISABLED */, descriptor: SDK.SDKSettings.javaScriptDisabledSettingDescriptor },
];
const TRACKED_SETTINGS_BY_NAME = new Map(TRACKED_SETTINGS.map(entry => [entry.descriptor.name, entry]));
/**
 * Owns access to `Common.Settings` for `StateManager`: lists tracked settings, reveals them, resets them, and reports
 * changes.
 */
export class SettingsStateProvider extends Common.ObjectWrapper.ObjectWrapper {
    #settings;
    #eventListeners;
    constructor(settings) {
        super();
        this.#settings = settings;
        this.#eventListeners = [
            this.#settings.addChangeListener(event => {
                const entry = TRACKED_SETTINGS_BY_NAME.get(event.data.name);
                if (!entry) {
                    return;
                }
                this.dispatchEventToListeners("StateChanged" /* Events.STATE_CHANGED */, this.#toState(entry));
            }),
        ];
    }
    allStates() {
        return TRACKED_SETTINGS.map(entry => this.#toState(entry));
    }
    async reveal(kind) {
        for (const entry of TRACKED_SETTINGS) {
            if (entry.kind === kind) {
                await Common.Revealer.reveal(this.#settings.resolve(entry.descriptor));
            }
        }
    }
    reset(kind) {
        for (const entry of TRACKED_SETTINGS) {
            if (entry.kind === kind) {
                const setting = this.#settings.resolve(entry.descriptor);
                if (setting.get() !== setting.defaultValue) {
                    setting.set(setting.defaultValue);
                }
                return;
            }
        }
    }
    #toState(entry) {
        const setting = this.#settings.resolve(entry.descriptor);
        const value = setting.get();
        return {
            kind: entry.kind,
            value,
            isDefault: value === setting.defaultValue,
        };
    }
    dispose() {
        Common.EventTarget.removeEventListeners(this.#eventListeners);
    }
}
//# sourceMappingURL=SettingsStateProvider.js.map