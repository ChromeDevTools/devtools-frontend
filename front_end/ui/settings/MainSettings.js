// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
export const uiThemeSettingDescriptor = {
    name: 'ui-theme',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'systemPreferred',
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const chromeThemeColorsSettingDescriptor = {
    name: 'chrome-theme-colors',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const sidebarPositionSettingDescriptor = {
    name: 'sidebar-position',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'auto',
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const languageSettingDescriptor = {
    name: 'language',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'en-US',
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
//# sourceMappingURL=MainSettings.js.map