// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Layers from './layers.js';

export const UIStrings = {
  /**
  *@description Title of the Layers tool
  */
  layers: 'Layers',
  /**
  *@description Command for showing the Layers tool
  */
  showLayers: 'Show Layers',
};
const str_ = i18n.i18n.registerUIStrings('layers/layers-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedLayersModule: (typeof Layers|undefined);

async function loadLayersModule(): Promise<typeof Layers> {
  if (!loadedLayersModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('layers');
    loadedLayersModule = await import('./layers.js');
  }
  return loadedLayersModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'layers',
  title: i18nString(UIStrings.layers),
  commandPrompt: i18nString(UIStrings.showLayers),
  order: 100,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Layers = await loadLayersModule();
    return Layers.LayersPanel.LayersPanel.instance();
  },
});
