// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Main from './main.js';
import type * as InspectorMain from '../inspector_main/inspector_main.js';

let loadedMainModule: (typeof Main|undefined);
let loadedInspectorMainModule: (typeof InspectorMain|undefined);

async function loadMainModule(): Promise<typeof Main> {
  if (!loadedMainModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('main');
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
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('inspector_main');
    loadedInspectorMainModule = await import('../inspector_main/inspector_main.js');
  }
  return loadedInspectorMainModule;
}

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DRAWER,
  actionId: 'inspector_main.focus-debuggee',
  async loadActionDelegate() {
    const InspectorMain = await loadInspectorMainModule();
    return InspectorMain.InspectorMain.FocusDebuggeeActionDelegate.instance();
  },
  order: 100,
  title: (): Platform.UIString.LocalizedString => ls`Focus debuggee`,
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DRAWER,
  actionId: 'main.toggle-drawer',
  async loadActionDelegate() {
    return UI.InspectorView.ActionDelegate.instance();
  },
  order: 101,
  title: (): Platform.UIString.LocalizedString => ls`Toggle drawer`,
  bindings: [
    {
      shortcut: 'Esc',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.next-tab',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: (): Platform.UIString.LocalizedString => ls`Next panel`,
  async loadActionDelegate() {
    return UI.InspectorView.ActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+]',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+]',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.previous-tab',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: (): Platform.UIString.LocalizedString => ls`Previous panel`,
  async loadActionDelegate() {
    return UI.InspectorView.ActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+[',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+[',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.debug-reload',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: (): Platform.UIString.LocalizedString => ls`Reload DevTools`,
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return Main.MainImpl.ReloadActionDelegate.instance();
  },
  bindings: [
    {
      shortcut: 'Alt+R',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: (): Platform.UIString.LocalizedString => ls`Restore last dock position`,
  actionId: 'main.toggle-dock',
  async loadActionDelegate() {
    return UI.DockController.ToggleDockActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+D',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+D',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.zoom-in',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: (): Platform.UIString.LocalizedString => ls`Zoom in`,
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return Main.MainImpl.ZoomActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Plus',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+Plus',
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+NumpadPlus',
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+NumpadPlus',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Plus',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+Plus',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+NumpadPlus',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+NumpadPlus',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.zoom-out',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: (): Platform.UIString.LocalizedString => ls`Zoom out`,
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return Main.MainImpl.ZoomActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Minus',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+Minus',
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+NumpadMinus',
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+NumpadMinus',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Minus',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+Minus',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+NumpadMinus',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+NumpadMinus',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.zoom-reset',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: (): Platform.UIString.LocalizedString => ls`Reset zoom level`,
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return Main.MainImpl.ZoomActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+0',
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Numpad0',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Numpad0',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+0',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.search-in-panel.find',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: (): Platform.UIString.LocalizedString => ls`Search in panel`,
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return Main.MainImpl.SearchActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+F',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+F',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'F3',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'main.search-in-panel.cancel',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: (): Platform.UIString.LocalizedString => ls`Cancel search`,
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return Main.MainImpl.SearchActionDelegate.instance();
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
  title: (): Platform.UIString.LocalizedString => ls`Find next result`,
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return Main.MainImpl.SearchActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+G',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+G',
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
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
  title: (): Platform.UIString.LocalizedString => ls`Find previous result`,
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return Main.MainImpl.SearchActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+G',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+G',
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Shift+F3',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.APPEARANCE,
  title: (): Platform.UIString.LocalizedString => ls`Theme:`,
  settingName: 'uiTheme',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  defaultValue: 'systemPreferred',
  reloadRequired: true,
  options: [
    {
      title: (): Platform.UIString.LocalizedString => ls`Switch to system preferred color theme`,
      text: (): Platform.UIString.LocalizedString => ls`System preference`,
      value: 'systemPreferred',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Switch to light theme`,
      text: (): Platform.UIString.LocalizedString => ls`Light`,
      value: 'default',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Switch to dark theme`,
      text: (): Platform.UIString.LocalizedString => ls`Dark`,
      value: 'dark',
    },
  ],
  tags: [
    (): Platform.UIString.LocalizedString => ls`dark`,
    (): Platform.UIString.LocalizedString => ls`light`,
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.APPEARANCE,
  title: (): Platform.UIString.LocalizedString => ls`Panel layout:`,
  settingName: 'sidebarPosition',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  defaultValue: 'auto',
  options: [
    {
      title: (): Platform.UIString.LocalizedString => ls`Use horizontal panel layout`,
      text: (): Platform.UIString.LocalizedString => ls`horizontal`,
      value: 'bottom',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Use vertical panel layout`,
      text: (): Platform.UIString.LocalizedString => ls`vertical`,
      value: 'right',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Use automatic panel layout`,
      text: (): Platform.UIString.LocalizedString => ls`auto`,
      value: 'auto',
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.APPEARANCE,
  title: (): Platform.UIString.LocalizedString => ls`Color format:`,
  settingName: 'colorFormat',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  defaultValue: 'original',
  options: [
    {
      title: (): Platform.UIString.LocalizedString => ls`Set color format as authored`,
      text: (): Platform.UIString.LocalizedString => ls`As authored`,
      value: 'original',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Set color format to HEX`,
      text: 'HEX: #dac0de',
      value: 'hex',
      raw: true,
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Set color format to RGB`,
      text: 'RGB: rgb(128 255 255)',
      value: 'rgb',
      raw: true,
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Set color format to HSL`,
      text: 'HSL: hsl(300deg 80% 90%)',
      value: 'hsl',
      raw: true,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.APPEARANCE,
  title: (): Platform.UIString.LocalizedString => ls`Enable Ctrl + 1-9 shortcut to switch panels`,
  titleMac: (): Platform.UIString.LocalizedString => ls`Enable ⌘ + 1-9 shortcut to switch panels`,
  settingName: 'shortcutPanelSwitch',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
});


Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.GLOBAL,
  settingName: 'currentDockState',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  defaultValue: 'right',
  options: [
    {
      value: 'right',
      text: (): Platform.UIString.LocalizedString => ls`Right`,
      title: (): Platform.UIString.LocalizedString => ls`Dock to right`,
    },
    {
      value: 'bottom',
      text: (): Platform.UIString.LocalizedString => ls`Bottom`,
      title: (): Platform.UIString.LocalizedString => ls`Dock to bottom`,
    },
    {
      value: 'left',
      text: (): Platform.UIString.LocalizedString => ls`Left`,
      title: (): Platform.UIString.LocalizedString => ls`Dock to left`,
    },
    {
      value: 'undocked',
      text: (): Platform.UIString.LocalizedString => ls`Undocked`,
      title: (): Platform.UIString.LocalizedString => ls`Undock into separate window`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  settingName: 'activeKeybindSet',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  defaultValue: 'devToolsDefault',
  options: [
    {
      value: 'devToolsDefault',
      title: (): Platform.UIString.LocalizedString => ls`DevTools (Default)`,
      text: (): Platform.UIString.LocalizedString => ls`DevTools (Default)`,
    },
    {
      value: 'vsCode',
      title: (): Platform.UIString.LocalizedString => ls`Visual Studio Code`,
      text: (): Platform.UIString.LocalizedString => ls`Visual Studio Code`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  settingName: 'userShortcuts',
  settingType: Common.Settings.SettingTypeObject.ARRAY,
  defaultValue: [],
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  category: UI.ViewManager.ViewLocationCategoryValues.DRAWER,
  async loadResolver() {
    return UI.InspectorView.InspectorView.instance();
  },
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.DRAWER_SIDEBAR,
  category: UI.ViewManager.ViewLocationCategoryValues.DRAWER_SIDEBAR,
  async loadResolver() {
    return UI.InspectorView.InspectorView.instance();
  },
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.PANEL,
  category: UI.ViewManager.ViewLocationCategoryValues.PANEL,
  async loadResolver() {
    return UI.InspectorView.InspectorView.instance();
  },
});
