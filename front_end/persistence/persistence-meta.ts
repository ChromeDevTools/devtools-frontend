// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Persistence from './persistence.js';

export const UIStrings = {
  /**
  *@description Text of a DOM element in Workspace Settings Tab of the Workspace settings in Settings
  */
  workspace: 'Workspace',
  /**
  *@description Command for showing the Workspace tool in Settings
  */
  showWorkspace: 'Show Workspace',
};
const str_ = i18n.i18n.registerUIStrings('persistence/persistence-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedPersistenceModule: (typeof Persistence|undefined);

async function loadPersistenceModule(): Promise<typeof Persistence> {
  if (!loadedPersistenceModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('persistence');
    loadedPersistenceModule = await import('./persistence.js');
  }
  return loadedPersistenceModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'workspace',
  title: i18nString(UIStrings.workspace),
  commandPrompt: i18nString(UIStrings.showWorkspace),
  order: 1,
  async loadView() {
    const Persistence = await loadPersistenceModule();
    return Persistence.WorkspaceSettingsTab.WorkspaceSettingsTab.instance();
  },
});
