// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
export const navigatorGroupByFolderSettingDescriptor = {
    name: 'navigator-group-by-folder',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
};
export const navigatorGroupByAuthoredSettingDescriptor = {
    name: 'navigator-group-by-authored',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
};
export const navigatorJustMyCodeSettingDescriptor = {
    name: 'navigator-just-my-code',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
};
export const searchInAnonymousAndContentScriptsSettingDescriptor = {
    name: 'search-in-anonymous-and-content-scripts',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const autoRevealInNavigatorSettingDescriptor = {
    name: 'auto-reveal-in-navigator',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const textEditorTabMovesFocusSettingDescriptor = {
    name: 'text-editor-tab-moves-focus',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const textEditorAutoDetectIndentSettingDescriptor = {
    name: 'text-editor-auto-detect-indent',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const textEditorAutocompletionSettingDescriptor = {
    name: 'text-editor-autocompletion',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const textEditorBracketClosingSettingDescriptor = {
    name: 'text-editor-bracket-closing',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const textEditorBracketMatchingSettingDescriptor = {
    name: 'text-editor-bracket-matching',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
};
export const textEditorCodeFoldingSettingDescriptor = {
    name: 'text-editor-code-folding',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const showWhitespacesInEditorSettingDescriptor = {
    name: 'show-whitespaces-in-editor',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'original',
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const sourcesWordWrapSettingDescriptor = {
    name: 'sources.word-wrap',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const inlineVariableValuesSettingDescriptor = {
    name: 'inline-variable-values',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
//# sourceMappingURL=SourcesSettings.js.map