// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Lighthouse from './lighthouse.js';

export const UIStrings = {
  /**
  *@description Title of the 'Lighthouse' tool
  */
  lighthouse: '`Lighthouse`',
  /**
  *@description A tag of Application Panel that can be searched in the command menu
  */
  pwa: '`pwa`',
  /**
   *@description A tag of Lighthouse tool that can be searched in the command menu.
   */
  lighthouseTag: '`lighthouse`',
  /**
  *@description Command for showing the 'Lighthouse' tool
  */
  showLighthouse: 'Show `Lighthouse`',
};

const str_ = i18n.i18n.registerUIStrings('lighthouse/lighthouse-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedLighthouseModule: (typeof Lighthouse|undefined);

async function loadLighthouseModule(): Promise<typeof Lighthouse> {
  if (!loadedLighthouseModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('lighthouse');
    loadedLighthouseModule = await import('./lighthouse.js');
  }
  return loadedLighthouseModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'lighthouse',
  title: i18nString(UIStrings.lighthouse),
  commandPrompt: i18nString(UIStrings.showLighthouse),
  order: 90,
  async loadView() {
    const Lighthouse = await loadLighthouseModule();
    return Lighthouse.LighthousePanel.LighthousePanel.instance();
  },
  tags: [
    i18nString(UIStrings.lighthouseTag),
    i18nString(UIStrings.pwa),
  ],
});
