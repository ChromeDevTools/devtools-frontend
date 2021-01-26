// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
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
