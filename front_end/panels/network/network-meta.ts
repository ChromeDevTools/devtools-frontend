// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Network from './network.js';

const UIStrings = {
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
  /**
   *@description Title of a button for clearing the network log
   */
  clear: 'Clear network log',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/network-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedNetworkModule: (typeof Network|undefined);

async function loadNetworkModule(): Promise<typeof Network> {
  if (!loadedNetworkModule) {
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
  commandPrompt: i18nLazyString(UIStrings.showNetwork),
  title: i18nLazyString(UIStrings.network),
  order: 40,
  condition: Root.Runtime.ConditionName.REACT_NATIVE_UNSTABLE_NETWORK_PANEL,
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.NetworkPanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'network.blocked-urls',
  commandPrompt: i18nLazyString(UIStrings.showNetworkRequestBlocking),
  title: i18nLazyString(UIStrings.networkRequestBlocking),
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
  commandPrompt: i18nLazyString(UIStrings.showNetworkConditions),
  title: i18nLazyString(UIStrings.networkConditions),
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 40,
  tags: [
    i18nLazyString(UIStrings.diskCache),
    i18nLazyString(UIStrings.networkThrottling),
    i18n.i18n.lockedLazyString('useragent'),
    i18n.i18n.lockedLazyString('user agent'),
    i18n.i18n.lockedLazyString('user-agent'),
  ],
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.NetworkConfigView.NetworkConfigView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NETWORK_SIDEBAR,
  id: 'network.search-network-tab',
  commandPrompt: i18nLazyString(UIStrings.showSearch),
  title: i18nLazyString(UIStrings.search),
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.SearchNetworkView.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'network.toggle-recording',
  category: UI.ActionRegistration.ActionCategory.NETWORK,
  iconClass: UI.ActionRegistration.IconClass.START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.STOP_RECORDING,
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
      title: i18nLazyString(UIStrings.recordNetworkLog),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.stopRecordingNetworkLog),
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
  actionId: 'network.clear',
  category: UI.ActionRegistration.ActionCategory.NETWORK,
  title: i18nLazyString(UIStrings.clear),
  iconClass: UI.ActionRegistration.IconClass.CLEAR,
  async loadActionDelegate() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.ActionDelegate.instance();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Network => [Network.NetworkPanel.NetworkPanel]);
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
  actionId: 'network.hide-request-details',
  category: UI.ActionRegistration.ActionCategory.NETWORK,
  title: i18nLazyString(UIStrings.hideRequestDetails),
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
  title: i18nLazyString(UIStrings.search),
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
  category: Common.Settings.SettingCategory.NETWORK,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.colorcodeResourceTypes),
  settingName: 'networkColorCodeResourceTypes',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  tags: [
    i18nLazyString(UIStrings.colorCode),
    i18nLazyString(UIStrings.resourceType),
  ],
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.colorCodeByResourceType),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.useDefaultColors),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NETWORK,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.groupNetworkLogByFrame),
  settingName: 'network.group-by-frame',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  tags: [
    i18nLazyString(UIStrings.netWork),
    i18nLazyString(UIStrings.frame),
    i18nLazyString(UIStrings.group),
  ],
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.groupNetworkLogItemsByFrame),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.dontGroupNetworkLogItemsByFrame),
    },
  ],
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.NETWORK_SIDEBAR,
  category: UI.ViewManager.ViewLocationCategory.NETWORK,
  async loadResolver() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.NetworkPanel.instance();
  },
});

UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      SDK.NetworkRequest.NetworkRequest,
      SDK.Resource.Resource,
      Workspace.UISourceCode.UISourceCode,
    ];
  },
  async loadProvider() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.ContextMenuProvider.instance();
  },
  experiment: undefined,
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      SDK.NetworkRequest.NetworkRequest,
    ];
  },
  destination: Common.Revealer.RevealerDestination.NETWORK_PANEL,
  async loadRevealer() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.RequestRevealer.instance();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [NetworkForward.UIRequestLocation.UIRequestLocation];
  },
  async loadRevealer() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.RequestLocationRevealer.instance();
  },
  destination: undefined,
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [NetworkForward.NetworkRequestId.NetworkRequestId];
  },
  destination: Common.Revealer.RevealerDestination.NETWORK_PANEL,
  async loadRevealer() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.RequestIdRevealer.instance();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      NetworkForward.UIFilter.UIRequestFilter,
    ];
  },
  destination: Common.Revealer.RevealerDestination.NETWORK_PANEL,
  async loadRevealer() {
    const Network = await loadNetworkModule();
    return Network.NetworkPanel.NetworkLogWithFilterRevealer.instance();
  },
});
