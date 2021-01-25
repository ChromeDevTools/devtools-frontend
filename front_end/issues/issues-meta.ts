// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Issues from './issues.js';

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
  title: (): Platform.UIString.LocalizedString => ls`Issues`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Issues`,
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
  title: (): Platform.UIString.LocalizedString => ls`CSP Violations`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show CSP Violations`,
  order: 100,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Issues = await loadIssuesModule();
    return Issues.CSPViolationsView.CSPViolationsView.instance();
  },
  experiment: Root.Runtime.ExperimentName.CSP_VIOLATIONS_VIEW,
});
