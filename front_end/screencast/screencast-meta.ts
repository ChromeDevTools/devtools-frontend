// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Screencast from './screencast.js';

let loadedScreencastModule: (typeof Screencast|undefined);

async function loadScreencastModule(): Promise<typeof Screencast> {
  if (!loadedScreencastModule) {
    // Side-effect import rescreencast in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('screencast');
    loadedScreencastModule = await import('./screencast.js');
  }
  return loadedScreencastModule;
}

UI.Toolbar.registerToolbarItem({
  async loadItem() {
    const Screencast = await loadScreencastModule();
    return Screencast.ScreencastApp.ToolbarButtonProvider.instance();
  },
  order: 1,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_LEFT,
  showLabel: undefined,
  condition: undefined,
  separator: undefined,
  actionId: undefined,
});

Common.AppProvider.registerAppProvider({
  async loadAppProvider() {
    const Screencast = await loadScreencastModule();
    return Screencast.ScreencastApp.ScreencastAppProvider.instance();
  },
  order: 1,
  condition: undefined,
});

UI.ContextMenu.registerItem({
  location: UI.ContextMenu.ItemLocation.MAIN_MENU,
  order: 10,
  actionId: 'components.request-app-banner',
});
