// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as DeveloperResources from './developer_resources.js';

export const UIStrings = {
  /**
   * @description Title for developer resources panel
   */
  developerResources: 'Developer Resources',
  /**
   * @description Command for showing the developer resources panel
   */
  showDeveloperResources: 'Show Developer Resources',
};
const str_ = i18n.i18n.registerUIStrings('developer_resources/developer_resources-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedDeveloperResourcesModule: (typeof DeveloperResources|undefined);

async function loadDeveloperResourcesModule(): Promise<typeof DeveloperResources> {
  if (!loadedDeveloperResourcesModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('developer_resources');
    loadedDeveloperResourcesModule = await import('./developer_resources.js');
  }
  return loadedDeveloperResourcesModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'resource-loading-pane',
  title: i18nString(UIStrings.developerResources),
  commandPrompt: i18nString(UIStrings.showDeveloperResources),
  order: 100,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  experiment: Root.Runtime.ExperimentName.DEVELOPER_RESOURCES_VIEW,
  async loadView() {
    const DeveloperResources = await loadDeveloperResourcesModule();
    return DeveloperResources.DeveloperResourcesView.DeveloperResourcesView.instance();
  },
});
