// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import type * as Platform from '../platform/platform.js';

const UIStrings = {
  /**
   * @description Title of the Elements panel.
   */
  elements: 'Elements',
  /**
   * @description Text for DevTools AI.
   */
  ai: 'AI',
  /**
   * @description Text for DevTools appearance.
   */
  appearance: 'Appearance',
  /**
   * @description Title of the Sources panel.
   */
  sources: 'Sources',
  /**
   * @description Title of the Network panel.
   */
  network: 'Network',
  /**
   * @description Title of the Performance panel.
   */
  performance: 'Performance',
  /**
   * @description Title of the Console panel.
   */
  console: 'Console',
  /**
   * @description Title of the Persistence setting category.
   */
  persistence: 'Persistence',
  /**
   * @description Title of the Debugger setting category.
   */
  debugger: 'Debugger',
  /**
   * @description Title of the Global setting category for shortcuts and settings available throughout DevTools.
   */
  global: 'Global',
  /**
   * @description Title of the Rendering tool.
   */
  rendering: 'Rendering',
  /**
   * @description Title of the Grid setting category for CSS Grid tooling.
   */
  grid: 'Grid',
  /**
   * @description Title of the Mobile setting category.
   */
  mobile: 'Mobile',
  /**
   * @description Title of the Memory panel setting category.
   */
  memory: 'Memory',
  /**
   * @description Title of the Extension setting category.
   */
  extension: 'Extension',
  /**
   * @description Title of the Adorner setting category.
   */
  adorner: 'Adorner',
  /**
   * @description Header for the Account section in the settings UI. The Account
   * section allows users to see their signed-in account and configure which DevTools data is synced via Chrome Sync.
   */
  account: 'Account',
} as const;
const str_ = i18n.i18n.registerUIStrings('core/common/SettingRegistration.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum SettingCategory {
  NONE = '',  // `NONE` must be a falsy value. Legacy code uses if-checks for the category.
  ELEMENTS = 'ELEMENTS',
  AI = 'AI',
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
  ACCOUNT = 'ACCOUNT',
}

export function getLocalizedSettingsCategory(category: SettingCategory): Platform.UIString.LocalizedString {
  switch (category) {
    case SettingCategory.ELEMENTS:
      return i18nString(UIStrings.elements);
    case SettingCategory.AI:
      return i18nString(UIStrings.ai);
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
    case SettingCategory.ACCOUNT:
      return i18nString(UIStrings.account);
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

/**
 * Optional information to learn more about the setting.
 *
 * If tooltip is provided creates a (i) icon with rich tooltip with said tooltip
 *
 * If url is provided creates a (?) icon with a link to said url
 *
 * If both tooltip is provided creates a (i) icon with rich tooltip
 * and a link inside the rich tool tip with text `Learn more`
 */
export interface LearnMore {
  tooltip?: () => Platform.UIString.LocalizedString;
  url?: Platform.DevToolsPath.UrlString;
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
