// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as InspectorMain from './inspector_main.js';

let loadedInspectorMainModule: (typeof InspectorMain|undefined);

async function loadInspectorMainModule(): Promise<typeof InspectorMain> {
  if (!loadedInspectorMainModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('inspector_main');
    loadedInspectorMainModule = await import('./inspector_main.js');
  }
  return loadedInspectorMainModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'rendering',
  title: (): Platform.UIString.LocalizedString => ls`Rendering`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Rendering`,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 50,
  async loadView() {
    const InspectorMain = await loadInspectorMainModule();
    return InspectorMain.RenderingOptions.RenderingOptionsView.instance();
  },
  tags: [
    (): Platform.UIString.LocalizedString => ls`paint`,
    (): Platform.UIString.LocalizedString => ls`layout`,
    (): Platform.UIString.LocalizedString => ls`fps`,
    (): Platform.UIString.LocalizedString => ls`CSS media type`,
    (): Platform.UIString.LocalizedString => ls`CSS media feature`,
    (): Platform.UIString.LocalizedString => ls`vision deficiency`,
    (): Platform.UIString.LocalizedString => ls`color vision deficiency`,
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.NAVIGATION,
  actionId: 'inspector_main.reload',
  async loadActionDelegate() {
    const InspectorMain = await loadInspectorMainModule();
    return InspectorMain.InspectorMain.ReloadActionDelegate.instance();
  },
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_REFRESH,
  title: (): Platform.UIString.LocalizedString => ls`Reload page`,
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+R',
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'F5',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+R',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.NAVIGATION,
  actionId: 'inspector_main.hard-reload',
  async loadActionDelegate() {
    const InspectorMain = await loadInspectorMainModule();
    return InspectorMain.InspectorMain.ReloadActionDelegate.instance();
  },
  title: (): Platform.UIString.LocalizedString => ls`Hard reload page`,
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Shift+Ctrl+R',
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Shift+F5',
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+F5',
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+F5',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Shift+Meta+R',
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.NETWORK,
  title: (): Platform.UIString.LocalizedString => ls`Force ad blocking on this site`,
  settingName: 'network.adBlockingEnabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Block ads on this site`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Show ads on this site, if allowed`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.GLOBAL,
  title: (): Platform.UIString.LocalizedString => ls`Auto-open DevTools for popups`,
  settingName: 'autoAttachToCreatedPages',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  order: 2,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Auto-open DevTools for popups`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not auto-open DevTools for popups`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.APPEARANCE,
  title: (): Platform.UIString.LocalizedString => ls`Don't show Chrome Data Saver warning`,
  settingName: 'disableDataSaverInfobar',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.APPEARANCE,
  title: (): Platform.UIString.LocalizedString => ls`Disable paused state overlay`,
  settingName: 'disablePausedStateOverlay',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
});
