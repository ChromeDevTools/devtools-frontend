// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Profiler from './profiler.js';

let loadedProfilerModule: (typeof Profiler|undefined);

const UIStrings = {
  /**
   *@description Title for the profiler tab
   */
  memory: 'Memory',
  /**
   *@description Title of the 'Live Heap Profile' tool in the bottom drawer
   */
  liveHeapProfile: 'Live Heap Profile',
  /**
   *@description Title of an action under the Performance category that can be invoked through the Command Menu
   */
  startRecordingHeapAllocations: 'Start recording heap allocations',
  /**
   *@description Title of an action under the Performance category that can be invoked through the Command Menu
   */
  stopRecordingHeapAllocations: 'Stop recording heap allocations',
  /**
   *@description Title of an action in the live heap profile tool to start with reload
   */
  startRecordingHeapAllocationsAndReload: 'Start recording heap allocations and reload the page',
  /**
   *@description Text in the Shortcuts page to explain a keyboard shortcut (start/stop recording performance)
   */
  startStopRecording: 'Start/stop recording',
  /**
   *@description Command for shwoing the profiler tab
   */
  showMemory: 'Show Memory',
  /**
   *@description Command for showing the 'Live Heap Profile' tool in the bottom drawer
   */
  showLiveHeapProfile: 'Show Live Heap Profile',

};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/profiler-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

async function loadProfilerModule(): Promise<typeof Profiler> {
  if (!loadedProfilerModule) {
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
  commandPrompt: i18nLazyString(UIStrings.showMemory),
  title: i18nLazyString(UIStrings.memory),
  order: 60,
  async loadView() {
    const Profiler = await loadProfilerModule();
    return Profiler.HeapProfilerPanel.HeapProfilerPanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'live_heap_profile',
  commandPrompt: i18nLazyString(UIStrings.showLiveHeapProfile),
  title: i18nLazyString(UIStrings.liveHeapProfile),
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
  iconClass: UI.ActionRegistration.IconClass.START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.STOP_RECORDING,
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
      title: i18nLazyString(UIStrings.startRecordingHeapAllocations),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.stopRecordingHeapAllocations),
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'live-heap-profile.start-with-reload',
  iconClass: UI.ActionRegistration.IconClass.REFRESH,
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return Profiler.LiveHeapProfileView.ActionDelegate.instance();
  },
  category: UI.ActionRegistration.ActionCategory.MEMORY,
  experiment: Root.Runtime.ExperimentName.LIVE_HEAP_PROFILE,
  title: i18nLazyString(UIStrings.startRecordingHeapAllocationsAndReload),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'profiler.heap-toggle-recording',
  category: UI.ActionRegistration.ActionCategory.MEMORY,
  iconClass: UI.ActionRegistration.IconClass.START_RECORDING,
  title: i18nLazyString(UIStrings.startStopRecording),
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.STOP_RECORDING,
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
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+E',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+E',
    },
  ],
});

UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      SDK.RemoteObject.RemoteObject,
    ];
  },
  async loadProvider() {
    const Profiler = await loadProfilerModule();
    return Profiler.HeapProfilerPanel.HeapProfilerPanel.instance();
  },
  experiment: undefined,
});
