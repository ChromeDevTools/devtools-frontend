// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
export const networkMessagesSettingDescriptor = {
    name: 'network-messages',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const selectedContextFilterEnabledSettingDescriptor = {
    name: 'selected-context-filter-enabled',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const consoleTimestampsEnabledSettingDescriptor = {
    name: 'console-timestamps-enabled',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const consoleHistoryAutocompleteSettingDescriptor = {
    name: 'console-history-autocomplete',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
};
export const consoleAutocompleteOnEnterSettingDescriptor = {
    name: 'console-autocomplete-on-enter',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const consoleGroupSimilarSettingDescriptor = {
    name: 'console-group-similar',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const consoleShowsCorsErrorsSettingDescriptor = {
    name: 'console-shows-cors-errors',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
};
export const consoleEagerEvalSettingDescriptor = {
    name: 'console-eager-eval',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const consoleTraceExpandSettingDescriptor = {
    name: 'console-trace-expand',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
//# sourceMappingURL=ConsoleSettings.js.map