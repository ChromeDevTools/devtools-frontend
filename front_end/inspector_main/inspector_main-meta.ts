// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as InspectorMain from './inspector_main.js';

let loadedInspectorMainModule: (typeof InspectorMain|undefined);

async function loadInspectorMainModule(): Promise<typeof InspectorMain> {
  if (!loadedInspectorMainModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('inspector_main');
    loadedInspectorMainModule = await import('./inspector_main.js');
  }
  return loadedInspectorMainModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'rendering',
  title: (): Platform.UIString.LocalizedString => ls`Rendering`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Rendering`,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 50,
  async loadView() {
    const InspectorMain = await loadInspectorMainModule();
    return InspectorMain.RenderingOptions.RenderingOptionsView.instance();
  },
  tags: [
    (): Platform.UIString.LocalizedString => ls`paint`,
    (): Platform.UIString.LocalizedString => ls`layout`,
    (): Platform.UIString.LocalizedString => ls`fps`,
    (): Platform.UIString.LocalizedString => ls`CSS media type`,
    (): Platform.UIString.LocalizedString => ls`CSS media feature`,
    (): Platform.UIString.LocalizedString => ls`vision deficiency`,
    (): Platform.UIString.LocalizedString => ls`color vision deficiency`,
  ],
});
