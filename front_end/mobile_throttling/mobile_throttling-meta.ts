// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
  commandPrompt: 'Show Throttling',
  order: 35,
  async loadView() {
    const MobileThrottling = await loadMobileThrottlingModule();
    return MobileThrottling.ThrottlingSettingsTab.ThrottlingSettingsTab.instance();
  },
  settings: [
    'customNetworkConditions',
  ],
});
