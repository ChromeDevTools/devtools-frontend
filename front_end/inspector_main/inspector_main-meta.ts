// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

const UIStrings = {
  /**
  *@description Title of the Rendering tool
  */
  rendering: 'Rendering',
  /**
  *@description Command for showing the 'Rendering' tool
  */
  showRendering: 'Show Rendering',
  /**
  *@description Command Menu search query that points to the Rendering tool
  */
  paint: 'paint',
  /**
  *@description Command Menu search query that points to the Rendering tool
  */
  layout: 'layout',
  /**
  *@description Command Menu search query that points to the Rendering tool
  */
  fps: 'fps',
  /**
  *@description Command Menu search query that points to the Rendering tool
  */
  cssMediaType: 'CSS media type',
  /**
  *@description Command Menu search query that points to the Rendering tool
  */
  cssMediaFeature: 'CSS media feature',
  /**
  *@description Command Menu search query that points to the Rendering tool
  */
  visionDeficiency: 'vision deficiency',
  /**
  *@description Command Menu search query that points to the Rendering tool
  */
  colorVisionDeficiency: 'color vision deficiency',
  /**
  *@description Title of an action in the inspector main tool to reload
  */
  reloadPage: 'Reload page',
  /**
  *@description Title of an action in the inspector main tool to hard reload
  */
  hardReloadPage: 'Hard reload page',
  /**
  *@description Title of a setting under the Network category in Settings
  */
  forceAdBlocking: 'Force ad blocking on this site',
  /**
  *@description Title of a setting under the Network category that can be invoked through the Command Menu
  */
  blockAds: 'Block ads on this site',
  /**
  *@description Title of a setting under the Network category that can be invoked through the Command Menu
  */
  showAds: 'Show ads on this site, if allowed',
  /**
  *@description Title of a setting under the DevTools category that can be invoked through the Command Menu
  */
  autoOpenDevTools: 'Auto-open DevTools for popups',
  /**
  *@description Title of a setting under the DevTools category that can be invoked through the Command Menu
  */
  doNotAutoOpen: 'Do not auto-open DevTools for popups',
  /**
  *@description Title of a setting under the Appearance category in Settings
  */
  disablePaused: 'Disable paused state overlay',
};
const str_ = i18n.i18n.registerUIStrings('inspector_main/inspector_main-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

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
  title: i18nLazyString(UIStrings.rendering),
  commandPrompt: i18nLazyString(UIStrings.showRendering),
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 50,
  async loadView() {
    const InspectorMain = await loadInspectorMainModule();
    return InspectorMain.RenderingOptions.RenderingOptionsView.instance();
  },
  tags: [
    i18nLazyString(UIStrings.paint),
    i18nLazyString(UIStrings.layout),
    i18nLazyString(UIStrings.fps),
    i18nLazyString(UIStrings.cssMediaType),
    i18nLazyString(UIStrings.cssMediaFeature),
    i18nLazyString(UIStrings.visionDeficiency),
    i18nLazyString(UIStrings.colorVisionDeficiency),
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
  title: i18nLazyString(UIStrings.reloadPage),
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
  title: i18nLazyString(UIStrings.hardReloadPage),
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
  category: Common.Settings.SettingCategory.NETWORK,
  title: i18nLazyString(UIStrings.forceAdBlocking),
  settingName: 'network.adBlockingEnabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.blockAds),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.showAds),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.GLOBAL,
  title: i18nLazyString(UIStrings.autoOpenDevTools),
  settingName: 'autoAttachToCreatedPages',
  settingType: Common.Settings.SettingType.BOOLEAN,
  order: 2,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.autoOpenDevTools),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotAutoOpen),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.APPEARANCE,
  title: i18nLazyString(UIStrings.disablePaused),
  settingName: 'disablePausedStateOverlay',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

UI.Toolbar.registerToolbarItem({
  async loadItem() {
    const InspectorMain = await loadInspectorMainModule();
    return InspectorMain.InspectorMain.NodeIndicator.instance();
  },
  order: 2,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_LEFT,
  showLabel: undefined,
  condition: undefined,
  separator: undefined,
  actionId: undefined,
});
