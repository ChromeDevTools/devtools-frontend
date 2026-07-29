// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../common/common.js';
export const jsSourceMapsEnabledSettingDescriptor = {
    name: 'js-source-maps-enabled',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const cssSourceMapsEnabledSettingDescriptor = {
    name: 'css-source-maps-enabled',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const preserveConsoleLogSettingDescriptor = {
    name: 'preserve-console-log',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const pauseOnExceptionEnabledSettingDescriptor = {
    name: 'pause-on-exception-enabled',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
};
export const pauseOnCaughtExceptionSettingDescriptor = {
    name: 'pause-on-caught-exception',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
};
//# sourceMappingURL=SDKSettings.js.map