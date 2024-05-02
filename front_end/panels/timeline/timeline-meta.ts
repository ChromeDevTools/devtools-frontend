// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import type * as Profiler from '../../panels/profiler/profiler.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Timeline from './timeline.js';

const UIStrings = {
  /**
   *@description Text for the performance of something
   */
  performance: 'Performance',
  /**
   *@description Command for showing the 'Performance' tool
   */
  showPerformance: 'Show Performance',
  /**
   *@description Title of the 'JavaScript Profiler' tool
   */
  javascriptProfiler: 'JavaScript Profiler',
  /**
   *@description Command for showing the 'JavaScript Profiler' tool
   */
  showJavascriptProfiler: 'Show JavaScript Profiler',
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
  /**
   *@description Tooltip text that appears when hovering over the largeicon download button
   */
  saveProfile: 'Save profile…',
  /**
   *@description Tooltip text that appears when hovering over the largeicon load button
   */
  loadProfile: 'Load profile…',
  /**
   *@description Prev button title in Film Strip View of the Performance panel
   */
  previousFrame: 'Previous frame',
  /**
   *@description Next button title in Film Strip View of the Performance panel
   */
  nextFrame: 'Next frame',
  /**
   *@description Title of an action in the timeline tool to show history
   */
  showRecentTimelineSessions: 'Show recent timeline sessions',
  /**
   *@description Title of an action that opens the previous recording in the performance panel
   */
  previousRecording: 'Previous recording',
  /**
   *@description Title of an action that opens the next recording in the performance panel
   */
  nextRecording: 'Next recording',
  /**
   *@description Title of a setting under the Performance category in Settings
   */
  hideChromeFrameInLayersView: 'Hide `chrome` frame in Layers view',
  /**
   *@description Text in the Shortcuts page to explain a keyboard shortcut (start/stop recording performance)
   */
  startStopRecording: 'Start/stop recording',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/timeline-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedTimelineModule: (typeof Timeline|undefined);

let loadedProfilerModule: (typeof Profiler|undefined);

async function loadTimelineModule(): Promise<typeof Timeline> {
  if (!loadedTimelineModule) {
    loadedTimelineModule = await import('./timeline.js');
  }
  return loadedTimelineModule;
}

// The profiler module is imported here because the js profiler tab is implemented
// in the profiler module. Since the tab doesn't belong to all apps that extend
// the shell app, it cannot be registered in profiler's meta file, as profiler is
// part of the shell app, and thus all of the extensions registered in profiler
// belong to all apps that extend from shell.
// Instead, we register the extensions for the js profiler tab in panels/timeline/ and
// js_profiler/ so that the tab is available only in the apps it belongs to.

async function loadProfilerModule(): Promise<typeof Profiler> {
  if (!loadedProfilerModule) {
    loadedProfilerModule = await import('../profiler/profiler.js');
  }
  return loadedProfilerModule;
}

function maybeRetrieveProfilerContextTypes<T = unknown>(getClassCallBack: (profilerModule: typeof Profiler) => T[]):
    T[] {
  if (loadedProfilerModule === undefined) {
    return [];
  }
  return getClassCallBack(loadedProfilerModule);
}

function maybeRetrieveContextTypes<T = unknown>(getClassCallBack: (timelineModule: typeof Timeline) => T[]): T[] {
  if (loadedTimelineModule === undefined) {
    return [];
  }
  return getClassCallBack(loadedTimelineModule);
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'timeline',
  title: i18nLazyString(UIStrings.performance),
  commandPrompt: i18nLazyString(UIStrings.showPerformance),
  order: 50,
  experiment: Root.Runtime.ExperimentName.ENABLE_PERFORMANCE_PANEL,
  async loadView() {
    const Timeline = await loadTimelineModule();
    return Timeline.TimelinePanel.TimelinePanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'js-profiler',
  title: i18nLazyString(UIStrings.javascriptProfiler),
  commandPrompt: i18nLazyString(UIStrings.showJavascriptProfiler),
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  order: 65,
  experiment: Root.Runtime.ExperimentName.JS_PROFILER_TEMP_ENABLE,
  async loadView() {
    const Profiler = await loadProfilerModule();
    return Profiler.ProfilesPanel.JSProfilerPanel.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.toggle-recording',
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  iconClass: UI.ActionRegistration.IconClass.START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.STOP_RECORDING,
  toggleWithRedColor: true,
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
  },
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.ActionDelegate();
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
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
  },
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  title: i18nLazyString(UIStrings.startProfilingAndReloadPage),
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.ActionDelegate();
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

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  actionId: 'timeline.save-to-file',
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
  },
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.saveProfile),
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+S',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+S',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  actionId: 'timeline.load-from-file',
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
  },
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.loadProfile),
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+O',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+O',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.jump-to-previous-frame',
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  title: i18nLazyString(UIStrings.previousFrame),
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
  },
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.ActionDelegate();
  },
  bindings: [
    {
      shortcut: '[',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.jump-to-next-frame',
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  title: i18nLazyString(UIStrings.nextFrame),
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
  },
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.ActionDelegate();
  },
  bindings: [
    {
      shortcut: ']',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.show-history',
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.ActionDelegate();
  },
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  title: i18nLazyString(UIStrings.showRecentTimelineSessions),
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
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
  actionId: 'timeline.previous-recording',
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.previousRecording),
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Alt+Left',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Left',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.next-recording',
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.nextRecording),
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Alt+Right',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Right',
    },
  ],
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
    return maybeRetrieveProfilerContextTypes(Profiler => [Profiler.ProfilesPanel.JSProfilerPanel]);
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

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.PERFORMANCE,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.hideChromeFrameInLayersView),
  settingName: 'frame-viewer-hide-chrome-window',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Linkifier.registerLinkifier({
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.CLSLinkifier.CLSRect]);
  },
  async loadLinkifier() {
    const Timeline = await loadTimelineModule();
    return Timeline.CLSLinkifier.Linkifier.instance();
  },
});

UI.ContextMenu.registerItem({
  location: UI.ContextMenu.ItemLocation.TIMELINE_MENU_OPEN,
  actionId: 'timeline.load-from-file',
  order: 10,
});

UI.ContextMenu.registerItem({
  location: UI.ContextMenu.ItemLocation.TIMELINE_MENU_OPEN,
  actionId: 'timeline.save-to-file',
  order: 15,
});
