// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Settings from './settings.js';

export const UIStrings = {
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
   *@description Title of Ignore List settings
   */
  ignoreList: 'Ignore List',
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
   *@description Command for showing the Ignore List settings
   */
  showIgnoreList: 'Show Ignore List',
  /**
  *@description Name of the Settings view
  */
  settings: 'Settings',
  /**
   *@description Text for the documentation of something
  */
  documentation: 'Documentation',
};

const str_ = i18n.i18n.registerUIStrings('settings/settings-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedSettingsModule: (typeof Settings|undefined);

async function loadSettingsModule(): Promise<typeof Settings> {
  if (!loadedSettingsModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('settings');
    loadedSettingsModule = await import('./settings.js');
  }
  return loadedSettingsModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'preferences',
  title: i18nString(UIStrings.preferences),
  commandPrompt: i18nString(UIStrings.showPreferences),
  order: 0,
  async loadView() {
    const Settings = await loadSettingsModule();
    return Settings.SettingsScreen.GenericSettingsTab.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'experiments',
  title: i18nString(UIStrings.experiments),
  commandPrompt: i18nString(UIStrings.showExperiments),
  order: 3,
  experiment: Root.Runtime.ExperimentName.ALL,
  async loadView() {
    const Settings = await loadSettingsModule();
    return Settings.SettingsScreen.ExperimentsSettingsTab.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'blackbox',
  title: i18nString(UIStrings.ignoreList),
  commandPrompt: i18nString(UIStrings.showIgnoreList),
  order: 4,
  async loadView() {
    const Settings = await loadSettingsModule();
    return Settings.FrameworkIgnoreListSettingsTab.FrameworkIgnoreListSettingsTab.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'keybinds',
  title: i18nString(UIStrings.shortcuts),
  commandPrompt: i18nString(UIStrings.showShortcuts),
  order: 100,
  async loadView() {
    const Settings = await loadSettingsModule();
    return Settings.KeybindsSettingsTab.KeybindsSettingsTab.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.SETTINGS,
  actionId: 'settings.show',
  title: i18nString(UIStrings.settings),
  async loadActionDelegate() {
    const Settings = await loadSettingsModule();
    return Settings.SettingsScreen.ActionDelegate.instance();
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
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+,',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
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
  title: i18nString(UIStrings.documentation),
  async loadActionDelegate() {
    const Settings = await loadSettingsModule();
    return Settings.SettingsScreen.ActionDelegate.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.SETTINGS,
  actionId: 'settings.shortcuts',
  title: i18nString(UIStrings.shortcuts),
  async loadActionDelegate() {
    const Settings = await loadSettingsModule();
    return Settings.SettingsScreen.ActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+K Ctrl+S',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+K Meta+S',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});
