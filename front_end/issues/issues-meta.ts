// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Issues from './issues.js';

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Label for the issues pane
  */
  issues: 'Issues',
  /**
  *@description Command for showing the 'Issues' tool
  */
  showIssues: 'Show Issues',
  /**
  *@description Title for a tab drawer listing CSP Violations
  */
  cspViolations: 'CSP Violations',
  /**
  *@description Command for showing the 'CSP Violations' tool
  */
  showCspViolations: 'Show CSP Violations',
};
const str_ = i18n.i18n.registerUIStrings('issues/issues-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedIssuesModule: (typeof Issues|undefined);

async function loadIssuesModule(): Promise<typeof Issues> {
  if (!loadedIssuesModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('issues');
    loadedIssuesModule = await import('./issues.js');
  }
  return loadedIssuesModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'issues-pane',
  title: i18nString(UIStrings.issues),
  commandPrompt: i18nString(UIStrings.showIssues),
  order: 100,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Issues = await loadIssuesModule();
    return Issues.IssuesPane.IssuesPaneImpl.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'csp-violations-pane',
  title: i18nString(UIStrings.cspViolations),
  commandPrompt: i18nString(UIStrings.showCspViolations),
  order: 100,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Issues = await loadIssuesModule();
    return Issues.CSPViolationsView.CSPViolationsView.instance();
  },
  experiment: Root.Runtime.ExperimentName.CSP_VIOLATIONS_VIEW,
});
