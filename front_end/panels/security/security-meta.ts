// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Security from './security.js';

const UIStrings = {
  /**
   * @description Default Title of the security panel
   */
  security: 'Security',
  /**
   * @description Title of privacy and security panel. This is used when the kDevToolsPrivacyUI feature flag is enabled.
   */
  PrivacyAndSecurity: 'Privacy and security',
  /**
   * @description Default command to open the security panel
   */
  showSecurity: 'Show Security',
  /**
   * @description Command to open the privacy and security panel. This is used when the kDevToolPrivacyUI feature flag is enabled
   */
  showPrivacyAndSecurity: 'Show Privacy and security',
} as const;

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
  title: () => Root.Runtime.hostConfig.devToolsPrivacyUI?.enabled ? i18nLazyString(UIStrings.PrivacyAndSecurity)() :
                                                                    i18nLazyString(UIStrings.security)(),
  commandPrompt: () => Root.Runtime.hostConfig.devToolsPrivacyUI?.enabled ?
      i18nLazyString(UIStrings.showPrivacyAndSecurity)() :
      i18nLazyString(UIStrings.showSecurity)(),
  order: 80,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Security = await loadSecurityModule();
    return Security.SecurityPanel.SecurityPanel.instance();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      Security.CookieReportView.CookieReportView,
    ];
  },
  destination: Common.Revealer.RevealerDestination.SECURITY_PANEL,
  async loadRevealer() {
    const Security = await loadSecurityModule();
    return new Security.SecurityPanel.SecurityRevealer();
  },
});
