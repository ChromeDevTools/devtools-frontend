// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Security from './security.js';

const UIStrings = {
  /**
   *@description Default Title of the security panel
   */
  security: 'Security',
  /**
   *@description Title of security and privacy panel. This is used when the kDevToolsPrivacyUI feature flag is enabled.
   */
  securityAndPrivacy: 'Security & Privacy',
  /**
   *@description Default command to open the security panel
   */
  showSecurity: 'Show Security',
  /**
   *@description Command to open the security and privacy panel. This is used when the kDevToolPrivacyUI feature flag is enabled
   */
  showSecurityAndPrivacy: 'Show Security and Privacy',
};

const str_ = i18n.i18n.registerUIStrings('panels/security/security-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedSecurityModule: (typeof Security|undefined);

async function loadSecurityModule(): Promise<typeof Security> {
  if (!loadedSecurityModule) {
    loadedSecurityModule = await import('./security.js');
  }
  return loadedSecurityModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'security',
  title: () => Common.Settings.Settings.instance().getHostConfig().devToolsPrivacyUI?.enabled ?
      i18nLazyString(UIStrings.securityAndPrivacy)() :
      i18nLazyString(UIStrings.security)(),
  commandPrompt: () => Common.Settings.Settings.instance().getHostConfig().devToolsPrivacyUI?.enabled ?
      i18nLazyString(UIStrings.showSecurityAndPrivacy)() :
      i18nLazyString(UIStrings.showSecurity)(),
  order: 80,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Security = await loadSecurityModule();
    return Security.SecurityPanel.SecurityPanel.instance();
  },
});
