// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as LinearMemoryInspector from './linear_memory_inspector.js';

let loadedLinearMemoryInspectorModule: (typeof LinearMemoryInspector|undefined);

async function loadLinearMemoryInspectorModule(): Promise<typeof LinearMemoryInspector> {
  if (!loadedLinearMemoryInspectorModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('linear_memory_inspector');
    loadedLinearMemoryInspectorModule = await import('./linear_memory_inspector.js');
  }
  return loadedLinearMemoryInspectorModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'linear-memory-inspector',
  title: (): Platform.UIString.LocalizedString => ls`Memory Inspector`,
  commandPrompt: 'Show Memory Inspector',
  order: 100,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const LinearMemoryInspector = await loadLinearMemoryInspectorModule();
    return LinearMemoryInspector.LinearMemoryInspectorPane.Wrapper.instance();
  },
  experiment: Root.Runtime.ExperimentName.WASM_DWARF_DEBUGGING,
});
