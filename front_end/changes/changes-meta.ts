// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Changes from './changes.js';

let loadedChangesModule: (typeof Changes|undefined);

export const UIStrings = {
  /**
   * @description Title of the 'Changes' tool in the bottom drawer
   */
  changes: 'Changes',
  /**
   * @description Command for showing the 'Changes' tool in the bottom drawer
   */
  showChanges: 'Show Changes',
};
const str_ = i18n.i18n.registerUIStrings('changes/changes-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

async function loadChangesModule(): Promise<typeof Changes> {
  if (!loadedChangesModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('changes');
    loadedChangesModule = await import('./changes.js');
  }
  return loadedChangesModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'changes.changes',
  title: i18nString(UIStrings.changes),
  commandPrompt: i18nString(UIStrings.showChanges),
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Changes = await loadChangesModule();
    return Changes.ChangesView.ChangesView.instance();
  },
});
