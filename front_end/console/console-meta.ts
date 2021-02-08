// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Console from './console.js';

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Title of the Console tool
  */
  console: 'Console',
  /**
  *@description Title of an action that shows the console.
  */
  showConsole: 'Show Console',
  /**
  *@description Text to clear the console
  */
  clearConsole: 'Clear console',
  /**
  *@description Title of an action in the console tool to clear
  */
  clearConsoleHistory: 'Clear console history',
  /**
  *@description Title of an action in the console tool to create pin. A live expression is code that the user can enter into the console and it will be pinned in the UI. Live expressions are constantly evaluated as the user interacts with the console (hence 'live').
  */
  createLiveExpression: 'Create live expression',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  hideNetworkMessages: 'Hide network messages',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  showNetworkMessages: 'Show network messages',
  /**
  *@description Alternative title text of a setting in Console View of the Console panel
  */
  selectedContextOnly: 'Selected context only',
  /**
  *@description Tooltip text that appears on the setting when hovering over it in Console View of the Console panel
  */
  onlyShowMessagesFromTheCurrent: 'Only show messages from the current context (`top`, `iframe`, `worker`, extension)',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  showMessagesFromAllContexts: 'Show messages from all contexts',
  /**
  *@description Title of a setting under the Console category in Settings
  */
  logXmlhttprequests: 'Log XMLHttpRequests',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  showTimestamps: 'Show timestamps',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  hideTimestamps: 'Hide timestamps',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  autocompleteFromHistory: 'Autocomplete from history',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  doNotAutocompleteFromHistory: 'Do not autocomplete from history',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  groupSimilarMessagesInConsole: 'Group similar messages in console',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  doNotGroupSimilarMessagesIn: 'Do not group similar messages in console',
  /**
  *@description Title of a setting under the Console category in Settings
  */
  eagerEvaluation: 'Eager evaluation',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  eagerlyEvaluateConsolePromptText: 'Eagerly evaluate console prompt text',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  doNotEagerlyEvaluateConsole: 'Do not eagerly evaluate console prompt text',
  /**
  *@description Title of a setting under the Console category in Settings
  */
  evaluateTriggersUserActivation: 'Evaluate triggers user activation',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  treatEvaluationAsUserActivation: 'Treat evaluation as user activation',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  doNotTreatEvaluationAsUser: 'Do not treat evaluation as user activation',
};
const str_ = i18n.i18n.registerUIStrings('console/console-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
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
  title: i18nString(UIStrings.console),
  commandPrompt: i18nString(UIStrings.showConsole),
  order: 20,
  async loadView() {
    const Console = await loadConsoleModule();
    return Console.ConsolePanel.ConsolePanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'console-view',
  title: i18nString(UIStrings.console),
  commandPrompt: i18nString(UIStrings.showConsole),
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
  title: i18nString(UIStrings.showConsole),
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
  title: i18nString(UIStrings.clearConsole),
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
  title: i18nString(UIStrings.clearConsoleHistory),
  async loadActionDelegate() {
    const Console = await loadConsoleModule();
    return Console.ConsoleView.ActionDelegate.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'console.create-pin',
  category: UI.ActionRegistration.ActionCategory.CONSOLE,
  title: i18nString(UIStrings.createLiveExpression),
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_VISIBILITY,
  async loadActionDelegate() {
    const Console = await loadConsoleModule();
    return Console.ConsoleView.ActionDelegate.instance();
  },
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: i18nString(UIStrings.hideNetworkMessages),
  settingName: 'hideNetworkMessages',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nString(UIStrings.hideNetworkMessages),
    },
    {
      value: false,
      title: i18nString(UIStrings.showNetworkMessages),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: i18nString(UIStrings.selectedContextOnly),
  settingName: 'selectedContextFilterEnabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nString(UIStrings.onlyShowMessagesFromTheCurrent),
    },
    {
      value: false,
      title: i18nString(UIStrings.showMessagesFromAllContexts),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: i18nString(UIStrings.logXmlhttprequests),
  settingName: 'monitoringXHREnabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: i18nString(UIStrings.showTimestamps),
  settingName: 'consoleTimestampsEnabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nString(UIStrings.showTimestamps),
    },
    {
      value: false,
      title: i18nString(UIStrings.hideTimestamps),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: i18nString(UIStrings.autocompleteFromHistory),
  settingName: 'consoleHistoryAutocomplete',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nString(UIStrings.autocompleteFromHistory),
    },
    {
      value: false,
      title: i18nString(UIStrings.doNotAutocompleteFromHistory),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: i18nString(UIStrings.groupSimilarMessagesInConsole),
  settingName: 'consoleGroupSimilar',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nString(UIStrings.groupSimilarMessagesInConsole),
    },
    {
      value: false,
      title: i18nString(UIStrings.doNotGroupSimilarMessagesIn),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: i18nString(UIStrings.eagerEvaluation),
  settingName: 'consoleEagerEval',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nString(UIStrings.eagerlyEvaluateConsolePromptText),
    },
    {
      value: false,
      title: i18nString(UIStrings.doNotEagerlyEvaluateConsole),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: i18nString(UIStrings.evaluateTriggersUserActivation),
  settingName: 'consoleUserActivationEval',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nString(UIStrings.treatEvaluationAsUserActivation),
    },
    {
      value: false,
      title: i18nString(UIStrings.doNotTreatEvaluationAsUser),
    },
  ],
});
