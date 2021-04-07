// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
import * as UI from '../ui/legacy/legacy.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Timeline from './timeline.js';

import type * as Profiler from '../panels/profiler/profiler.js';

import * as i18n from '../core/i18n/i18n.js';
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
};
const str_ = i18n.i18n.registerUIStrings('timeline/timeline-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedTimelineModule: (typeof Timeline|undefined);

let loadedProfilerModule: (typeof Profiler|undefined);

async function loadTimelineModule(): Promise<typeof Timeline> {
  if (!loadedTimelineModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('timeline');
    loadedTimelineModule = await import('./timeline.js');
  }
  return loadedTimelineModule;
}


// The profiler module is imported here because the view with id `js_profiler`
// is implemented by `JSProfilerPanel` in profiler. It cannot be registered
// in the profiler module as it belongs to the shell app and thus all apps
// that extend from shell will have such view registered. This would cause a
// collision with js_app as a separate view with the same id is registered in it.
async function loadProfilerModule(): Promise<typeof Profiler> {
  if (!loadedProfilerModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('profiler');
    loadedProfilerModule = await import('../panels/profiler/profiler.js');
  }
  return loadedProfilerModule;
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
  async loadView() {
    const Timeline = await loadTimelineModule();
    return Timeline.TimelinePanel.TimelinePanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'js_profiler',
  title: i18nLazyString(UIStrings.javascriptProfiler),
  commandPrompt: i18nLazyString(UIStrings.showJavascriptProfiler),
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 65,
  async loadView() {
    const Profiler = await loadProfilerModule();
    return Profiler.ProfilesPanel.JSProfilerPanel.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.toggle-recording',
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.LARGEICON_STOP_RECORDING,
  toggleWithRedColor: true,
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
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
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_REFRESH,
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
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

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  actionId: 'timeline.save-to-file',
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.TimelinePanel]);
  },
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return Timeline.TimelinePanel.ActionDelegate.instance();
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
    return Timeline.TimelinePanel.ActionDelegate.instance();
  },
  title: i18nLazyString(UIStrings.loadProfile),
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+0',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+0',
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
    return Timeline.TimelinePanel.ActionDelegate.instance();
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
    return Timeline.TimelinePanel.ActionDelegate.instance();
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
    return Timeline.TimelinePanel.ActionDelegate.instance();
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
    return Timeline.TimelinePanel.ActionDelegate.instance();
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
    return Timeline.TimelinePanel.ActionDelegate.instance();
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

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.PERFORMANCE,
  title: i18nLazyString(UIStrings.hideChromeFrameInLayersView),
  settingName: 'frameViewerHideChromeWindow',
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
