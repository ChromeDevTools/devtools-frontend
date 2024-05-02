// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Webauthn from './webauthn.js';

const UIStrings = {
  /**
   *@description Title of WebAuthn tab in bottom drawer.
   */
  webauthn: 'WebAuthn',
  /**
   *@description Command for showing the WebAuthn tab in bottom drawer.
   */
  showWebauthn: 'Show WebAuthn',
};
const str_ = i18n.i18n.registerUIStrings('panels/webauthn/webauthn-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedWebauthnModule: (typeof Webauthn|undefined);

async function loadWebauthnModule(): Promise<typeof Webauthn> {
  if (!loadedWebauthnModule) {
    loadedWebauthnModule = await import('./webauthn.js');
  }
  return loadedWebauthnModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'webauthn-pane',
  title: i18nLazyString(UIStrings.webauthn),
  commandPrompt: i18nLazyString(UIStrings.showWebauthn),
  order: 100,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Webauthn = await loadWebauthnModule();
    return new Webauthn.WebauthnPane.WebauthnPaneImpl();
  },
});
