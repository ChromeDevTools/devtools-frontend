// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Input from './input.js';

let loadedInputModule: (typeof Input|undefined);

async function loadInputModule(): Promise<typeof Input> {
  if (!loadedInputModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('input');
    loadedInputModule = await import('./input.js');
  }
  return loadedInputModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'Inputs',
  title: (): Platform.UIString.LocalizedString => ls`Inputs`,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Inputs`,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 7,
  async loadView() {
    const Input = await loadInputModule();
    return Input.InputTimeline.InputTimeline.instance();
  },
  experiment: Root.Runtime.ExperimentName.TIMELINE_REPLAY_EVENT,
});
