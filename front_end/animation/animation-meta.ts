// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Animation from './animation.js';

let loadedAnimationModule: (typeof Animation|undefined);

async function loadAnimationModule(): Promise<typeof Animation> {
  if (!loadedAnimationModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('animation');
    loadedAnimationModule = await import('./animation.js');
  }
  return loadedAnimationModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'animations',
  title: (): Platform.UIString.LocalizedString => ls`Animations`,
  commandPrompt: 'Show Animations',
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 0,
  async loadView() {
    const Animation = await loadAnimationModule();
    return Animation.AnimationTimeline.AnimationTimeline.instance();
  },
});
