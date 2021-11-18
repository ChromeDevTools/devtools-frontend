// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Sources from '../../panels/sources/sources.js';

const UIStrings = {
  /**
    *@description Title of the 'Node' tool in the Network Navigator View, which is part of the Sources tool
    */
  node: 'Node',
  /**
   *@description Command for showing the 'Node' tool in the Network Navigator View, which is part of the Sources tool
   */
  showNode: 'Node',
};

const str_ = i18n.i18n.registerUIStrings('entrypoints/node_app/node_app-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedSourcesModule: (typeof Sources|undefined);

async function loadHelpModule(): Promise<typeof Sources> {
  if (!loadedSourcesModule) {
    loadedSourcesModule = await import('../../panels/sources/sources.js');
  }
  return loadedSourcesModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-network',
  title: i18nLazyString(UIStrings.node),
  commandPrompt: i18nLazyString(UIStrings.showNode),
  order: 2,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadHelpModule();
    return Sources.SourcesNavigator.NetworkNavigatorView.instance();
  },
});
