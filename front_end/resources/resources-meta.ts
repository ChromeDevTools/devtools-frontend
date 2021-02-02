// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Resources from './resources.js';

let loadedResourcesModule: (typeof Resources|undefined);

async function loadResourcesModule(): Promise<typeof Resources> {
  if (!loadedResourcesModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('resources');
    loadedResourcesModule = await import('./resources.js');
  }
  return loadedResourcesModule;
}

function maybeRetrieveContextTypes<T = unknown>(getClassCallBack: (elementsModule: typeof Resources) => T[]): T[] {
  if (loadedResourcesModule === undefined) {
    return [];
  }
  return getClassCallBack(loadedResourcesModule);
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'resources',
  title: (): Platform.UIString.LocalizedString => ls`Application`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Application`,
  order: 70,
  async loadView() {
    const Resources = await loadResourcesModule();
    return Resources.ResourcesPanel.ResourcesPanel.instance();
  },
  tags: [(): Platform.UIString.LocalizedString => ls`pwa`],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.RESOURCES,
  actionId: 'resources.clear',
  title: (): Platform.UIString.LocalizedString => ls`Clear site data`,
  async loadActionDelegate() {
    const Resources = await loadResourcesModule();
    return Resources.ClearStorageView.ActionDelegate.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.RESOURCES,
  actionId: 'resources.clear-incl-third-party-cookies',
  title: (): Platform.UIString.LocalizedString => ls`Clear site data (including third-party cookies)`,
  async loadActionDelegate() {
    const Resources = await loadResourcesModule();
    return Resources.ClearStorageView.ActionDelegate.instance();
  },
});


UI.ActionRegistration.registerActionExtension({
  actionId: 'background-service.toggle-recording',
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.LARGEICON_STOP_RECORDING,
  toggleWithRedColor: true,
  contextTypes() {
    return maybeRetrieveContextTypes(Resources => [Resources.BackgroundServiceView.BackgroundServiceView]);
  },
  async loadActionDelegate() {
    const Resources = await loadResourcesModule();
    return Resources.BackgroundServiceView.ActionDelegate.instance();
  },
  category: UI.ActionRegistration.ActionCategory.BACKGROUND_SERVICES,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Start recording events`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Stop recording events`,
    },
  ],
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+E',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+E',
    },
  ],
});
