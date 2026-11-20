// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
export const catPerfSettingDescriptor = {
    name: 'lighthouse.cat-perf',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const catA11ySettingDescriptor = {
    name: 'lighthouse.cat-a11y',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const catBestPracticesSettingDescriptor = {
    name: 'lighthouse.cat-best-practices',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const catSeoSettingDescriptor = {
    name: 'lighthouse.cat-seo',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const catAgenticBrowsingSettingDescriptor = {
    name: 'lighthouse.cat-agentic-browsing',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const deviceTypeSettingDescriptor = {
    name: 'lighthouse.device-type',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'mobile',
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const modeSettingDescriptor = {
    name: 'lighthouse.mode',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'navigation',
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const throttlingSettingDescriptor = {
    name: 'lighthouse.throttling',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'simulate',
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const clearStorageSettingDescriptor = {
    name: 'lighthouse.clear-storage',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const enableSamplingSettingDescriptor = {
    name: 'lighthouse.enable-sampling',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
//# sourceMappingURL=LighthouseSettings.js.map