// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as LiveMetrics from '../../models/live-metrics/live-metrics.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';

import type * as Timeline from './timeline.js';

const UIStrings = {
  /**
   * @description Text for the performance of something
   */
  performance: 'Performance',
  /**
   * @description Command for showing the 'Performance' tool
   */
  showPerformance: 'Show Performance',
  /**
   * @description Text to record a series of actions for analysis
   */
  record: 'Record',
  /**
   * @description Text of an item that stops the running task
   */
  stop: 'Stop',
  /**
   * @description Title of an action in the timeline tool to record reload
   */
  recordAndReload: 'Record and reload',
  /**
   * @description Tooltip text that appears when hovering over the largeicon download button
   */
  saveProfile: 'Save profile…',
  /**
   * @description Tooltip text that appears when hovering over the largeicon load button
   */
  loadProfile: 'Load profile…',
  /**
   * @description Prev button title in Film Strip View of the Performance panel
   */
  previousFrame: 'Previous frame',
  /**
   * @description Next button title in Film Strip View of the Performance panel
   */
  nextFrame: 'Next frame',
  /**
   * @description Title of an action in the timeline tool to show history
   */
  showRecentTimelineSessions: 'Show recent timeline sessions',
  /**
   * @description Title of an action that opens the previous recording in the performance panel
   */
  previousRecording: 'Previous recording',
  /**
   * @description Title of an action that opens the next recording in the performance panel
   */
  nextRecording: 'Next recording',
  /**
   * @description Title of a setting under the Performance category in Settings
   */
  chromeFrameInLayersView: 'Chrome frame in Layers view',
  /**
   * @description Title of a setting under the Performance category in Settings
   */
  timelineShowAllEvents: 'Show all events',
  /**
   * @description Title of a setting under the Performance category in Settings
   */
  enableSoftNavigations: 'Enable soft navigation performance monitoring',
  /**
   * @description Title of a setting under the Performance category in Settings
   */
  timelineDebugMode: 'Timeline debug mode (trace event details, etc.)',
  /**
   * @description Title of a setting under the Performance category in Settings
   */
  timelineInvalidationTracking: 'Invalidation tracking',
  /**
   * @description Title of a setting in Performance panel.
   */
  disableJavascriptSamples: 'Disable JavaScript samples',
  /**
   * @description Title of a setting in Performance panel.
   */
  enableAdvancedPaint: 'Enable advanced paint instrumentation (slow)',
  /**
   * @description Title of a setting in Performance panel.
   */
  enableSelectorStats: 'Enable CSS selector stats (slow)',
  /**
   * @description Title of a setting in Performance panel.
   */
  screenshotCapture: 'Screenshot capture',
  /**
   * @description Title of a setting in Performance panel.
   */
  screenshots: 'Screenshots',
  /**
   * @description Title of a setting in Performance panel.
   */
  memory: 'Memory',
  /**
   * @description Title of a setting in Performance panel.
   */
  dimThirdParties: 'Dim 3rd parties',
  /**
   * @description Title of a setting in Performance panel.
   */
  showCustomtracks: 'Show custom tracks',
  /**
   * @description Title of a setting in Performance panel counters graph.
   */
  jsHeap: 'JS heap',
  /**
   * @description Title of a setting in Performance panel counters graph.
   */
  documents: 'Documents',
  /**
   * @description Title of a setting in Performance panel counters graph.
   */
  nodes: 'Nodes',
  /**
   * @description Title of a setting in Performance panel counters graph.
   */
  listeners: 'Listeners',
  /**
   * @description Title of a setting in Performance panel counters graph.
   */
  gpuMemory: 'GPU memory',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/timeline-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedTimelineModule: (typeof Timeline|undefined);

async function loadTimelineModule(): Promise<typeof Timeline> {
  if (!loadedTimelineModule) {
    loadedTimelineModule = await import('./timeline.js');
  }
  return loadedTimelineModule;
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
  async loadView(universe) {
    const Timeline = await loadTimelineModule();
    const {pageResourceLoader: resourceLoader, targetManager, isolateManager} = universe;
    return Timeline.TimelinePanel.TimelinePanel.instance(
        {forceNew: true, resourceLoader, targetManager, isolateManager});
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
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+E',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
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
  title: i18nLazyString(UIStrings.recordAndReload),
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.ActionDelegate();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+Shift+E',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
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
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+S',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
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
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+O',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
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
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+H',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
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
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Alt+Left',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
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
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Alt+Right',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+Right',
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.PERFORMANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.chromeFrameInLayersView),
  settingName: 'frame-viewer-chrome-window',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.PERFORMANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.timelineInvalidationTracking),
  settingName: 'timeline-invalidation-tracking',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

// IMPORTANT: if you are updating this, you should also update the setting in
// js_timeline-meta.
Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.PERFORMANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.timelineShowAllEvents),
  settingName: 'timeline-show-all-events',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

SettingsUI.SettingUIRegistration.register(LiveMetrics.timelineEnableSoftNavigationsSettingDescriptor, {
  category: Common.Settings.SettingCategory.PERFORMANCE,
  title: i18nLazyString(UIStrings.enableSoftNavigations),
});

// IMPORTANT: if you are updating this, you should also update the setting in
// js_timeline-meta.
Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.PERFORMANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.timelineDebugMode),
  settingName: 'timeline-debug-mode',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

// IMPORTANT: if you are updating this, you should also update the setting in
// js_timeline-meta.
Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.PERFORMANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  settingName: 'annotations-hidden',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
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

Common.Revealer.registerRevealer({
  contextTypes() {
    return [SDK.TraceObject.TraceObject];
  },
  destination: Common.Revealer.RevealerDestination.TIMELINE_PANEL,
  async loadRevealer() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.TraceRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.TimelinePanel.ParsedTraceRevealable]);
  },
  destination: Common.Revealer.RevealerDestination.TIMELINE_PANEL,
  async loadRevealer() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.ParsedTraceRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [SDK.TraceObject.RevealableEvent];
  },
  destination: Common.Revealer.RevealerDestination.TIMELINE_PANEL,
  async loadRevealer() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.EventRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.Utils.Helpers.RevealableInsight]);
  },
  destination: Common.Revealer.RevealerDestination.TIMELINE_PANEL,
  async loadRevealer() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.InsightRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.Utils.Helpers.RevealableCoreVitals]);
  },
  destination: Common.Revealer.RevealerDestination.TIMELINE_PANEL,
  async loadRevealer() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.CoreVitalsRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.Utils.Helpers.RevealableTimeRange]);
  },
  destination: Common.Revealer.RevealerDestination.TIMELINE_PANEL,
  async loadRevealer() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.TimeRangeRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return maybeRetrieveContextTypes(Timeline => [Timeline.Utils.Helpers.RevealableBottomUpProfile]);
  },
  destination: Common.Revealer.RevealerDestination.TIMELINE_PANEL,
  async loadRevealer() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.BottomUpProfileRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      SDK.CPUProfilerModel.ProfileFinishedData,
    ];
  },
  destination: Common.Revealer.RevealerDestination.TIMELINE_PANEL,
  async loadRevealer() {
    const Timeline = await loadTimelineModule();
    return new Timeline.TimelinePanel.ProfileFinishedRevealer();
  },
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.SESSION,
  title: i18nLazyString(UIStrings.disableJavascriptSamples),
  settingName: 'timeline-disable-js-sampling',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.SESSION,
  title: i18nLazyString(UIStrings.enableAdvancedPaint),
  settingName: 'timeline-capture-layers-and-pictures',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.SESSION,
  title: i18nLazyString(UIStrings.enableSelectorStats),
  settingName: 'timeline-capture-selector-stats',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.SESSION,
  title: i18nLazyString(UIStrings.screenshotCapture),
  settingName: 'timeline-screenshot-capture-mode',
  settingType: Common.Settings.SettingType.ENUM,
  defaultValue: 'auto',
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
  title: i18nLazyString(UIStrings.screenshots),
  settingName: 'timeline-show-screenshots',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.SESSION,
  title: i18nLazyString(UIStrings.memory),
  settingName: 'timeline-show-memory',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.SESSION,
  title: i18nLazyString(UIStrings.dimThirdParties),
  settingName: 'timeline-dim-third-parties',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
  title: i18nLazyString(UIStrings.showCustomtracks),
  settingName: 'timeline-show-extension-data',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
  title: i18nLazyString(UIStrings.jsHeap),
  settingName: 'timeline-counters-graph-js-heap-size-used',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
  title: i18nLazyString(UIStrings.documents),
  settingName: 'timeline-counters-graph-documents',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
  title: i18nLazyString(UIStrings.nodes),
  settingName: 'timeline-counters-graph-nodes',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
  title: i18nLazyString(UIStrings.listeners),
  settingName: 'timeline-counters-graph-js-event-listeners',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
  title: i18nLazyString(UIStrings.gpuMemory),
  settingName: 'timeline-counters-graph-gpu-memory-used-kb',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});
