// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as CSSOverview from './css_overview.js';

export const UIStrings = {
  /**
  *@description Title of the CSS Overview Panel
  */
  cssOverview: 'CSS Overview',
  /**
  *@description Title of the CSS Overview Panel
  */
  showCssOverview: 'Show CSS Overview',
};

const str_ = i18n.i18n.registerUIStrings('css_overview/css_overview-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

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
  commandPrompt: i18nString(UIStrings.showCssOverview),
  title: i18nString(UIStrings.cssOverview),
  order: 95,
  async loadView() {
    const CSSOverview = await loadCSSOverviewModule();
    return CSSOverview.CSSOverviewPanel.CSSOverviewPanel.instance();
  },
  experiment: Root.Runtime.ExperimentName.CSS_OVERVIEW,
});
