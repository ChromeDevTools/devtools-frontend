// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Sources from '../sources/sources.js';

export const UIStrings = {
  /**
    *@description Title of the 'Node' tool in the Network Navigator View, which is part of the Sources tool
    */
  node: 'Node',
  /**
   *@description Command for showing the 'Node' tool in the Network Navigator View, which is part of the Sources tool
   */
  showNode: 'Node',
};

const str_ = i18n.i18n.registerUIStrings('node_debugger/node_debugger-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedSourcesModule: (typeof Sources|undefined);

async function loadHelpModule(): Promise<typeof Sources> {
  if (!loadedSourcesModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('sources');
    loadedSourcesModule = await import('../sources/sources.js');
  }
  return loadedSourcesModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-network',
  title: i18nString(UIStrings.node),
  commandPrompt: i18nString(UIStrings.showNode),
  order: 2,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadHelpModule();
    return Sources.SourcesNavigator.NetworkNavigatorView.instance();
  },
});
