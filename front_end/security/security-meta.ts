// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Security from './security.js';

let loadedSecurityModule: (typeof Security|undefined);

async function loadSecurityModule(): Promise<typeof Security> {
  if (!loadedSecurityModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('security');
    loadedSecurityModule = await import('./security.js');
  }
  return loadedSecurityModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'security',
  title: () => ls`Security`,
  commandPrompt: 'Show Security',
  order: 80,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Security = await loadSecurityModule();
    return Security.SecurityPanel.SecurityPanel.instance();
  },
});
