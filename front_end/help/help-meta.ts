// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Help from './help.js';

export const UIStrings = {
  /**
  *@description Title of the 'What's New' tool in the bottom drawer
  */
  whatsNew: 'What\'s New',
  /**
  *@description Command for showing the 'What's New' tool in the bottom drawer
  */
  showWhatsNew: 'Show What\'s New',
};
const str_ = i18n.i18n.registerUIStrings('help/help-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedHelpModule: (typeof Help|undefined);

async function loadHelpModule(): Promise<typeof Help> {
  if (!loadedHelpModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('help');
    loadedHelpModule = await import('./help.js');
  }
  return loadedHelpModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'release-note',
  title: i18nString(UIStrings.whatsNew),
  commandPrompt: i18nString(UIStrings.showWhatsNew),
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 1,
  async loadView() {
    const Help = await loadHelpModule();
    return Help.ReleaseNoteView.ReleaseNoteView.instance();
  },
});
