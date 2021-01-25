// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Console from './console.js';

let loadedConsoleModule: (typeof Console|undefined);

async function loadConsoleModule(): Promise<typeof Console> {
  if (!loadedConsoleModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('console');
    loadedConsoleModule = await import('./console.js');
  }
  return loadedConsoleModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'console',
  title: (): Platform.UIString.LocalizedString => ls`Console`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Console`,
  order: 20,
  async loadView() {
    const Console = await loadConsoleModule();
    return Console.ConsolePanel.ConsolePanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'console-view',
  title: (): Platform.UIString.LocalizedString => ls`Console`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Console`,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  order: 0,
  async loadView() {
    const Console = await loadConsoleModule();
    return Console.ConsolePanel.WrapperView.instance();
  },
});
