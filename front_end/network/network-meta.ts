// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Network from './network.js';

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Command for showing the 'Network' tool
  */
  showNetwork: 'Show Network',
  /**
  *@description Title of the Network tool
  */
  network: 'Network',
  /**
  *@description Command for showing the 'Network request blocking' tool
  */
  showNetworkRequestBlocking: 'Show Network request blocking',
  /**
  *@description Title of the 'Network request blocking' tool in the bottom drawer
  */
  networkRequestBlocking: 'Network request blocking',
  /**
  *@description Command for showing the 'Network conditions' tool
  */
  showNetworkConditions: 'Show Network conditions',
  /**
  *@description Title of the 'Network conditions' tool in the bottom drawer
  */
  networkConditions: 'Network conditions',
  /**
  *@description A tag of Network Conditions tool that can be searched in the command menu
  */
  diskCache: 'disk cache',
  /**
  *@description A tag of Network Conditions tool that can be searched in the command menu
  */
  networkThrottling: 'network throttling',
  /**
  *@description A tag of Network Conditions tool that can be searched in the command menu
  */
  useragent: 'useragent',
  /**
  *@description A tag of Network Conditions tool that can be searched in the command menu
  */
  userAgent: 'user agent',
  /**
  *@description A tag of Network Conditions tool that can be searched in the command menu
  */
  userdagent: 'user-agent',
  /**
  *@description Command for showing the 'Search' tool
  */
  showSearch: 'Show Search',
  /**
  *@description Title of a search bar or tool
  */
  search: 'Search',
  /**
  *@description Title of an action in the network tool to toggle recording
  */
  recordNetworkLog: 'Record network log',
  /**
  *@description Title of an action in the network tool to toggle recording
  */
  stopRecordingNetworkLog: 'Stop recording network log',
  /**
  *@description Title of an action that hides network request details
  */
  hideRequestDetails: 'Hide request details',
  /**
  *@description Title of a setting under the Network category in Settings
  */
  colorcodeResourceTypes: 'Color-code resource types',
  /**
  *@description A tag of Network color-code resource types that can be searched in the command menu
  */
  colorCode: 'color code',
  /**
  *@description A tag of Network color-code resource types that can be searched in the command menu
  */
  resourceType: 'resource type',
  /**
  *@description Title of a setting under the Network category that can be invoked through the Command Menu
  */
  colorCodeByResourceType: 'Color code by resource type',
  /**
  *@description Title of a setting under the Network category that can be invoked through the Command Menu
  */
  useDefaultColors: 'Use default colors',
  /**
  *@description Title of a setting under the Network category in Settings
  */
  groupNetworkLogByFrame: 'Group network log by frame',
  /**
  *@description A tag of Group Network by frame setting that can be searched in the command menu
  */
  netWork: 'network',
  /**
  *@description A tag of Group Network by frame setting that can be searched in the command menu
  */
  frame: 'frame',
  /**
  *@description A tag of Group Network by frame setting that can be searched in the command menu
  */
  group: 'group',
  /**
  *@description Title of a setting under the Network category that can be invoked through the Command Menu
  */
  groupNetworkLogItemsByFrame: 'Group network log items by frame',
  /**
  *@description Title of a setting under the Network category that can be invoked through the Command Menu
  */
  dontGroupNetworkLogItemsByFrame: 'Don\'t group network log items by frame',
};
const str_ = i18n.i18n.registerUIStrings('network/network-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
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
  commandPrompt: i18nString(UIStrings.showNetwork),
  title: i18nString(UIStrings.network),
  order: 40,
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.NetworkPanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'network.blocked-urls',
  commandPrompt: i18nString(UIStrings.showNetworkRequestBlocking),
  title: i18nString(UIStrings.networkRequestBlocking),
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
  commandPrompt: i18nString(UIStrings.showNetworkConditions),
  title: i18nString(UIStrings.networkConditions),
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 40,
  tags: [
    i18nString(UIStrings.diskCache),
    i18nString(UIStrings.networkThrottling),
    i18nString(UIStrings.userdagent),
    i18nString(UIStrings.userAgent),
    i18nString(UIStrings.userdagent),
  ],
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.NetworkConfigView.NetworkConfigView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NETWORK_SIDEBAR,
  id: 'network.search-network-tab',
  commandPrompt: i18nString(UIStrings.showSearch),
  title: i18nString(UIStrings.search),
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
      title: i18nString(UIStrings.recordNetworkLog),
    },
    {
      value: false,
      title: i18nString(UIStrings.stopRecordingNetworkLog),
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
  title: i18nString(UIStrings.hideRequestDetails),
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
  title: i18nString(UIStrings.search),
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
  title: i18nString(UIStrings.colorcodeResourceTypes),
  settingName: 'networkColorCodeResourceTypes',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  tags: [
    i18nString(UIStrings.colorCode),
    i18nString(UIStrings.resourceType),
  ],
  options: [
    {
      value: true,
      title: i18nString(UIStrings.colorCodeByResourceType),
    },
    {
      value: false,
      title: i18nString(UIStrings.useDefaultColors),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.NETWORK,
  title: i18nString(UIStrings.groupNetworkLogByFrame),
  settingName: 'network.group-by-frame',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  tags: [
    i18nString(UIStrings.netWork),
    i18nString(UIStrings.frame),
    i18nString(UIStrings.group),
  ],
  options: [
    {
      value: true,
      title: i18nString(UIStrings.groupNetworkLogItemsByFrame),
    },
    {
      value: false,
      title: i18nString(UIStrings.dontGroupNetworkLogItemsByFrame),
    },
  ],
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.NETWORK_SIDEBAR,
  category: UI.ViewManager.ViewLocationCategoryValues.NETWORK,
  async loadResolver() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.NetworkPanel.instance();
  },
});
