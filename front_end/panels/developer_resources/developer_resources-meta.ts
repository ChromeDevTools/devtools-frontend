// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as DeveloperResources from './developer_resources.js';

const UIStrings = {
  /**
   * @description Title for developer resources panel
   */
  developerResources: 'Developer resources',
  /**
   * @description Command for showing the developer resources panel
   */
  showDeveloperResources: 'Show Developer resources',
};
const str_ = i18n.i18n.registerUIStrings('panels/developer_resources/developer_resources-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedDeveloperResourcesModule: (typeof DeveloperResources|undefined);

async function loadDeveloperResourcesModule(): Promise<typeof DeveloperResources> {
  if (!loadedDeveloperResourcesModule) {
    loadedDeveloperResourcesModule = await import('./developer_resources.js');
  }
  return loadedDeveloperResourcesModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'developer-resources',
  title: i18nLazyString(UIStrings.developerResources),
  commandPrompt: i18nLazyString(UIStrings.showDeveloperResources),
  order: 100,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const DeveloperResources = await loadDeveloperResourcesModule();
    return new DeveloperResources.DeveloperResourcesView.DeveloperResourcesView();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [SDK.PageResourceLoader.ResourceKey];
  },
  destination: Common.Revealer.RevealerDestination.DEVELOPER_RESOURCES_PANEL,
  async loadRevealer() {
    const DeveloperResources = await loadDeveloperResourcesModule();
    return new DeveloperResources.DeveloperResourcesView.DeveloperResourcesRevealer();
  },
});
