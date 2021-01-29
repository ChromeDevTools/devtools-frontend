// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
