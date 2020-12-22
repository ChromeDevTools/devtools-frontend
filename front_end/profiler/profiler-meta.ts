// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Profiler from './profiler.js';

let loadedProfilerModule: (typeof Profiler|undefined);

async function loadProfilerModule(): Promise<typeof Profiler> {
  if (!loadedProfilerModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('profiler');
    loadedProfilerModule = await import('./profiler.js');
  }
  return loadedProfilerModule;
}

function maybeRetrieveContextTypes<T = unknown>(getClassCallBack: (profilerModule: typeof Profiler) => T[]): T[] {
  if (loadedProfilerModule === undefined) {
    return [];
  }
  return getClassCallBack(loadedProfilerModule);
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'heap_profiler',
  commandPrompt: 'Show Memory',
  title: ls`Memory`,
  order: 60,
  async loadView() {
    const Profiler = await loadProfilerModule();
    return Profiler.HeapProfilerPanel.HeapProfilerPanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'live_heap_profile',
  commandPrompt: 'Show Live Heap Profile',
  title: ls`Live Heap Profile`,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 100,
  async loadView() {
    const Profiler = await loadProfilerModule();
    return Profiler.LiveHeapProfileView.LiveHeapProfileView.instance();
  },
  experiment: Root.Runtime.ExperimentName.LIVE_HEAP_PROFILE,
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'live-heap-profile.toggle-recording',
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.LARGEICON_STOP_RECORDING,
  toggleWithRedColor: true,
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return Profiler.LiveHeapProfileView.ActionDelegate.instance();
  },
  category: UI.ActionRegistration.ActionCategory.MEMORY,
  experiment: Root.Runtime.ExperimentName.LIVE_HEAP_PROFILE,
  options: [
    {
      value: true,
      title: ls`Start recording heap allocations`,
    },
    {
      value: false,
      title: ls`Stop recording heap allocations`,
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'live-heap-profile.start-with-reload',
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_REFRESH,
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return Profiler.LiveHeapProfileView.ActionDelegate.instance();
  },
  category: UI.ActionRegistration.ActionCategory.MEMORY,
  experiment: Root.Runtime.ExperimentName.LIVE_HEAP_PROFILE,
  title: ls`Start recording heap allocations and reload the page`,
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'profiler.heap-toggle-recording',
  category: UI.ActionRegistration.ActionCategory.MEMORY,
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_START_RECORDING,
  title: ls`Start/stop recording`,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.LARGEICON_STOP_RECORDING,
  toggleWithRedColor: true,
  contextTypes() {
    return maybeRetrieveContextTypes(Profiler => [Profiler.HeapProfilerPanel.HeapProfilerPanel]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return Profiler.HeapProfilerPanel.HeapProfilerPanel.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platform.WindowsLinux,
      shortcut: 'Ctrl+E',
    },
    {
      platform: UI.ActionRegistration.Platform.Mac,
      shortcut: 'Meta+E',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'profiler.js-toggle-recording',
  category: UI.ActionRegistration.ActionCategory.JAVASCRIPT_PROFILER,
  title: ls`Start/stop recording`,
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.LARGEICON_STOP_RECORDING,
  toggleWithRedColor: true,
  contextTypes() {
    return maybeRetrieveContextTypes(Profiler => [Profiler.ProfilesPanel.JSProfilerPanel]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return Profiler.ProfilesPanel.JSProfilerPanel.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platform.WindowsLinux,
      shortcut: 'Ctrl+E',
    },
    {
      platform: UI.ActionRegistration.Platform.Mac,
      shortcut: 'Meta+E',
    },
  ],
});
