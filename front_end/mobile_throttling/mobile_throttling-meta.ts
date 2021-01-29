// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as MobileThrottling from './mobile_throttling.js';

export const UIStrings = {
  /**
  *@description Text for throttling the network
  */
  throttling: 'Throttling',
  /**
  *@description Command for showing the Mobile Throttling tool.
  */
  showThrottling: 'Show Throttling',
  /**
  *@description Title of an action in the network conditions tool to network offline
  */
  goOffline: 'Go offline',
  /**
   *@description A tag of Mobile related settings that can be searched in the command menu
  */
  device: 'device',
  /**
   *@description A tag of Network related actions that can be searched in the command menu
  */
  throttlingTag: 'throttling',
  /**
   *@description Title of an action in the network conditions tool to network low end mobile
  */
  enableSlowGThrottling: 'Enable slow 3G throttling',
  /**
   *@description Title of an action in the network conditions tool to network mid tier mobile
  */
  enableFastGThrottling: 'Enable fast 3G throttling',
  /**
   *@description Title of an action in the network conditions tool to network online
  */
  goOnline: 'Go online',
};
const str_ = i18n.i18n.registerUIStrings('mobile_throttling/mobile_throttling-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedMobileThrottlingModule: (typeof MobileThrottling|undefined);

async function loadMobileThrottlingModule(): Promise<typeof MobileThrottling> {
  if (!loadedMobileThrottlingModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('mobile_throttling');
    loadedMobileThrottlingModule = await import('./mobile_throttling.js');
  }
  return loadedMobileThrottlingModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'throttling-conditions',
  title: i18nString(UIStrings.throttling),
  commandPrompt: i18nString(UIStrings.showThrottling),
  order: 35,
  async loadView() {
    const MobileThrottling = await loadMobileThrottlingModule();
    return MobileThrottling.ThrottlingSettingsTab.ThrottlingSettingsTab.instance();
  },
  settings: [
    'customNetworkConditions',
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'network-conditions.network-offline',
  category: UI.ActionRegistration.ActionCategory.NETWORK,
  title: i18nString(UIStrings.goOffline),
  async loadActionDelegate() {
    const MobileThrottling = await loadMobileThrottlingModule();
    return MobileThrottling.ThrottlingManager.ActionDelegate.instance();
  },
  tags: [
    i18nString(UIStrings.device),
    i18nString(UIStrings.throttlingTag),
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'network-conditions.network-low-end-mobile',
  category: UI.ActionRegistration.ActionCategory.NETWORK,
  title: i18nString(UIStrings.enableSlowGThrottling),
  async loadActionDelegate() {
    const MobileThrottling = await loadMobileThrottlingModule();
    return MobileThrottling.ThrottlingManager.ActionDelegate.instance();
  },
  tags: [
    i18nString(UIStrings.device),
    i18nString(UIStrings.throttlingTag),
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'network-conditions.network-mid-tier-mobile',
  category: UI.ActionRegistration.ActionCategory.NETWORK,
  title: i18nString(UIStrings.enableFastGThrottling),
  async loadActionDelegate() {
    const MobileThrottling = await loadMobileThrottlingModule();
    return MobileThrottling.ThrottlingManager.ActionDelegate.instance();
  },
  tags: [
    i18nString(UIStrings.device),
    i18nString(UIStrings.throttlingTag),
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'network-conditions.network-online',
  category: UI.ActionRegistration.ActionCategory.NETWORK,
  title: i18nString(UIStrings.goOnline),
  async loadActionDelegate() {
    const MobileThrottling = await loadMobileThrottlingModule();
    return MobileThrottling.ThrottlingManager.ActionDelegate.instance();
  },
  tags: [
    i18nString(UIStrings.device),
    i18nString(UIStrings.throttlingTag),
  ],
});

Common.Settings.registerSettingExtension({
  settingName: 'customNetworkConditions',
  settingType: Common.Settings.SettingTypeObject.ARRAY,
  defaultValue: [],
});
