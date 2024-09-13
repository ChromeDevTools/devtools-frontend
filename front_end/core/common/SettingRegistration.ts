// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import type * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {type SettingStorageType} from './Settings.js';

const UIStrings = {
  /**
   *@description Title of the Elements Panel
   */
  elements: 'Elements',
  /**
   *@description Text for DevTools appearance
   */
  appearance: 'Appearance',
  /**
   *@description Name of the Sources panel
   */
  sources: 'Sources',
  /**
   *@description Title of the Network tool
   */
  network: 'Network',
  /**
   *@description Text for the performance of something
   */
  performance: 'Performance',
  /**
   *@description Title of the Console tool
   */
  console: 'Console',
  /**
   *@description A title of the 'Persistence' setting category
   */
  persistence: 'Persistence',
  /**
   *@description Text that refers to the debugger
   */
  debugger: 'Debugger',
  /**
   *@description Text describing global shortcuts and settings that are available throughout the DevTools
   */
  global: 'Global',
  /**
   *@description Title of the Rendering tool
   */
  rendering: 'Rendering',
  /**
   *@description Title of a section on CSS Grid tooling
   */
  grid: 'Grid',
  /**
   *@description Text for the mobile platform, as opposed to desktop
   */
  mobile: 'Mobile',
  /**
   *@description Text for the memory of the page
   */
  memory: 'Memory',
  /**
   *@description Text for the extension of the page
   */
  extension: 'Extension',
  /**
   *@description Text for the adorner of the page
   */
  adorner: 'Adorner',
  /**
   * @description Header for the "Sync" section in the settings UI. The "Sync"
   * section allows users to configure which DevTools data is synced via Chrome Sync.
   */
  sync: 'Sync',
};
const str_ = i18n.i18n.registerUIStrings('core/common/SettingRegistration.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let registeredSettings: Array<SettingRegistration> = [];
const settingNameSet = new Set<string>();

export function registerSettingExtension(registration: SettingRegistration): void {
  const settingName = registration.settingName;
  if (settingNameSet.has(settingName)) {
    throw new Error(`Duplicate setting name '${settingName}'`);
  }
  settingNameSet.add(settingName);
  registeredSettings.push(registration);
}

export function getRegisteredSettings(config: Root.Runtime.HostConfig): Array<SettingRegistration> {
  return registeredSettings.filter(
      setting => Root.Runtime.Runtime.isDescriptorEnabled(
          {experiment: setting.experiment, condition: setting.condition}, config));
}

export function registerSettingsForTest(settings: Array<SettingRegistration>, forceReset: boolean = false): void {
  if (registeredSettings.length === 0 || forceReset) {
    registeredSettings = settings;
    settingNameSet.clear();
    for (const setting of settings) {
      const settingName = setting.settingName;
      if (settingNameSet.has(settingName)) {
        throw new Error(`Duplicate setting name '${settingName}'`);
      }
      settingNameSet.add(settingName);
    }
  }
}

export function resetSettings(): void {
  registeredSettings = [];
  settingNameSet.clear();
}

export function maybeRemoveSettingExtension(settingName: string): boolean {
  const settingIndex = registeredSettings.findIndex(setting => setting.settingName === settingName);
  if (settingIndex < 0 || !settingNameSet.delete(settingName)) {
    return false;
  }
  registeredSettings.splice(settingIndex, 1);
  return true;
}

export const enum SettingCategory {
  NONE = '',  // `NONE` must be a falsy value. Legacy code uses if-checks for the category.
  ELEMENTS = 'ELEMENTS',
  APPEARANCE = 'APPEARANCE',
  SOURCES = 'SOURCES',
  NETWORK = 'NETWORK',
  PERFORMANCE = 'PERFORMANCE',
  CONSOLE = 'CONSOLE',
  PERSISTENCE = 'PERSISTENCE',
  DEBUGGER = 'DEBUGGER',
  GLOBAL = 'GLOBAL',
  RENDERING = 'RENDERING',
  GRID = 'GRID',
  MOBILE = 'MOBILE',
  EMULATION = 'EMULATION',
  MEMORY = 'MEMORY',
  EXTENSIONS = 'EXTENSIONS',
  ADORNER = 'ADORNER',
  SYNC = 'SYNC',
}

export function getLocalizedSettingsCategory(category: SettingCategory): Platform.UIString.LocalizedString {
  switch (category) {
    case SettingCategory.ELEMENTS:
      return i18nString(UIStrings.elements);
    case SettingCategory.APPEARANCE:
      return i18nString(UIStrings.appearance);
    case SettingCategory.SOURCES:
      return i18nString(UIStrings.sources);
    case SettingCategory.NETWORK:
      return i18nString(UIStrings.network);
    case SettingCategory.PERFORMANCE:
      return i18nString(UIStrings.performance);
    case SettingCategory.CONSOLE:
      return i18nString(UIStrings.console);
    case SettingCategory.PERSISTENCE:
      return i18nString(UIStrings.persistence);
    case SettingCategory.DEBUGGER:
      return i18nString(UIStrings.debugger);
    case SettingCategory.GLOBAL:
      return i18nString(UIStrings.global);
    case SettingCategory.RENDERING:
      return i18nString(UIStrings.rendering);
    case SettingCategory.GRID:
      return i18nString(UIStrings.grid);
    case SettingCategory.MOBILE:
      return i18nString(UIStrings.mobile);
    case SettingCategory.EMULATION:
      return i18nString(UIStrings.console);
    case SettingCategory.MEMORY:
      return i18nString(UIStrings.memory);
    case SettingCategory.EXTENSIONS:
      return i18nString(UIStrings.extension);
    case SettingCategory.ADORNER:
      return i18nString(UIStrings.adorner);
    case SettingCategory.NONE:
      return i18n.i18n.lockedString('');
    case SettingCategory.SYNC:
      return i18nString(UIStrings.sync);
  }
}

export const enum SettingType {
  ARRAY = 'array',
  REGEX = 'regex',
  ENUM = 'enum',
  BOOLEAN = 'boolean',
}

export interface RegExpSettingItem {
  /**
   * A regular expression matched against URLs for ignore listing.
   */
  pattern: string;
  /**
   * If true, ignore this rule.
   */
  disabled?: boolean;
  /**
   * When a rule is disabled due to requesting through a script's context menu
   * that it no longer be ignore listed, this field is set to the URL of that
   * script, so that if the user requests through the same context menu to
   * enable ignore listing, the rule can be reenabled.
   */
  disabledForUrl?: Platform.DevToolsPath.UrlString;
}

export interface SettingRegistration {
  /**
   * The category with which the setting is displayed in the UI.
   */
  category?: SettingCategory;
  /**
   * Used to sort on screen the settings that belong to the same category.
   */
  order?: number;
  /**
   * The title with which the setting is shown on screen.
   */
  title?: () => Platform.UIString.LocalizedString;
  /**
   * The identifier of the setting.
   */
  settingName: string;
  /**
   * Determines how the possible values of the setting are expressed.
   *
   * - If the setting can only be enabled and disabled use BOOLEAN
   * - If the setting has a list of possible values use ENUM
   * - If each setting value is a set of objects use ARRAY
   * - If the setting value is a regular expression use REGEX
   */
  settingType: SettingType;
  /**
   * The value set by default to the setting.
   */
  defaultValue: unknown;
  /**
   * Words used to find a setting in the Command Menu.
   */
  tags?: Array<() => Platform.UIString.LocalizedString>;
  /**
   * The possible values the setting can have, each with a description composed of a title and an optional text.
   */
  options?: Array<SettingExtensionOption>;
  /**
   * Whether DevTools must be reloaded for a change in the setting to take effect.
   */
  reloadRequired?: boolean;
  /**
   * Determines if the setting value is stored in the global, local or session storage.
   */
  storageType?: SettingStorageType;
  /**
   * A condition that, when present in the queryParamsObject of Runtime, constraints the value
   * of the setting to be changed only if the user set it.
   */
  userActionCondition?: string;
  /**
   * The name of the experiment a setting is associated with. Enabling and disabling the declared
   * experiment will enable and disable the setting respectively.
   */
  experiment?: Root.Runtime.ExperimentName;
  /**
   * A condition is a function that will make the setting available if it
   * returns true, and not available, otherwise. Make sure that objects you
   * access from inside the condition function are ready at the time when the
   * setting conditions are checked.
   */
  condition?: Root.Runtime.Condition;

  /**
   * A function that returns true if the setting should be disabled, along with
   * the reason why.
   */
  disabledCondition?: (config?: Root.Runtime.HostConfig) => DisabledConditionResult;

  /**
   * If a setting is deprecated, define this notice to show an appropriate warning according to the `warning` property.
   * If `disabled` is set, the setting will be disabled in the settings UI. In that case, `experiment` optionally can be
   * set to link to an experiment (by experiment name). The information icon in the settings UI can then be clicked to
   * jump to the experiment. If a setting is not disabled, the experiment entry will be ignored.
   */
  deprecationNotice?: {disabled: boolean, warning: () => Platform.UIString.LocalizedString, experiment?: string};

  /**
   * Optional information to learn more about the setting. If provided, a `(?)` icon will show next to the setting
   * in the Settings panel with a link to learn more, and the `tooltip` will be presented to the user when hovering
   * the `(?)` icon.
   */
  learnMore?: LearnMore;
}

/**
 * Metadata to learn more about a setting. The `url` will be used to construct
 * a `(?)` icon link and the `tooltip` will be shown when hovering the icon.
 */
export interface LearnMore {
  tooltip: () => Platform.UIString.LocalizedString;
  url: Platform.DevToolsPath.UrlString;
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
  /**
   * Text used to describe the option. Must be localized if 'raw' is false.
   */
  text?: string;
  raw: true;
}
export type SettingExtensionOption = LocalizedSettingExtensionOption|RawSettingExtensionOption;
export type DisabledConditionResult = {
  disabled: true,
  reason: string,
}|{disabled: false};
