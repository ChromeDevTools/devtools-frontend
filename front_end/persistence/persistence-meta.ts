// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
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
  /**
  *@description Title of a setting under the Persistence category in Settings
  */
  enableLocalOverrides: 'Enable Local Overrides',
  /**
   *@description A tag of Enable Local Overrides setting that can be searched in the command menu
  */
  interception: 'interception',
  /**
   *@description A tag of Enable Local Overrides setting that can be searched in the command menu
  */
  override: 'override',
  /**
   *@description A tag of Group Network by frame setting that can be searched in the command menu
  */
  network: 'network',
  /**
   *@description A tag of Enable Local Overrides setting that can be searched in the command menu
  */
  rewrite: 'rewrite',
  /**
   *@description A tag of Enable Local Overrides setting that can be searched in the command menu
  */
  request: 'request',
  /**
   *@description Title of a setting under the Persistence category that can be invoked through the Command Menu
  */
  enableOverrideNetworkRequests: 'Enable override network requests',
  /**
   *@description Title of a setting under the Persistence category that can be invoked through the Command Menu
  */
  disableOverrideNetworkRequests: 'Disable override network requests',
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

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.PERSISTENCE,
  title: i18nString(UIStrings.enableLocalOverrides),
  settingName: 'persistenceNetworkOverridesEnabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  tags: [
    i18nString(UIStrings.interception),
    i18nString(UIStrings.override),
    i18nString(UIStrings.network),
    i18nString(UIStrings.rewrite),
    i18nString(UIStrings.request),
  ],
  options: [
    {
      value: true,
      title: i18nString(UIStrings.enableOverrideNetworkRequests),
    },
    {
      value: false,
      title: i18nString(UIStrings.disableOverrideNetworkRequests),
    },
  ],
});
