// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';

import {SettingStorageType} from './Settings.js';

const registeredSettings: Array<SettingRegistration> = [];
const settingNameSet = new Set<string>();


export function registerSettingExtension(registration: SettingRegistration): void {
  const settingName = registration.settingName;
  if (settingNameSet.has(settingName)) {
    throw new Error(`Duplicate setting name '${settingName}'`);
  }
  settingNameSet.add(settingName);
  registeredSettings.push(registration);
}

export function getRegisteredSettings(): Array<SettingRegistration> {
  return registeredSettings.filter(
      setting =>
          Root.Runtime.Runtime.isDescriptorEnabled({experiment: setting.experiment, condition: setting.condition}));
}

export const SettingCategoryObject = {
  ELEMENTS: ls`Elements`,
  APPEARANCE: ls`Appearance`,
  SOURCES: ls`Sources`,
  NETWORK: ls`Network`,
  PERFORMANCE: ls`Performance`,
  CONSOLE: ls`Console`,
  PERSISTENCE: ls`Persistence`,
  DEBUGGER: ls`Debugger`,
  GLOBAL: ls`Global`,
  RENDERING: ls`Rendering`,
  GRID: ls`Grid`,
  MOBILE: ls`Mobile`,
  EMULATION: ls`Emulation`,
  MEMORY: ls`Memory`,
};

export type SettingCategory = typeof SettingCategoryObject[keyof typeof SettingCategoryObject];

export const SettingTypeObject = {
  ARRAY: 'array',
  REGEX: 'regex',
  ENUM: 'enum',
  BOOLEAN: 'boolean',
};

export type SettingType = typeof SettingTypeObject[keyof typeof SettingTypeObject];

export interface RegExpSettingItem {
  pattern: string;
  disabled?: boolean;
}

export interface SettingRegistration {
  category?: SettingCategory;
  order?: number;
  title?: () => Platform.UIString.LocalizedString;
  titleMac?: () => Platform.UIString.LocalizedString;
  settingName: string;
  settingType: SettingType;
  defaultValue: unknown;
  tags?: Array<() => Platform.UIString.LocalizedString>;
  isRegex?: boolean;
  options?: Array<SettingExtensionOption>;
  reloadRequired?: boolean;
  storageType?: SettingStorageType;
  userActionCondition?: string;
  experiment?: Root.Runtime.ExperimentName;
  condition?: Root.Runtime.ConditionName;
}
interface LocalizedSettingExtensionOption {
  value: boolean|string;
  title: () => Platform.UIString.LocalizedString;
  text?: () => Platform.UIString.LocalizedString;
  raw?: false;
}
interface RawSettingExtensionOption {
  value: boolean|string;
  title: () => Platform.UIString.LocalizedString;
  text?: string;
  raw: true;
}
export type SettingExtensionOption = LocalizedSettingExtensionOption|RawSettingExtensionOption;
