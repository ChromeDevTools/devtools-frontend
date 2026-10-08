// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const navigatorGroupByFolderSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'navigator-group-by-folder',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
};

export const navigatorGroupByAuthoredSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'navigator-group-by-authored',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};

export const navigatorJustMyCodeSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'navigator-just-my-code',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};

export const searchInAnonymousAndContentScriptsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'search-in-anonymous-and-content-scripts',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const autoRevealInNavigatorSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'auto-reveal-in-navigator',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const textEditorTabMovesFocusSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'text-editor-tab-moves-focus',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const textEditorAutoDetectIndentSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'text-editor-auto-detect-indent',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const textEditorAutocompletionSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'text-editor-autocompletion',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const textEditorBracketClosingSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'text-editor-bracket-closing',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const textEditorBracketMatchingSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'text-editor-bracket-matching',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
};

export const textEditorCodeFoldingSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'text-editor-code-folding',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const showWhitespacesInEditorSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'show-whitespaces-in-editor',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'original',
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const sourcesWordWrapSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'sources.word-wrap',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const inlineVariableValuesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'inline-variable-values',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
