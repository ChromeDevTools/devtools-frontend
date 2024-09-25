// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as InspectorMain from '../inspector_main/inspector_main.js';

import type * as Main from './main.js';

const UIStrings = {
  /**
   *@description Text in Main
   */
  focusDebuggee: 'Focus page',
  /**
   *@description Text in the Shortcuts page in settings to explain a keyboard shortcut
   */
  toggleDrawer: 'Toggle drawer',
  /**
   *@description Title of an action that navigates to the next panel
   */
  nextPanel: 'Next panel',
  /**
   *@description Title of an action that navigates to the previous panel
   */
  previousPanel: 'Previous panel',
  /**
   *@description Title of an action that reloads the DevTools
   */
  reloadDevtools: 'Reload DevTools',
  /**
   *@description Title of an action in the main tool to toggle dock
   */
  restoreLastDockPosition: 'Restore last dock position',
  /**
   *@description Text in the Shortcuts page to explain a keyboard shortcut (zoom in)
   */
  zoomIn: 'Zoom in',
  /**
   *@description Text in the Shortcuts page to explain a keyboard shortcut (zoom out)
   */
  zoomOut: 'Zoom out',
  /**
   *@description Title of an action that reset the zoom level to its default
   */
  resetZoomLevel: 'Reset zoom level',
  /**
   *@description Title of an action to search in panel
   */
  searchInPanel: 'Search in panel',
  /**
   *@description Title of an action that cancels the current search
   */
  cancelSearch: 'Cancel search',
  /**
   *@description Title of an action that finds the next search result
   */
  findNextResult: 'Find next result',
  /**
   *@description Title of an action to find the previous search result
   */
  findPreviousResult: 'Find previous result',
  /**
   *@description Title of a setting under the Appearance category in Settings
   */
  theme: 'Theme:',
  /**
   *@description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  switchToBrowserPreferredTheme: 'Switch to browser\'s preferred theme',
  /**
   *@description A drop-down menu option to switch to the same (light or dark) theme as the browser
   */
  autoTheme: 'Auto',
  /**
   *@description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  switchToLightTheme: 'Switch to light theme',
  /**
   *@description A drop-down menu option to switch to light theme
   */
  lightCapital: 'Light',
  /**
   *@description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  switchToDarkTheme: 'Switch to dark theme',
  /**
   *@description A drop-down menu option to switch to dark theme
   */
  darkCapital: 'Dark',
  /**
   *@description A tag of theme preference settings that can be searched in the command menu
   */
  darkLower: 'dark',
  /**
   *@description A tag of theme preference settings that can be searched in the command menu
   */
  lightLower: 'light',
  /**
   *@description Title of a setting under the Appearance category in Settings
   */
  panelLayout: 'Panel layout:',
  /**
   *@description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  useHorizontalPanelLayout: 'Use horizontal panel layout',
  /**
   *@description A drop-down menu option to use horizontal panel layout
   */
  horizontal: 'horizontal',
  /**
   *@description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  useVerticalPanelLayout: 'Use vertical panel layout',
  /**
   *@description A drop-down menu option to use vertical panel layout
   */
  vertical: 'vertical',
  /**
   *@description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  useAutomaticPanelLayout: 'Use automatic panel layout',
  /**
   *@description Text short for automatic
   */
  auto: 'auto',
  /**
   *@description Title of a setting under the Appearance category in Settings
   */
  enableCtrlShortcutToSwitchPanels: 'Enable Ctrl + 1-9 shortcut to switch panels',
  /**
   *@description (Mac only) Title of a setting under the Appearance category in Settings
   */
  enableShortcutToSwitchPanels: 'Enable ⌘ + 1-9 shortcut to switch panels',
  /**
   *@description A drop-down menu option to dock to right
   */
  right: 'Right',
  /**
   *@description Text to dock the DevTools to the right of the browser tab
   */
  dockToRight: 'Dock to right',
  /**
   *@description A drop-down menu option to dock to bottom
   */
  bottom: 'Bottom',
  /**
   *@description Text to dock the DevTools to the bottom of the browser tab
   */
  dockToBottom: 'Dock to bottom',
  /**
   *@description A drop-down menu option to dock to left
   */
  left: 'Left',
  /**
   *@description Text to dock the DevTools to the left of the browser tab
   */
  dockToLeft: 'Dock to left',
  /**
   *@description A drop-down menu option to undock into separate window
   */
  undocked: 'Undocked',
  /**
   *@description Text to undock the DevTools
   */
  undockIntoSeparateWindow: 'Undock into separate window',
  /**
   *@description Name of the default set of DevTools keyboard shortcuts
   */
  devtoolsDefault: 'DevTools (Default)',
  /**
   * @description Title of the language setting that allows users to switch the locale
   * in which DevTools is presented.
   */
  language: 'Language:',
  /**
   * @description Users can choose this option when picking the language in which
   * DevTools is presented. Choosing this option means that the DevTools language matches
   * Chrome's UI language.
   */
  browserLanguage: 'Browser UI language',
  /**
   * @description Label for a checkbox in the settings UI. Allows developers to opt-in/opt-out
   * of syncing DevTools settings via Chrome Sync.
   */
  enableSync: 'Enable settings sync',
  /**
   * @description A command available in the command menu to perform searches, for example in the
   * elements panel, as user types, rather than only when they press Enter.
   */
  searchAsYouTypeSetting: 'Search as you type',
  /**
   * @description A command available in the command menu to perform searches, for example in the
   * elements panel, as user types, rather than only when they press Enter.
   */
  searchAsYouTypeCommand: 'Enable search as you type',
  /**
   * @description A command available in the command menu to perform searches, for example in the
   * elements panel, only when the user presses Enter.
   */
  searchOnEnterCommand: 'Disable search as you type (press Enter to search)',
  /**
   * @description Label of a checkbox under the Appearance category in Settings. Allows developers
   * to opt-in / opt-out of syncing DevTools' color theme with Chrome's color theme.
   */
  matchChromeColorScheme: 'Match Chrome color scheme',
  /**
   * @description Tooltip for the learn more link of the Match Chrome color scheme Setting.
   */
  matchChromeColorSchemeDocumentation: 'Match DevTools colors to your customized Chrome theme (when enabled)',
  /**
   * @description Command to turn the browser color scheme matching on through the command menu.
   */
  matchChromeColorSchemeCommand: 'Match Chrome color scheme',
  /**
   * @description Command to turn the browser color scheme matching off through the command menu.
   */
  dontMatchChromeColorSchemeCommand: 'Don\'t match Chrome color scheme',
};
const str_ = i18n.i18n.registerUIStrings('entrypoints/main/main-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedMainModule: (typeof Main|undefined);
let loadedInspectorMainModule: (typeof InspectorMain|undefined);

async function loadMainModule(): Promise<typeof Main> {
  if (!loadedMainModule) {
    loadedMainModule = await import('./main.js');
  }
  return loadedMainModule;
}

// We load the `inspector_main` module for the action `inspector_main.focus-debuggee`
// which depends on it. It cannot be registered in `inspector_main-meta` as the action
// belongs to the shell app (the module `main` belongs to the`shell` app while
// `inspector_main` belongs to the `devtools_app`).

async function loadInspectorMainModule(): Promise<typeof InspectorMain> {
  if (!loadedInspectorMainModule) {
    loadedInspectorMainModule = await import('../inspector_main/inspector_main.js');
  }
  return loadedInspectorMainModule;
}

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DRAWER,
  actionId: 'inspector-main.focus-debuggee',
  async loadActionDelegate() {
    const InspectorMain = await loadInspectorMainModule();
    return new InspectorMain.InspectorMain.FocusDebuggeeActionDelegate();
  },
  order: 100,
  title: i18nLazyString(UIStrings.focusDebuggee),
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DRAWER,
  actionId: 'main.toggle-drawer',
  async loadActionDelegate() {
    return new UI.InspectorView.ActionDelegate();
  },
  order: 101,
  title: i18nLazyString(UIStrings.toggleDrawer),
  bindings: [
    {
      shortcut: 'Esc',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.next-tab',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.nextPanel),
  async loadActionDelegate() {
    return new UI.InspectorView.ActionDelegate();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+]',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+]',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.previous-tab',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.previousPanel),
  async loadActionDelegate() {
    return new UI.InspectorView.ActionDelegate();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+[',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+[',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.debug-reload',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.reloadDevtools),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.ReloadActionDelegate();
  },
  bindings: [
    {
      shortcut: 'Alt+R',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.restoreLastDockPosition),
  actionId: 'main.toggle-dock',
  async loadActionDelegate() {
    return new UI.DockController.ToggleDockActionDelegate();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+Shift+D',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+Shift+D',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.zoom-in',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.zoomIn),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.ZoomActionDelegate();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+Plus',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+Shift+Plus',
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+NumpadPlus',
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+Shift+NumpadPlus',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+Plus',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+Shift+Plus',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+NumpadPlus',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+Shift+NumpadPlus',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.zoom-out',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.zoomOut),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.ZoomActionDelegate();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+Minus',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+Shift+Minus',
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+NumpadMinus',
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+Shift+NumpadMinus',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+Minus',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+Shift+Minus',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+NumpadMinus',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+Shift+NumpadMinus',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.zoom-reset',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.resetZoomLevel),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.ZoomActionDelegate();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+0',
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+Numpad0',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+Numpad0',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+0',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.search-in-panel.find',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.searchInPanel),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.SearchActionDelegate();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+F',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+F',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'F3',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.search-in-panel.cancel',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.cancelSearch),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.SearchActionDelegate();
  },
  order: 10,
  bindings: [
    {
      shortcut: 'Esc',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.search-in-panel.find-next',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.findNextResult),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.SearchActionDelegate();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+G',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+G',
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'F3',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.search-in-panel.find-previous',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.findPreviousResult),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.SearchActionDelegate();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+Shift+G',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+Shift+G',
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Shift+F3',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.APPEARANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.theme),
  settingName: 'ui-theme',
  settingType: Common.Settings.SettingType.ENUM,
  defaultValue: 'systemPreferred',
  reloadRequired: false,
  options: [
    {
      title: i18nLazyString(UIStrings.switchToBrowserPreferredTheme),
      text: i18nLazyString(UIStrings.autoTheme),
      value: 'systemPreferred',
    },
    {
      title: i18nLazyString(UIStrings.switchToLightTheme),
      text: i18nLazyString(UIStrings.lightCapital),
      value: 'default',
    },
    {
      title: i18nLazyString(UIStrings.switchToDarkTheme),
      text: i18nLazyString(UIStrings.darkCapital),
      value: 'dark',
    },
  ],
  tags: [
    i18nLazyString(UIStrings.darkLower),
    i18nLazyString(UIStrings.lightLower),
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.APPEARANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.matchChromeColorScheme),
  settingName: 'chrome-theme-colors',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.matchChromeColorSchemeCommand),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.dontMatchChromeColorSchemeCommand),
    },
  ],
  reloadRequired: true,
  learnMore: {
    url: 'https://goo.gle/devtools-customize-theme' as Platform.DevToolsPath.UrlString,
    tooltip: i18nLazyString(UIStrings.matchChromeColorSchemeDocumentation),
  },
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.APPEARANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.panelLayout),
  settingName: 'sidebar-position',
  settingType: Common.Settings.SettingType.ENUM,
  defaultValue: 'auto',
  options: [
    {
      title: i18nLazyString(UIStrings.useHorizontalPanelLayout),
      text: i18nLazyString(UIStrings.horizontal),
      value: 'bottom',
    },
    {
      title: i18nLazyString(UIStrings.useVerticalPanelLayout),
      text: i18nLazyString(UIStrings.vertical),
      value: 'right',
    },
    {
      title: i18nLazyString(UIStrings.useAutomaticPanelLayout),
      text: i18nLazyString(UIStrings.auto),
      value: 'auto',
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.APPEARANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  settingName: 'language',
  settingType: Common.Settings.SettingType.ENUM,
  title: i18nLazyString(UIStrings.language),
  defaultValue: 'en-US',
  options: [
    {
      value: 'browserLanguage',
      title: i18nLazyString(UIStrings.browserLanguage),
      text: i18nLazyString(UIStrings.browserLanguage),
    },
    ...i18n.i18n.getAllSupportedDevToolsLocales().sort().map(locale => createOptionForLocale(locale)),
  ],
  reloadRequired: true,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.APPEARANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: Host.Platform.platform() === 'mac' ? i18nLazyString(UIStrings.enableShortcutToSwitchPanels) :
                                              i18nLazyString(UIStrings.enableCtrlShortcutToSwitchPanels),
  settingName: 'shortcut-panel-switch',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.GLOBAL,
  settingName: 'currentDockState',
  settingType: Common.Settings.SettingType.ENUM,
  defaultValue: 'right',
  options: [
    {
      value: 'right',
      text: i18nLazyString(UIStrings.right),
      title: i18nLazyString(UIStrings.dockToRight),
    },
    {
      value: 'bottom',
      text: i18nLazyString(UIStrings.bottom),
      title: i18nLazyString(UIStrings.dockToBottom),
    },
    {
      value: 'left',
      text: i18nLazyString(UIStrings.left),
      title: i18nLazyString(UIStrings.dockToLeft),
    },
    {
      value: 'undocked',
      text: i18nLazyString(UIStrings.undocked),
      title: i18nLazyString(UIStrings.undockIntoSeparateWindow),
    },
  ],
});

Common.Settings.registerSettingExtension({
  storageType: Common.Settings.SettingStorageType.SYNCED,
  settingName: 'active-keybind-set',
  settingType: Common.Settings.SettingType.ENUM,
  defaultValue: 'devToolsDefault',
  options: [
    {
      value: 'devToolsDefault',
      title: i18nLazyString(UIStrings.devtoolsDefault),
      text: i18nLazyString(UIStrings.devtoolsDefault),
    },
    {
      value: 'vsCode',
      title: i18n.i18n.lockedLazyString('Visual Studio Code'),
      text: i18n.i18n.lockedLazyString('Visual Studio Code'),
    },
  ],
});

function createLazyLocalizedLocaleSettingText(localeString: string): () => Common.UIString.LocalizedString {
  return (): Common.UIString.LocalizedString =>
             i18n.i18n.getLocalizedLanguageRegion(localeString, i18n.DevToolsLocale.DevToolsLocale.instance());
}

function createOptionForLocale(localeString: string): Common.Settings.SettingExtensionOption {
  return {
    value: localeString,
    title: createLazyLocalizedLocaleSettingText(localeString),
    text: createLazyLocalizedLocaleSettingText(localeString),
  };
}

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SYNC,
  // This name must be kept in sync with DevToolsSettings::kSyncDevToolsPreferencesFrontendName.
  settingName: 'sync-preferences',
  settingType: Common.Settings.SettingType.BOOLEAN,
  title: i18nLazyString(UIStrings.enableSync),
  defaultValue: false,
  reloadRequired: true,
});

Common.Settings.registerSettingExtension({
  storageType: Common.Settings.SettingStorageType.SYNCED,
  settingName: 'user-shortcuts',
  settingType: Common.Settings.SettingType.ARRAY,
  defaultValue: [],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.GLOBAL,
  storageType: Common.Settings.SettingStorageType.LOCAL,
  title: i18nLazyString(UIStrings.searchAsYouTypeSetting),
  settingName: 'search-as-you-type',
  settingType: Common.Settings.SettingType.BOOLEAN,
  order: 3,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.searchAsYouTypeCommand),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.searchOnEnterCommand),
    },
  ],
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  category: UI.ViewManager.ViewLocationCategory.DRAWER,
  async loadResolver() {
    return UI.InspectorView.InspectorView.instance();
  },
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.DRAWER_SIDEBAR,
  category: UI.ViewManager.ViewLocationCategory.DRAWER_SIDEBAR,
  async loadResolver() {
    return UI.InspectorView.InspectorView.instance();
  },
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.PANEL,
  category: UI.ViewManager.ViewLocationCategory.PANEL,
  async loadResolver() {
    return UI.InspectorView.InspectorView.instance();
  },
});

UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Workspace.UISourceCode.UISourceCode,
      SDK.Resource.Resource,
      SDK.NetworkRequest.NetworkRequest,
    ];
  },
  async loadProvider() {
    return new Components.Linkifier.ContentProviderContextMenuProvider();
  },
  experiment: undefined,
});

UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Node,
    ];
  },
  async loadProvider() {
    return new UI.XLink.ContextMenuProvider();
  },
  experiment: undefined,
});

UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Node,
    ];
  },
  async loadProvider() {
    return new Components.Linkifier.LinkContextMenuProvider();
  },
  experiment: undefined,
});

UI.Toolbar.registerToolbarItem({
  separator: true,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_LEFT,
  order: 100,
});

UI.Toolbar.registerToolbarItem({
  separator: true,
  order: 97,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_RIGHT,
});

UI.Toolbar.registerToolbarItem({
  async loadItem() {
    const Main = await loadMainModule();
    return Main.MainImpl.SettingsButtonProvider.instance();
  },
  order: 99,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_RIGHT,
});

UI.Toolbar.registerToolbarItem({
  async loadItem() {
    const Main = await loadMainModule();
    return Main.MainImpl.MainMenuItem.instance();
  },
  order: 100,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_RIGHT,
});

UI.Toolbar.registerToolbarItem({
  async loadItem() {
    return UI.DockController.CloseButtonProvider.instance();
  },
  order: 101,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_RIGHT,
});

Common.AppProvider.registerAppProvider({
  async loadAppProvider() {
    const Main = await loadMainModule();
    return Main.SimpleApp.SimpleAppProvider.instance();
  },
  order: 10,
});
