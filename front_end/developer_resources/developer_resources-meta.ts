// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as DeveloperResources from './developer_resources.js';

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
  title: (): Platform.UIString.LocalizedString => ls`Developer Resources`,
  commandPrompt: 'Show Developer Resources',
  order: 100,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  experiment: Root.Runtime.ExperimentName.DEVELOPER_RESOURCES_VIEW,
  async loadView() {
    const DeveloperResources = await loadDeveloperResourcesModule();
    return DeveloperResources.DeveloperResourcesView.DeveloperResourcesView.instance();
  },
});
