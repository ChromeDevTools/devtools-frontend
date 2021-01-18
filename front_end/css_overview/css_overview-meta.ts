// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as CSSOverview from './css_overview.js';

let loadedCSSOverviewModule: (typeof CSSOverview|undefined);

async function loadCSSOverviewModule(): Promise<typeof CSSOverview> {
  if (!loadedCSSOverviewModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('css_overview');
    loadedCSSOverviewModule = await import('./css_overview.js');
  }
  return loadedCSSOverviewModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'cssoverview',
  commandPrompt: 'Show CSS Overview',
  title: (): Platform.UIString.LocalizedString => ls`CSS Overview`,
  order: 95,
  async loadView() {
    const CSSOverview = await loadCSSOverviewModule();
    return CSSOverview.CSSOverviewPanel.CSSOverviewPanel.instance();
  },
  experiment: Root.Runtime.ExperimentName.CSS_OVERVIEW,
});
