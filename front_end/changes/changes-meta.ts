// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Changes from './changes.js';

let loadedChangesModule: (typeof Changes|undefined);

async function loadChangesModule(): Promise<typeof Changes> {
  if (!loadedChangesModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('changes');
    loadedChangesModule = await import('./changes.js');
  }
  return loadedChangesModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'changes.changes',
  title: (): Platform.UIString.LocalizedString => ls`Changes`,
  commandPrompt: 'Show Changes',
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Changes = await loadChangesModule();
    return Changes.ChangesView.ChangesView.instance();
  },
});
