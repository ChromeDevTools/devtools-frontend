// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Profiler from '../profiler/profiler.js';
import type * as Timeline from '../timeline/timeline.js';

const UIStrings = {
  /**
   *@description Title of the Profiler tool
   */
  profiler: 'Profiler',
  /**
   *@description Command for showing the Profiler tool
   */
  showProfiler: 'Show Profiler',
  /**
   *@description Text for the performance of something
   */
  performance: 'Performance',
  /**
   *@description Command for showing the 'Performance' tool
   */
  showPerformance: 'Show Performance',
  /**
   *@description Text in the Shortcuts page to explain a keyboard shortcut (start/stop recording performance)
   */
  startStopRecording: 'Start/stop recording',
  /**
   *@description Title of an action in the timeline tool to show history
   */
  showRecentTimelineSessions: 'Show recent timeline sessions',
  /**
   *@description Text to record a series of actions for analysis
   */
  record: 'Record',
  /**
   *@description Text of an item that stops the running task
   */
  stop: 'Stop',
  /**
   *@description Title of an action in the timeline tool to record reload
   */
  startProfilingAndReloadPage: 'Start profiling and reload page',
};
const str_ = i18n.i18n.registerUIStrings('panels/js_profiler/js_profiler-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedTimelineModule: (typeof Timeline|undefined);
let loadedProfilerModule: (typeof Profiler|undefined);

async function loadProfilerModule(): Promise<typeof Profiler> {
  if (!loadedProfilerModule) {
    loadedProfilerModule = await import('../profiler/profiler.js');
  }
  return loadedProfilerModule;
}

async function loadTimelineModule(): Promise<typeof Timeline> {
  if (!loadedTimelineModule) {
    loadedTimelineModule = await import('../timeline/timeline.js');
  }
  return loadedTimelineModule;
}

function maybeRetrieveContextTypes<T = unknown>(getClassCallBack: (profilerModule: typeof Profiler) => T[]): T[] {
  if (loadedProfilerModule === undefined) {
    return [];
  }
  return getClassCallBack(loadedProfilerModule);
}

function maybeRetrieveTimelineContextTypes<T = unknown>(getClassCallBack: (timelineModule: typeof Timeline) => T[]):
    T[] {
  if (loadedTimelineModule === undefined) {
    return [];
  }
  return getClassCallBack(loadedTimelineModule);
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'js_profiler',
  title: i18nLazyString(UIStrings.profiler),
  commandPrompt: i18nLazyString(UIStrings.showProfiler),
  order: 65,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  experiment: Root.Runtime.ExperimentName.JS_PROFILER_TEMP_ENABLE,
  async loadView() {
    const Profiler = await loadProfilerModule();
    return Profiler.ProfilesPanel.JSProfilerPanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'timeline',
  title: i18nLazyString(UIStrings.performance),
  commandPrompt: i18nLazyString(UIStrings.showPerformance),
  order: 66,
  hasToolbar: false,
  isPreviewFeature: true,
  async loadView() {
    const Timeline = await loadTimelineModule();
    return Timeline.TimelinePanel.TimelinePanel.instance({forceNew: null, isNode: true});
  },
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'profiler.js-toggle-recording',
  category: UI.ActionRegistration.ActionCategory.JAVASCRIPT_PROFILER,
  title: i18nLazyString(UIStrings.startStopRecording),
  iconClass: UI.ActionRegistration.IconClass.START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.STOP_RECORDING,
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
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+E',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+E',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.show-history',
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return Timeline.TimelinePanel.ActionDelegate.instance();
  },
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  title: i18nLazyString(UIStrings.showRecentTimelineSessions),
  contextTypes() {
    return maybeRetrieveTimelineContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+H',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Y',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.toggle-recording',
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  iconClass: UI.ActionRegistration.IconClass.START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.STOP_RECORDING,
  toggleWithRedColor: true,
  contextTypes() {
    return maybeRetrieveTimelineContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
  },
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return Timeline.TimelinePanel.ActionDelegate.instance();
  },
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.record),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.stop),
    },
  ],
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

UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.record-reload',
  iconClass: UI.ActionRegistration.IconClass.REFRESH,
  contextTypes() {
    return maybeRetrieveTimelineContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
  },
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  title: i18nLazyString(UIStrings.startProfilingAndReloadPage),
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return Timeline.TimelinePanel.ActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+E',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+E',
    },
  ],
});
