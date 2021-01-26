// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import * as Common from '../common/common.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Console from './console.js';

let loadedConsoleModule: (typeof Console|undefined);

async function loadConsoleModule(): Promise<typeof Console> {
  if (!loadedConsoleModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('console');
    loadedConsoleModule = await import('./console.js');
  }
  return loadedConsoleModule;
}

function maybeRetrieveContextTypes<T = unknown>(getClassCallBack: (consoleModule: typeof Console) => T[]): T[] {
  if (loadedConsoleModule === undefined) {
    return [];
  }
  return getClassCallBack(loadedConsoleModule);
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'console',
  title: (): Platform.UIString.LocalizedString => ls`Console`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Console`,
  order: 20,
  async loadView() {
    const Console = await loadConsoleModule();
    return Console.ConsolePanel.ConsolePanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'console-view',
  title: (): Platform.UIString.LocalizedString => ls`Console`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Console`,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  order: 0,
  async loadView() {
    const Console = await loadConsoleModule();
    return Console.ConsolePanel.WrapperView.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'console.show',
  category: UI.ActionRegistration.ActionCategory.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Show Console`,
  async loadActionDelegate() {
    const Console = await loadConsoleModule();
    return Console.ConsoleView.ActionDelegate.instance();
  },
  bindings: [
    {
      shortcut: 'Ctrl+`',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'console.clear',
  category: UI.ActionRegistration.ActionCategory.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Clear console`,
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_CLEAR,
  async loadActionDelegate() {
    const Console = await loadConsoleModule();
    return Console.ConsoleView.ActionDelegate.instance();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Console => [Console.ConsoleView.ConsoleView]);
  },
  bindings: [
    {
      shortcut: 'Ctrl+L',
    },
    {
      shortcut: 'Meta+K',
      platform: UI.ActionRegistration.Platforms.Mac,
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'console.clear.history',
  category: UI.ActionRegistration.ActionCategory.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Clear console history`,
  async loadActionDelegate() {
    const Console = await loadConsoleModule();
    return Console.ConsoleView.ActionDelegate.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'console.create-pin',
  category: UI.ActionRegistration.ActionCategory.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Create live expression`,
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_VISIBILITY,
  async loadActionDelegate() {
    const Console = await loadConsoleModule();
    return Console.ConsoleView.ActionDelegate.instance();
  },
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Hide network messages`,
  settingName: 'hideNetworkMessages',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Hide network messages`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Show network messages`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Selected context only`,
  settingName: 'selectedContextFilterEnabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString =>
          ls`Only show messages from the current context (top, iframe, worker, extension)`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Show messages from all contexts`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Log XMLHttpRequests`,
  settingName: 'monitoringXHREnabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Show timestamps`,
  settingName: 'consoleTimestampsEnabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show timestamps`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Hide timestamps`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Autocomplete from history`,
  settingName: 'consoleHistoryAutocomplete',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Autocomplete from history`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not autocomplete from history`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Group similar messages in console`,
  settingName: 'consoleGroupSimilar',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Group similar messages in console`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not group similar messages in console`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Eager evaluation`,
  settingName: 'consoleEagerEval',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Eagerly evaluate console prompt text`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not eagerly evaluate console prompt text`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Evaluate triggers user activation`,
  settingName: 'consoleUserActivationEval',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Treat evaluation as user activation`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not treat evaluation as user activation`,
    },
  ],
});
