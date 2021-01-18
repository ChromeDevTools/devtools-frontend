// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Network from './network.js';

let loadedNetworkModule: (typeof Network|undefined);

async function loadNetworkModule(): Promise<typeof Network> {
  if (!loadedNetworkModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('network');
    loadedNetworkModule = await import('./network.js');
  }
  return loadedNetworkModule;
}

function maybeRetrieveContextTypes<T = unknown>(getClassCallBack: (loadedNetworkModule: typeof Network) => T[]): T[] {
  if (loadedNetworkModule === undefined) {
    return [];
  }
  return getClassCallBack(loadedNetworkModule);
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'network',
  commandPrompt: 'Show Network',
  title: (): Platform.UIString.LocalizedString => ls`Network`,
  order: 40,
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.NetworkPanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'network.blocked-urls',
  commandPrompt: 'Show Network request blocking',
  title: (): Platform.UIString.LocalizedString => ls`Network request blocking`,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 60,
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.BlockedURLsPane.BlockedURLsPane.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'network.config',
  commandPrompt: 'Show Network conditions',
  title: (): Platform.UIString.LocalizedString => ls`Network conditions`,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 40,
  tags: [
    (): Platform.UIString.LocalizedString => ls`disk cache`,
    (): Platform.UIString.LocalizedString => ls`network throttling`,
    (): Platform.UIString.LocalizedString => ls`useragent`,
    (): Platform.UIString.LocalizedString => ls`user agent`,
    (): Platform.UIString.LocalizedString => ls`user-agent`,
  ],
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.NetworkConfigView.NetworkConfigView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NETWORK_SIDEBAR,
  id: 'network.search-network-tab',
  commandPrompt: 'Show Search',
  title: (): Platform.UIString.LocalizedString => ls`Search`,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.SearchNetworkView.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'network.toggle-recording',
  category: UI.ActionRegistration.ActionCategory.NETWORK,
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.LARGEICON_STOP_RECORDING,
  toggleWithRedColor: true,
  contextTypes() {
    return maybeRetrieveContextTypes(Network => [Network.NetworkPanel.NetworkPanel]);
  },
  async loadActionDelegate() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.ActionDelegate.instance();
  },
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Record network log`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Stop recording network log`,
    },
  ],
  bindings: [
    {
      shortcut: 'Ctrl+E',
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
    },
    {
      shortcut: 'Meta+E',
      platform: UI.ActionRegistration.Platforms.Mac,
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'network.hide-request-details',
  category: UI.ActionRegistration.ActionCategory.NETWORK,
  title: (): Platform.UIString.LocalizedString => ls`Hide request details`,
  contextTypes() {
    return maybeRetrieveContextTypes(Network => [Network.NetworkPanel.NetworkPanel]);
  },
  async loadActionDelegate() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.ActionDelegate.instance();
  },
  bindings: [
    {
      shortcut: 'Esc',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'network.search',
  category: UI.ActionRegistration.ActionCategory.NETWORK,
  title: (): Platform.UIString.LocalizedString => ls`Search`,
  contextTypes() {
    return maybeRetrieveContextTypes(Network => [Network.NetworkPanel.NetworkPanel]);
  },
  async loadActionDelegate() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.ActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+F',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+F',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.NETWORK,
  title: (): Platform.UIString.LocalizedString => ls`Color-code resource types`,
  settingName: 'networkColorCodeResourceTypes',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  tags: [
    (): Platform.UIString.LocalizedString => ls`color code`,
    (): Platform.UIString.LocalizedString => ls`resource type`,
  ],
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Color code by resource type`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Use default colors`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.NETWORK,
  title: (): Platform.UIString.LocalizedString => ls`Group network log by frame`,
  settingName: 'network.group-by-frame',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  tags: [
    (): Platform.UIString.LocalizedString => ls`network`,
    (): Platform.UIString.LocalizedString => ls`frame`,
    (): Platform.UIString.LocalizedString => ls`group`,
  ],
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Group network log items by frame`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Don't group network log items by frame`,
    },
  ],
});
