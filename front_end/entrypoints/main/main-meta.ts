// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Badges from '../../models/badges/badges.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';
import type * as InspectorMain from '../inspector_main/inspector_main.js';

import type * as Main from './main.js';

const UIStrings = {
  /**
   * @description Title of a setting under the Persistence category in Settings.
   */
  localOverrides: 'Local overrides',
  /**
   * @description A tag of enable local overrides setting that can be searched in the command menu.
   */
  interception: 'interception',
  /**
   * @description A tag of enable local overrides setting that can be searched in the command menu.
   */
  override: 'override',
  /**
   * @description A tag of group network by frame setting that can be searched in the command menu.
   */
  network: 'network',
  /**
   * @description A tag of enable local overrides setting that can be searched in the command menu.
   */
  rewrite: 'rewrite',
  /**
   * @description A tag of enable local overrides setting that can be searched in the command menu.
   * Noun for network request.
   */
  request: 'request',
  /**
   * @description Title of an option under the Persistence category that can be invoked through the command menu.
   */
  enableOverrideNetworkRequests: 'Enable override network requests',
  /**
   * @description Title of an option under the Persistence category that can be invoked through the command menu.
   */
  disableOverrideNetworkRequests: 'Disable override network requests',
  /**
   * @description Label for a checkbox in the settings UI. Allows developers to opt-in/opt-out
   * of receiving Google Developer Program (GDP) badges based on their activity in Chrome DevTools.
   */
  earnBadges: 'Earn badges',
  /**
   * @description Title of a setting under the Appearance category in Settings. When the webpage is
   * paused by devtools, an overlay is shown on top of the page to indicate that it is paused. The
   * overlay is a pause/unpause button and some text, which appears on top of the paused page. This
   * setting turns off this overlay.
   */
  disablePaused: 'Disable paused state overlay',
  /**
   * @description Action title to focus the page being debugged.
   */
  focusDebuggee: 'Focus page',
  /**
   * @description Action title and shortcut description to toggle the Console drawer.
   */
  toggleDrawer: 'Toggle drawer',
  /**
   * @description Title of an action that navigates to the next panel.
   */
  nextPanel: 'Next panel',
  /**
   * @description Title of an action that navigates to the previous panel.
   */
  previousPanel: 'Previous panel',
  /**
   * @description Title of an action that reloads DevTools.
   */
  reloadDevtools: 'Reload DevTools',
  /**
   * @description Title of an action in the main toolbar to restore the last dock position.
   */
  restoreLastDockPosition: 'Restore last dock position',
  /**
   * @description Shortcut description and action title to zoom in.
   */
  zoomIn: 'Zoom in',
  /**
   * @description Shortcut description and action title to zoom out.
   */
  zoomOut: 'Zoom out',
  /**
   * @description Title of an action that resets the zoom level to default.
   */
  resetZoomLevel: 'Reset zoom level',
  /**
   * @description Title of an action to search within the current panel.
   */
  searchInPanel: 'Search in panel',
  /**
   * @description Title of an action that cancels the current search.
   */
  cancelSearch: 'Cancel search',
  /**
   * @description Title of an action that finds the next search result.
   */
  findNextResult: 'Find next result',
  /**
   * @description Title of an action to find the previous search result.
   */
  findPreviousResult: 'Find previous result',
  /**
   * @description Title of the theme setting under the Appearance category in Settings.
   */
  theme: 'Theme:',
  /**
   * @description Command menu option to switch to the browser's preferred color theme.
   */
  switchToBrowserPreferredTheme: 'Switch to browser’s preferred theme',
  /**
   * @description Drop-down menu option to match the browser's color theme.
   */
  autoTheme: 'Auto',
  /**
   * @description Command menu option to switch to the light color theme.
   */
  switchToLightTheme: 'Switch to light theme',
  /**
   * @description Drop-down menu option to select the light color theme.
   */
  lightCapital: 'Light',
  /**
   * @description Command menu option to switch to the dark color theme.
   */
  switchToDarkTheme: 'Switch to dark theme',
  /**
   * @description Drop-down menu option to select the dark color theme.
   */
  darkCapital: 'Dark',
  /**
   * @description Tag for theme preference settings when searched in the command menu.
   */
  darkLower: 'dark',
  /**
   * @description Tag for theme preference settings when searched in the command menu.
   */
  lightLower: 'light',
  /**
   * @description Title of the panel layout setting under the Appearance category in Settings.
   */
  panelLayout: 'Panel layout:',
  /**
   * @description Command menu option to use a horizontal panel layout.
   */
  useHorizontalPanelLayout: 'Use horizontal panel layout',
  /**
   * @description Drop-down menu option for horizontal panel layout.
   */
  horizontal: 'horizontal',
  /**
   * @description Command menu option to use a vertical panel layout.
   */
  useVerticalPanelLayout: 'Use vertical panel layout',
  /**
   * @description Drop-down menu option for vertical panel layout.
   */
  vertical: 'vertical',
  /**
   * @description Command menu option to use automatic panel layout.
   */
  useAutomaticPanelLayout: 'Use automatic panel layout',
  /**
   * @description Drop-down menu option for automatic panel layout.
   */
  auto: 'auto',
  /**
   * @description Checkbox label for the setting to use Ctrl plus number keys to switch panels.
   */
  enableCtrlShortcutToSwitchPanels: 'Use Ctrl + 1-9 to switch panels',
  /**
   * @description Checkbox label for the setting to use Command plus number keys to switch panels on Mac.
   */
  enableShortcutToSwitchPanels: 'Use ⌘ + 1-9 to switch panels',
  /**
   * @description Drop-down menu option to dock DevTools to the right.
   */
  right: 'Right',
  /**
   * @description Title of the action and setting option to dock DevTools to the right of the browser window.
   */
  dockToRight: 'Dock to right',
  /**
   * @description Drop-down menu option to dock DevTools to the bottom.
   */
  bottom: 'Bottom',
  /**
   * @description Title of the action and setting option to dock DevTools to the bottom of the browser window.
   */
  dockToBottom: 'Dock to bottom',
  /**
   * @description Drop-down menu option to dock DevTools to the left.
   */
  left: 'Left',
  /**
   * @description Title of the action and setting option to dock DevTools to the left of the browser window.
   */
  dockToLeft: 'Dock to left',
  /**
   * @description Drop-down menu option for undocked DevTools in a separate window.
   */
  undocked: 'Undocked',
  /**
   * @description Title of the action and setting option to undock DevTools into a separate window.
   */
  undockIntoSeparateWindow: 'Undock into separate window',
  /**
   * @description Option label for the default set of DevTools keyboard shortcuts.
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
   * of saving settings to their Google account.
   */
  saveSettings: 'Save `DevTools` settings to your `Google` account',
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
  dontMatchChromeColorSchemeCommand: 'Don’t match Chrome color scheme',
  /**
   * @description Command to toggle the drawer orientation.
   */
  toggleDrawerOrientation: 'Toggle drawer orientation',
} as const;
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
  category: UI.ActionRegistration.ActionCategory.DRAWER,
  actionId: 'main.toggle-drawer-orientation',
  async loadActionDelegate() {
    return new UI.InspectorView.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.toggleDrawerOrientation),
  bindings: [
    {
      shortcut: 'Shift+Esc',
    },
  ],
  condition: config => Boolean(config?.devToolsFlexibleLayout?.verticalDrawerEnabled),
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

SettingsUI.SettingUIRegistration.register(SettingsUI.MainSettings.uiThemeSettingDescriptor, {
  category: Common.Settings.SettingCategory.APPEARANCE,
  title: i18nLazyString(UIStrings.theme),
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

SettingsUI.SettingUIRegistration.register(SettingsUI.MainSettings.chromeThemeColorsSettingDescriptor, {
  category: Common.Settings.SettingCategory.APPEARANCE,
  title: i18nLazyString(UIStrings.matchChromeColorScheme),
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

SettingsUI.SettingUIRegistration.register(SettingsUI.MainSettings.sidebarPositionSettingDescriptor, {
  category: Common.Settings.SettingCategory.APPEARANCE,
  title: i18nLazyString(UIStrings.panelLayout),
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

SettingsUI.SettingUIRegistration.register(SettingsUI.MainSettings.languageSettingDescriptor, {
  category: Common.Settings.SettingCategory.APPEARANCE,
  title: i18nLazyString(UIStrings.language),
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

SettingsUI.SettingUIRegistration.register(SettingsUI.MainSettings.shortcutPanelSwitchSettingDescriptor, {
  category: Common.Settings.SettingCategory.APPEARANCE,
  title: Host.Platform.platform() === 'mac' ? i18nLazyString(UIStrings.enableShortcutToSwitchPanels) :
                                              i18nLazyString(UIStrings.enableCtrlShortcutToSwitchPanels),
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.disablePausedStateOverlaySettingDescriptor, {
  category: Common.Settings.SettingCategory.APPEARANCE,
  title: i18nLazyString(UIStrings.disablePaused),
});

SettingsUI.SettingUIRegistration.register(SettingsUI.MainSettings.currentDockStateSettingDescriptor, {
  category: Common.Settings.SettingCategory.GLOBAL,
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
  category: Common.Settings.SettingCategory.ACCOUNT,
  // This name must be kept in sync with DevToolsSettings::kSyncDevToolsPreferencesFrontendName.
  settingName: 'sync-preferences',
  settingType: Common.Settings.SettingType.BOOLEAN,
  title: i18nLazyString(UIStrings.saveSettings),
  defaultValue: false,
  reloadRequired: true,
});

SettingsUI.SettingUIRegistration.register(Badges.receiveGdpBadgesSettingDescriptor, {
  category: Common.Settings.SettingCategory.ACCOUNT,
  title: i18nLazyString(UIStrings.earnBadges),
  reloadRequired: true,
});

SettingsUI.SettingUIRegistration.register(
    Persistence.NetworkPersistenceManager.persistenceNetworkOverridesEnabledSettingDescriptor, {
      category: Common.Settings.SettingCategory.PERSISTENCE,
      title: i18nLazyString(UIStrings.localOverrides),
      tags: [
        i18nLazyString(UIStrings.interception),
        i18nLazyString(UIStrings.override),
        i18nLazyString(UIStrings.network),
        i18nLazyString(UIStrings.rewrite),
        i18nLazyString(UIStrings.request),
      ],
      options: [
        {
          value: true,
          title: i18nLazyString(UIStrings.enableOverrideNetworkRequests),
        },
        {
          value: false,
          title: i18nLazyString(UIStrings.disableOverrideNetworkRequests),
        },
      ],
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
});

UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Node,
    ];
  },
  async loadProvider() {
    return new UI.LinkContextMenuProvider.LinkContextMenuProvider();
  },
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
});

UI.Toolbar.registerToolbarItem({
  separator: true,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_LEFT,
  order: 100,
});

UI.Toolbar.registerToolbarItem({
  separator: true,
  order: 96,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_RIGHT,
});

UI.Toolbar.registerToolbarItem({
  condition(config) {
    const isFlagEnabled = config?.devToolsGlobalAiButton?.enabled;

    const isGeoRestricted = config?.aidaAvailability?.blockedByGeo === true;
    const isPolicyRestricted = config?.aidaAvailability?.blockedByEnterprisePolicy === true;
    return Boolean(isFlagEnabled && !isGeoRestricted && !isPolicyRestricted);
  },
  loadItem: Common.Lazy.lazy(async () => {
    const Main = await loadMainModule();
    return new Main.GlobalAiButton.GlobalAiButtonToolbarProvider();
  }) as () => Promise<UI.Toolbar.Provider>,
  order: 98,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_RIGHT,
});

UI.Toolbar.registerToolbarItem({
  loadItem: Common.Lazy.lazy(async () => {
    const Main = await loadMainModule();
    return new Main.MainImpl.SettingsButtonProvider();
  }) as () => Promise<UI.Toolbar.Provider>,
  order: 99,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_RIGHT,
});

UI.Toolbar.registerToolbarItem({
  condition: () => !Root.Runtime.Runtime.isTraceApp(),
  loadItem: Common.Lazy.lazy(async () => {
    const Main = await loadMainModule();
    return new Main.MainImpl.MainMenuItem();
  }) as () => Promise<UI.Toolbar.Provider>,
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

UI.AppProvider.registerAppProvider({
  async loadAppProvider() {
    const Main = await loadMainModule();
    return new Main.SimpleApp.SimpleAppProvider();
  },
  order: 10,
});
