// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './emulation/emulation-meta.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Settings from './settings.js';

const UIStrings = {
  /**
   *@description Text for keyboard shortcuts
   */
  shortcuts: 'Shortcuts',
  /**
   *@description Text in Settings Screen of the Settings
   */
  preferences: 'Preferences',
  /**
   *@description Text in Settings Screen of the Settings
   */
  experiments: 'Experiments',
  /**
   *@description Title of Ignore list settings
   */
  ignoreList: 'Ignore list',
  /**
   *@description Command for showing the keyboard shortcuts in Settings
   */
  showShortcuts: 'Show Shortcuts',
  /**
   *@description Command for showing the preference tab in the Settings Screen
   */
  showPreferences: 'Show Preferences',
  /**
   *@description Command for showing the experiments tab in the Settings Screen
   */
  showExperiments: 'Show Experiments',
  /**
   *@description Command for showing the Ignore list settings
   */
  showIgnoreList: 'Show Ignore list',
  /**
   *@description Name of the Settings view
   */
  settings: 'Settings',
  /**
   *@description Text for the documentation of something
   */
  documentation: 'Documentation',
  /**
   *@description Text for AI innovation settings
   */
  aiInnovations: 'AI innovations',
  /**
   *@description Command for showing the AI innovation settings
   */
  showAiInnovations: 'Show AI innovations',
};

const str_ = i18n.i18n.registerUIStrings('panels/settings/settings-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedSettingsModule: (typeof Settings|undefined);

async function loadSettingsModule(): Promise<typeof Settings> {
  if (!loadedSettingsModule) {
    loadedSettingsModule = await import('./settings.js');
  }
  return loadedSettingsModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'preferences',
  title: i18nLazyString(UIStrings.preferences),
  commandPrompt: i18nLazyString(UIStrings.showPreferences),
  order: 0,
  async loadView() {
    const Settings = await loadSettingsModule();
    return new Settings.SettingsScreen.GenericSettingsTab();
  },
  iconName: 'gear',
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'chrome-ai',
  title: i18nLazyString(UIStrings.aiInnovations),
  commandPrompt: i18nLazyString(UIStrings.showAiInnovations),
  order: 2,
  async loadView() {
    const Settings = await loadSettingsModule();
    return LegacyWrapper.LegacyWrapper.legacyWrapper(UI.Widget.VBox, new Settings.AISettingsTab.AISettingsTab());
  },
  iconName: 'button-magic',
  settings: ['console-insights-enabled'],
  condition: config => {
    return (config?.devToolsConsoleInsights?.enabled || config?.devToolsFreestyler?.enabled) ?? false;
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'experiments',
  title: i18nLazyString(UIStrings.experiments),
  commandPrompt: i18nLazyString(UIStrings.showExperiments),
  order: 3,
  experiment: Root.Runtime.ExperimentName.ALL,
  async loadView() {
    const Settings = await loadSettingsModule();
    return new Settings.SettingsScreen.ExperimentsSettingsTab();
  },
  iconName: 'experiment',
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'blackbox',
  title: i18nLazyString(UIStrings.ignoreList),
  commandPrompt: i18nLazyString(UIStrings.showIgnoreList),
  order: 4,
  async loadView() {
    const Settings = await loadSettingsModule();
    return new Settings.FrameworkIgnoreListSettingsTab.FrameworkIgnoreListSettingsTab();
  },
  iconName: 'clear-list',
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'keybinds',
  title: i18nLazyString(UIStrings.shortcuts),
  commandPrompt: i18nLazyString(UIStrings.showShortcuts),
  order: 100,
  async loadView() {
    const Settings = await loadSettingsModule();
    return new Settings.KeybindsSettingsTab.KeybindsSettingsTab();
  },
  iconName: 'keyboard',
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.SETTINGS,
  actionId: 'settings.show',
  title: i18nLazyString(UIStrings.settings),
  async loadActionDelegate() {
    const Settings = await loadSettingsModule();
    return new Settings.SettingsScreen.ActionDelegate();
  },
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_SETTINGS_GEAR,
  bindings: [
    {
      shortcut: 'F1',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
      ],
    },
    {
      shortcut: 'Shift+?',
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+,',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+,',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.SETTINGS,
  actionId: 'settings.documentation',
  title: i18nLazyString(UIStrings.documentation),
  async loadActionDelegate() {
    const Settings = await loadSettingsModule();
    return new Settings.SettingsScreen.ActionDelegate();
  },
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.SETTINGS,
  actionId: 'settings.shortcuts',
  title: i18nLazyString(UIStrings.showShortcuts),
  async loadActionDelegate() {
    const Settings = await loadSettingsModule();
    return new Settings.SettingsScreen.ActionDelegate();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+K Ctrl+S',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+K Meta+S',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  category: UI.ViewManager.ViewLocationCategory.SETTINGS,
  async loadResolver() {
    const Settings = await loadSettingsModule();
    return Settings.SettingsScreen.SettingsScreen.instance();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      Common.Settings.Setting,
      Root.Runtime.Experiment,
    ];
  },
  destination: undefined,
  async loadRevealer() {
    const Settings = await loadSettingsModule();
    return new Settings.SettingsScreen.Revealer();
  },
});

UI.ContextMenu.registerItem({
  location: UI.ContextMenu.ItemLocation.MAIN_MENU_FOOTER,
  actionId: 'settings.shortcuts',
  order: undefined,
});

UI.ContextMenu.registerItem({
  location: UI.ContextMenu.ItemLocation.MAIN_MENU_HELP_DEFAULT,
  actionId: 'settings.documentation',
  order: undefined,
});
