// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as UI from '../../../../ui/legacy/legacy.js';

import type * as QuickOpen from './quick_open.js';

const UIStrings = {
  /**
   *@description Title of action that opens a file
   */
  openFile: 'Open file',
  /**
   *@description Title of command that runs a Quick Open command
   */
  runCommand: 'Run command',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/quick_open/quick_open-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedQuickOpenModule: (typeof QuickOpen|undefined);

async function loadQuickOpenModule(): Promise<typeof QuickOpen> {
  if (!loadedQuickOpenModule) {
    loadedQuickOpenModule = await import('./quick_open.js');
  }
  return loadedQuickOpenModule;
}

UI.ActionRegistration.registerActionExtension({
  actionId: 'quick-open.show-command-menu',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.runCommand),
  async loadActionDelegate() {
    const QuickOpen = await loadQuickOpenModule();
    return new QuickOpen.CommandMenu.ShowActionDelegate();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+Shift+P',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+Shift+P',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      shortcut: 'F1',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'quick-open.show',
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.openFile),
  async loadActionDelegate() {
    const QuickOpen = await loadQuickOpenModule();
    return new QuickOpen.QuickOpen.ShowActionDelegate();
  },
  order: 100,
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+P',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+O',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+P',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+O',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ContextMenu.registerItem({
  location: UI.ContextMenu.ItemLocation.MAIN_MENU_DEFAULT,
  actionId: 'quick-open.show-command-menu',
  order: undefined,
});

UI.ContextMenu.registerItem({
  location: UI.ContextMenu.ItemLocation.MAIN_MENU_DEFAULT,
  actionId: 'quick-open.show',
  order: undefined,
});
