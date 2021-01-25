// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Accessibility from './accessibility.js';

let loadedAccessibilityModule: (typeof Accessibility|undefined);

async function loadAccessibilityModule(): Promise<typeof Accessibility> {
  if (!loadedAccessibilityModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('accessibility');
    loadedAccessibilityModule = await import('./accessibility.js');
  }
  return loadedAccessibilityModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.ELEMENTS_SIDEBAR,
  id: 'accessibility.view',
  title: (): Platform.UIString.LocalizedString => ls`Accessibility`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Accessibility`,
  order: 10,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Accessibility = await loadAccessibilityModule();
    return Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance();
  },
});
