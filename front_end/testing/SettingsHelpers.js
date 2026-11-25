// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../core/common/common.js';
import * as SettingsUI from '../ui/settings/settings.js';
import { beforeEachWithTeardown } from './TestTeardown.js';
export function setupSettings(reset) {
    if (reset) {
        Common.Settings.resetSettings();
    }
    // Instantiate the storage.
    const storage = new Common.Settings.SettingsStorage({}, undefined, 'test');
    Common.Settings.Settings.instance({
        forceNew: reset,
        syncedStorage: storage,
        globalStorage: storage,
        localStorage: storage,
        settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
        console: new Common.Console.Console(),
    });
}
export function cleanupSettings() {
    Common.Settings.resetSettings();
    SettingsUI.SettingUIRegistration.resetSettings();
}
export function setupSettingsHooks() {
    beforeEachWithTeardown(() => setupSettings(true), cleanupSettings);
}
export function createSettingsForTest(settingRegistrations = []) {
    const storage = new Common.Settings.SettingsStorage({});
    return new Common.Settings.Settings({
        syncedStorage: storage,
        globalStorage: storage,
        localStorage: storage,
        settingRegistrations,
        console: new Common.Console.Console(),
    });
}
//# sourceMappingURL=SettingsHelpers.js.map