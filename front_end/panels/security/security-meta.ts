// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Security from './security.js';

const UIStrings = {
  /**
    *@description Title of the security panel
    */
  security: 'Security',
  /**
    *@description Command to open the security panel
    */
  showSecurity: 'Show Security',
};
const str_ = i18n.i18n.registerUIStrings('panels/security/security-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedSecurityModule: (typeof Security|undefined);

async function loadSecurityModule(): Promise<typeof Security> {
  if (!loadedSecurityModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('panels/security');
    loadedSecurityModule = await import('./security.js');
  }
  return loadedSecurityModule;
}

// COHERENT BEGIN

// UI.ViewManager.registerViewExtension({
//   location: UI.ViewManager.ViewLocationValues.PANEL,
//   id: 'security',
//   title: i18nLazyString(UIStrings.security),
//   commandPrompt: i18nLazyString(UIStrings.showSecurity),
//   order: 80,
//   persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
//   async loadView() {
//     const Security = await loadSecurityModule();
//     return Security.SecurityPanel.SecurityPanel.instance();
//   },
// });

// COHERENT END
