// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 * Copyright (C) 2012 Intel Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as PanelFeedback from '../../ui/components/panel_feedback/panel_feedback.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';

import historyToolbarButtonStyles from './historyToolbarButton.css.js';
import {Events, PerformanceModel, type WindowChangedEvent} from './PerformanceModel.js';
import {cpuprofileJsonGenerator, traceJsonGenerator} from './SaveFileFormatter.js';
import {NodeNamesUpdated, SourceMapsResolver} from './SourceMapsResolver.js';
import {type Client, TimelineController} from './TimelineController.js';
import {TimelineFlameChartView} from './TimelineFlameChartView.js';
import {TimelineHistoryManager} from './TimelineHistoryManager.js';
import {TimelineLoader} from './TimelineLoader.js';
import {TimelineMiniMap} from './TimelineMiniMap.js';
import timelinePanelStyles from './timelinePanel.css.js';
import {TimelineSelection} from './TimelineSelection.js';
import timelineStatusDialogStyles from './timelineStatusDialog.css.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';
import {UIDevtoolsController} from './UIDevtoolsController.js';
import {UIDevtoolsUtils} from './UIDevtoolsUtils.js';

const UIStrings = {
  /**
   *@description Text that appears when user drag and drop something (for example, a file) in Timeline Panel of the Performance panel
   */
  dropTimelineFileOrUrlHere: 'Drop timeline file or URL here',
  /**
   *@description Title of disable capture jsprofile setting in timeline panel of the performance panel
   */
  disableJavascriptSamples: 'Disable JavaScript samples',
  /**
   *@description Title of capture layers and pictures setting in timeline panel of the performance panel
   */
  enableAdvancedPaint: 'Enable advanced paint instrumentation (slow)',
  /**
   *@description Title of show screenshots setting in timeline panel of the performance panel
   */
  screenshots: 'Screenshots',
  /**
   *@description Text for the memory of the page
   */
  memory: 'Memory',
  /**
   *@description Text to clear content
   */
  clear: 'Clear',
  /**
   *@description Tooltip text that appears when hovering over the largeicon load button
   */
  loadProfile: 'Load profile…',
  /**
   *@description Tooltip text that appears when hovering over the largeicon download button
   */
  saveProfile: 'Save profile…',
  /**
   *@description Text to take screenshots
   */
  captureScreenshots: 'Capture screenshots',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  showMemoryTimeline: 'Show memory timeline',
  /**
   *@description Tooltip text that appears when hovering over the largeicon settings gear in show settings pane setting in timeline panel of the performance panel
   */
  captureSettings: 'Capture settings',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  disablesJavascriptSampling: 'Disables JavaScript sampling, reduces overhead when running against mobile devices',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  capturesAdvancedPaint: 'Captures advanced paint instrumentation, introduces significant performance overhead',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  network: 'Network:',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  cpu: 'CPU:',
  /**
   *@description Title of the 'Network conditions' tool in the bottom drawer
   */
  networkConditions: 'Network conditions',
  /**
   *@description Text in Timeline Panel of the Performance panel
   *@example {wrong format} PH1
   *@example {ERROR_FILE_NOT_FOUND} PH2
   */
  failedToSaveTimelineSS: 'Failed to save timeline: {PH1} ({PH2})',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  CpuThrottlingIsEnabled: '- CPU throttling is enabled',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  NetworkThrottlingIsEnabled: '- Network throttling is enabled',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  HardwareConcurrencyIsEnabled: '- Hardware concurrency override is enabled',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  SignificantOverheadDueToPaint: '- Significant overhead due to paint instrumentation',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  JavascriptSamplingIsDisabled: '- JavaScript sampling is disabled',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  stoppingTimeline: 'Stopping timeline…',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  received: 'Received',
  /**
   *@description Text to close something
   */
  close: 'Close',
  /**
   *@description Status text to indicate the recording has failed in the Performance panel
   */
  recordingFailed: 'Recording failed',
  /**
   * @description Text to indicate the progress of a profile. Informs the user that we are currently
   * creating a peformance profile.
   */
  profiling: 'Profiling…',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  bufferUsage: 'Buffer usage',
  /**
   *@description Text for an option to learn more about something
   */
  learnmore: 'Learn more',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  wasd: 'WASD',
  /**
   *@description Text in Timeline Panel of the Performance panel
   *@example {record} PH1
   *@example {Ctrl + R} PH2
   */
  clickTheRecordButtonSOrHitSTo: 'Click the record button {PH1} or hit {PH2} to start a new recording.',
  /**
   * @description Text in Timeline Panel of the Performance panel
   * @example {reload button} PH1
   * @example {Ctrl + R} PH2
   */
  clickTheReloadButtonSOrHitSTo: 'Click the reload button {PH1} or hit {PH2} to record the page load.',
  /**
   *@description Text in Timeline Panel of the Performance panel
   *@example {Ctrl + U} PH1
   *@example {Learn more} PH2
   */
  afterRecordingSelectAnAreaOf:
      'After recording, select an area of interest in the overview by dragging. Then, zoom and pan the timeline with the mousewheel or {PH1} keys. {PH2}',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  loadingProfile: 'Loading profile…',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  processingProfile: 'Processing profile…',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  initializingProfiler: 'Initializing profiler…',
  /**
   *@description Text for the status of something
   */
  status: 'Status',
  /**
   *@description Text that refers to the time
   */
  time: 'Time',
  /**
   *@description Text for the description of something
   */
  description: 'Description',
  /**
   *@description Text of an item that stops the running task
   */
  stop: 'Stop',
  /**
   *@description Time text content in Timeline Panel of the Performance panel
   *@example {2.12} PH1
   */
  ssec: '{PH1} sec',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelinePanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let timelinePanelInstance: TimelinePanel;
let isNode: boolean;

// TODO(crbug.com/1386091): Remove this enum when we can remove the
// old engine.
// eslint-disable-next-line rulesdir/const_enum
export enum ThreadTracksSource {
  NEW_ENGINE = 'NEW_ENGINE',
  OLD_ENGINE = 'OLD_ENGINE',
  BOTH_ENGINES = 'BOTH_ENGINES',
}

// TODO(crbug.com/1428024): Use the new engine.
const DEFAULT_THREAD_TRACKS_SOURCE = ThreadTracksSource.NEW_ENGINE;

// TypeScript will presumably get these types at some stage, and when it
// does these temporary types should be removed.
// TODO: Remove types when available in TypeScript.
declare global {
  interface FileSystemWritableFileStream extends WritableStream {
    write(data: unknown): Promise<void>;
    close(): Promise<void>;
  }

  interface FileSystemHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface Window {
    showSaveFilePicker(opts: unknown): Promise<FileSystemHandle>;
  }
}

export class TimelinePanel extends UI.Panel.Panel implements Client, TimelineModeViewDelegate {
  private readonly dropTarget: UI.DropTarget.DropTarget;
  private readonly recordingOptionUIControls: UI.Toolbar.ToolbarItem[];
  private state: State;
  private recordingPageReload: boolean;
  private readonly millisecondsToRecordAfterLoadEvent: number;
  private readonly toggleRecordAction: UI.ActionRegistration.Action;
  private readonly recordReloadAction: UI.ActionRegistration.Action;
  readonly #historyManager: TimelineHistoryManager;
  private performanceModel: PerformanceModel|null;
  private disableCaptureJSProfileSetting: Common.Settings.Setting<boolean>;
  private readonly captureLayersAndPicturesSetting: Common.Settings.Setting<boolean>;
  private showScreenshotsSetting: Common.Settings.Setting<boolean>;
  private showMemorySetting: Common.Settings.Setting<boolean>;
  private readonly panelToolbar: UI.Toolbar.Toolbar;
  private readonly panelRightToolbar: UI.Toolbar.Toolbar;
  private readonly timelinePane: UI.Widget.VBox;
  readonly #minimapComponent;
  private readonly statusPaneContainer: HTMLElement;
  private readonly flameChart: TimelineFlameChartView;
  private readonly searchableViewInternal: UI.SearchableView.SearchableView;
  private showSettingsPaneButton!: UI.Toolbar.ToolbarSettingToggle;
  private showSettingsPaneSetting!: Common.Settings.Setting<boolean>;
  private settingsPane!: UI.Widget.Widget;
  private controller!: TimelineController|null;
  private cpuProfiler!: SDK.CPUProfilerModel.CPUProfilerModel|null;
  private clearButton!: UI.Toolbar.ToolbarButton;
  private loadButton!: UI.Toolbar.ToolbarButton;
  private saveButton!: UI.Toolbar.ToolbarButton;
  private statusPane!: StatusPane|null;
  private landingPage!: UI.Widget.Widget;
  private loader?: TimelineLoader;
  private showScreenshotsToolbarCheckbox?: UI.Toolbar.ToolbarItem;
  private showMemoryToolbarCheckbox?: UI.Toolbar.ToolbarItem;
  private networkThrottlingSelect?: UI.Toolbar.ToolbarComboBox;
  private cpuThrottlingSelect?: UI.Toolbar.ToolbarComboBox;
  private fileSelectorElement?: HTMLInputElement;
  private selection?: TimelineSelection|null;
  private traceLoadStart!: number|null;
  private primaryPageTargetPromiseCallback = (_target: SDK.Target.Target): void => {};
  // Note: this is technically unused, but we need it to define the promiseCallback function above.
  private primaryPageTargetPromise = new Promise<SDK.Target.Target>(res => {
    this.primaryPageTargetPromiseCallback = res;
  });

  #traceEngineModel: TraceEngine.TraceModel.Model<typeof TraceEngine.Handlers.Migration.ENABLED_TRACE_HANDLERS>;
  // Tracks the index of the trace that the user is currently viewing.
  #traceEngineActiveTraceIndex = -1;
  #threadTracksSource: ThreadTracksSource;
  #sourceMapsResolver: SourceMapsResolver|null = null;
  #onSourceMapsNodeNamesResolvedBound = this.#onSourceMapsNodeNamesResolved.bind(this);

  constructor(threadTracksSource: ThreadTracksSource) {
    super('timeline');
    this.#threadTracksSource = threadTracksSource;
    this.#minimapComponent = new TimelineMiniMap(threadTracksSource);
    switch (threadTracksSource) {
      case ThreadTracksSource.BOTH_ENGINES:
      case ThreadTracksSource.NEW_ENGINE:
        this.#traceEngineModel = TraceEngine.TraceModel.Model.createWithAllHandlers();
        break;
      default:
        this.#traceEngineModel = TraceEngine.TraceModel.Model.createWithRequiredHandlersForMigration();
    }
    this.element.addEventListener('contextmenu', this.contextMenu.bind(this), false);
    this.dropTarget = new UI.DropTarget.DropTarget(
        this.element, [UI.DropTarget.Type.File, UI.DropTarget.Type.URI],
        i18nString(UIStrings.dropTimelineFileOrUrlHere), this.handleDrop.bind(this));

    this.recordingOptionUIControls = [];
    this.state = State.Idle;
    this.recordingPageReload = false;
    this.millisecondsToRecordAfterLoadEvent = 5000;
    this.toggleRecordAction =
        (UI.ActionRegistry.ActionRegistry.instance().action('timeline.toggle-recording') as
         UI.ActionRegistration.Action);
    this.recordReloadAction =
        (UI.ActionRegistry.ActionRegistry.instance().action('timeline.record-reload') as UI.ActionRegistration.Action);

    this.#historyManager = new TimelineHistoryManager(threadTracksSource);

    this.performanceModel = null;
    this.traceLoadStart = null;

    this.disableCaptureJSProfileSetting =
        Common.Settings.Settings.instance().createSetting('timelineDisableJSSampling', false);
    this.disableCaptureJSProfileSetting.setTitle(i18nString(UIStrings.disableJavascriptSamples));
    this.captureLayersAndPicturesSetting =
        Common.Settings.Settings.instance().createSetting('timelineCaptureLayersAndPictures', false);
    this.captureLayersAndPicturesSetting.setTitle(i18nString(UIStrings.enableAdvancedPaint));

    this.showScreenshotsSetting =
        Common.Settings.Settings.instance().createSetting('timelineShowScreenshots', isNode ? false : true);
    this.showScreenshotsSetting.setTitle(i18nString(UIStrings.screenshots));
    this.showScreenshotsSetting.addChangeListener(this.updateOverviewControls, this);

    this.showMemorySetting = Common.Settings.Settings.instance().createSetting('timelineShowMemory', false);
    this.showMemorySetting.setTitle(i18nString(UIStrings.memory));
    this.showMemorySetting.addChangeListener(this.onModeChanged, this);

    const timelineToolbarContainer = this.element.createChild('div', 'timeline-toolbar-container');
    this.panelToolbar = new UI.Toolbar.Toolbar('timeline-main-toolbar', timelineToolbarContainer);
    this.panelToolbar.makeWrappable(true);
    this.panelRightToolbar = new UI.Toolbar.Toolbar('', timelineToolbarContainer);
    if (!isNode) {
      this.createSettingsPane();
      this.updateShowSettingsToolbarButton();
    }
    this.timelinePane = new UI.Widget.VBox();
    this.timelinePane.show(this.element);
    const topPaneElement = this.timelinePane.element.createChild('div', 'hbox');
    topPaneElement.id = 'timeline-overview-panel';

    this.#minimapComponent.show(topPaneElement);
    this.#minimapComponent.addEventListener(
        PerfUI.TimelineOverviewPane.Events.WindowChanged, this.onOverviewWindowChanged.bind(this));

    this.statusPaneContainer = this.timelinePane.element.createChild('div', 'status-pane-container fill');

    this.createFileSelector();

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this.loadEventFired, this);

    this.flameChart = new TimelineFlameChartView(this, threadTracksSource);
    this.searchableViewInternal = new UI.SearchableView.SearchableView(this.flameChart, null);
    this.searchableViewInternal.setMinimumSize(0, 100);
    this.searchableViewInternal.element.classList.add('searchable-view');
    this.searchableViewInternal.show(this.timelinePane.element);
    this.flameChart.show(this.searchableViewInternal.element);
    this.flameChart.setSearchableView(this.searchableViewInternal);
    this.searchableViewInternal.hideWidget();

    this.onModeChanged();
    this.populateToolbar();
    this.showLandingPage();
    this.updateTimelineControls();

    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.SuspendStateChanged, this.onSuspendStateChanged, this);
    if (Root.Runtime.experiments.isEnabled('timelineAsConsoleProfileResultPanel')) {
      const profilerModels = SDK.TargetManager.TargetManager.instance().models(SDK.CPUProfilerModel.CPUProfilerModel);
      for (const model of profilerModels) {
        for (const message of model.registeredConsoleProfileMessages) {
          this.consoleProfileFinished(message);
        }
      }
      SDK.TargetManager.TargetManager.instance().observeModels(
          SDK.CPUProfilerModel.CPUProfilerModel,
          {
            modelAdded: (model: SDK.CPUProfilerModel.CPUProfilerModel) => {
              model.addEventListener(
                  SDK.CPUProfilerModel.Events.ConsoleProfileFinished, event => this.consoleProfileFinished(event.data));
            },
            modelRemoved: (_model: SDK.CPUProfilerModel.CPUProfilerModel) => {

            },
          },
      );
    }
    SDK.TargetManager.TargetManager.instance().observeTargets({
      targetAdded: (target: SDK.Target.Target) => {
        if (target !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
          return;
        }
        this.primaryPageTargetPromiseCallback(target);
      },
      targetRemoved: (_: SDK.Target.Target) => {},
    });
  }

  static instance(opts: {
    forceNew: boolean|null,
    isNode: boolean,
    threadTracksSource?: ThreadTracksSource,
  }|undefined = {forceNew: null, isNode: false}): TimelinePanel {
    const {forceNew, isNode: isNodeMode} = opts;
    isNode = isNodeMode;

    if (!timelinePanelInstance || forceNew) {
      timelinePanelInstance = new TimelinePanel(opts.threadTracksSource || DEFAULT_THREAD_TRACKS_SOURCE);
    }

    return timelinePanelInstance;
  }

  override searchableView(): UI.SearchableView.SearchableView|null {
    return this.searchableViewInternal;
  }

  override wasShown(): void {
    super.wasShown();
    UI.Context.Context.instance().setFlavor(TimelinePanel, this);
    this.registerCSSFiles([timelinePanelStyles]);
    // Record the performance tool load time.
    Host.userMetrics.panelLoaded('timeline', 'DevTools.Launch.Timeline');
  }

  override willHide(): void {
    UI.Context.Context.instance().setFlavor(TimelinePanel, null);
    this.#historyManager.cancelIfShowing();
  }

  loadFromEvents(events: TraceEngine.TracingManager.EventPayload[]): void {
    if (this.state !== State.Idle) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = TimelineLoader.loadFromEvents(events, this);
  }

  getFlameChart(): TimelineFlameChartView {
    return this.flameChart;
  }

  private loadFromCpuProfile(profile: Protocol.Profiler.Profile|null, title?: string): void {
    if (this.state !== State.Idle) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = TimelineLoader.loadFromCpuProfile(profile, this, title);
  }

  private onOverviewWindowChanged(
      event: Common.EventTarget.EventTargetEvent<PerfUI.TimelineOverviewPane.WindowChangedEvent>): void {
    if (!this.performanceModel) {
      return;
    }

    const left = (event.data.startTime > 0) ? event.data.startTime : this.performanceModel.minimumRecordTime();
    const right = Number.isFinite(event.data.endTime) ? event.data.endTime : this.performanceModel.maximumRecordTime();
    this.performanceModel.setWindow({left, right}, /* animate */ true, event.data.breadcrumb);

    TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
        TraceEngine.Helpers.Timing.traceWindowFromMilliSeconds(
            TraceEngine.Types.Timing.MilliSeconds(left),
            TraceEngine.Types.Timing.MilliSeconds(right),
            ),
        {
          shouldAnimate: true,
        },
    );
  }

  private onModelWindowChanged(event: Common.EventTarget.EventTargetEvent<WindowChangedEvent>): void {
    const window = event.data.window;
    this.#minimapComponent.setWindowTimes(window.left, window.right);
  }

  private setState(state: State): void {
    this.state = state;
    this.updateTimelineControls();
  }

  private createSettingCheckbox(setting: Common.Settings.Setting<boolean>, tooltip: string): UI.Toolbar.ToolbarItem {
    const checkboxItem = new UI.Toolbar.ToolbarSettingCheckbox(setting, tooltip);
    this.recordingOptionUIControls.push(checkboxItem);
    return checkboxItem;
  }

  private populateToolbar(): void {
    // Record
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.toggleRecordAction));
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.recordReloadAction));
    this.clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clear), 'clear');
    this.clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => this.onClearButton());
    this.panelToolbar.appendToolbarItem(this.clearButton);

    // Load / Save
    this.loadButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.loadProfile), 'import');
    this.loadButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceImported);
      this.selectFileToLoad();
    });
    this.saveButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.saveProfile), 'download');
    this.saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, _event => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceExported);
      void this.saveToFile();
    });
    this.panelToolbar.appendSeparator();
    this.panelToolbar.appendToolbarItem(this.loadButton);
    this.panelToolbar.appendToolbarItem(this.saveButton);

    // History
    this.panelToolbar.appendSeparator();
    this.panelToolbar.appendToolbarItem(this.#historyManager.button());
    this.panelToolbar.registerCSSFiles([historyToolbarButtonStyles]);
    this.panelToolbar.appendSeparator();

    // View
    this.panelToolbar.appendSeparator();
    if (!isNode) {
      this.showScreenshotsToolbarCheckbox =
          this.createSettingCheckbox(this.showScreenshotsSetting, i18nString(UIStrings.captureScreenshots));
      this.panelToolbar.appendToolbarItem(this.showScreenshotsToolbarCheckbox);
    }

    this.showMemoryToolbarCheckbox =
        this.createSettingCheckbox(this.showMemorySetting, i18nString(UIStrings.showMemoryTimeline));
    this.panelToolbar.appendToolbarItem(this.showMemoryToolbarCheckbox);

    // GC
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButtonForId('components.collect-garbage'));

    // Settings
    if (!isNode) {
      this.panelRightToolbar.appendSeparator();
      this.panelRightToolbar.appendToolbarItem(this.showSettingsPaneButton);
    }
  }

  private createSettingsPane(): void {
    this.showSettingsPaneSetting =
        Common.Settings.Settings.instance().createSetting('timelineShowSettingsToolbar', false);
    this.showSettingsPaneButton = new UI.Toolbar.ToolbarSettingToggle(
        this.showSettingsPaneSetting, 'gear', i18nString(UIStrings.captureSettings), 'gear-filled');
    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, this.updateShowSettingsToolbarButton,
        this);
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener(
        SDK.CPUThrottlingManager.Events.RateChanged, this.updateShowSettingsToolbarButton, this);
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener(
        SDK.CPUThrottlingManager.Events.HardwareConcurrencyChanged, this.updateShowSettingsToolbarButton, this);
    this.disableCaptureJSProfileSetting.addChangeListener(this.updateShowSettingsToolbarButton, this);
    this.captureLayersAndPicturesSetting.addChangeListener(this.updateShowSettingsToolbarButton, this);

    this.settingsPane = new UI.Widget.HBox();
    this.settingsPane.element.classList.add('timeline-settings-pane');
    this.settingsPane.show(this.element);

    const captureToolbar = new UI.Toolbar.Toolbar('', this.settingsPane.element);
    captureToolbar.element.classList.add('flex-auto');
    captureToolbar.makeVertical();
    captureToolbar.appendToolbarItem(this.createSettingCheckbox(
        this.disableCaptureJSProfileSetting, i18nString(UIStrings.disablesJavascriptSampling)));
    captureToolbar.appendToolbarItem(
        this.createSettingCheckbox(this.captureLayersAndPicturesSetting, i18nString(UIStrings.capturesAdvancedPaint)));

    const throttlingPane = new UI.Widget.VBox();
    throttlingPane.element.classList.add('flex-auto');
    throttlingPane.show(this.settingsPane.element);

    const cpuThrottlingToolbar = new UI.Toolbar.Toolbar('', throttlingPane.element);
    cpuThrottlingToolbar.appendText(i18nString(UIStrings.cpu));
    this.cpuThrottlingSelect = MobileThrottling.ThrottlingManager.throttlingManager().createCPUThrottlingSelector();
    cpuThrottlingToolbar.appendToolbarItem(this.cpuThrottlingSelect);

    const networkThrottlingToolbar = new UI.Toolbar.Toolbar('', throttlingPane.element);
    networkThrottlingToolbar.appendText(i18nString(UIStrings.network));
    this.networkThrottlingSelect = this.createNetworkConditionsSelect();
    networkThrottlingToolbar.appendToolbarItem(this.networkThrottlingSelect);

    const hardwareConcurrencyPane = new UI.Widget.VBox();
    hardwareConcurrencyPane.element.classList.add('flex-auto');
    hardwareConcurrencyPane.show(this.settingsPane.element);

    const {toggle, input, reset, warning} =
        MobileThrottling.ThrottlingManager.throttlingManager().createHardwareConcurrencySelector();
    const concurrencyThrottlingToolbar = new UI.Toolbar.Toolbar('', hardwareConcurrencyPane.element);
    concurrencyThrottlingToolbar.registerCSSFiles([timelinePanelStyles]);
    input.element.classList.add('timeline-concurrency-input');
    concurrencyThrottlingToolbar.appendToolbarItem(toggle);
    concurrencyThrottlingToolbar.appendToolbarItem(input);
    concurrencyThrottlingToolbar.appendToolbarItem(reset);
    concurrencyThrottlingToolbar.appendToolbarItem(warning);

    this.showSettingsPaneSetting.addChangeListener(this.updateSettingsPaneVisibility.bind(this));
    this.updateSettingsPaneVisibility();
  }

  private createNetworkConditionsSelect(): UI.Toolbar.ToolbarComboBox {
    const toolbarItem = new UI.Toolbar.ToolbarComboBox(null, i18nString(UIStrings.networkConditions));
    toolbarItem.setMaxWidth(140);
    MobileThrottling.ThrottlingManager.throttlingManager().decorateSelectWithNetworkThrottling(
        toolbarItem.selectElement());
    return toolbarItem;
  }

  private prepareToLoadTimeline(): void {
    console.assert(this.state === State.Idle);
    this.setState(State.Loading);
    if (this.performanceModel) {
      this.performanceModel = null;
    }
  }

  private createFileSelector(): void {
    if (this.fileSelectorElement) {
      this.fileSelectorElement.remove();
    }
    this.fileSelectorElement = UI.UIUtils.createFileSelectorElement(this.loadFromFile.bind(this));
    this.timelinePane.element.appendChild(this.fileSelectorElement);
  }

  private contextMenu(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendItemsAtLocation('timelineMenu');
    void contextMenu.show();
  }

  async saveToFile(): Promise<void> {
    if (this.state !== State.Idle) {
      return;
    }
    const performanceModel = this.performanceModel;
    if (!performanceModel) {
      return;
    }

    const traceEvents = this.#traceEngineModel.traceEvents(this.#traceEngineActiveTraceIndex);
    const metadata = this.#traceEngineModel.metadata(this.#traceEngineActiveTraceIndex);
    if (!traceEvents) {
      return;
    }

    const traceStart = Platform.DateUtilities.toISO8601Compact(new Date());
    let fileName: Platform.DevToolsPath.RawPathString;
    if (metadata?.dataOrigin === TraceEngine.Types.File.DataOrigin.CPUProfile) {
      fileName = `CPU-${traceStart}.cpuprofile` as Platform.DevToolsPath.RawPathString;
    } else {
      fileName = `Trace-${traceStart}.json` as Platform.DevToolsPath.RawPathString;
    }

    try {
      const handler = await window.showSaveFilePicker({
        suggestedName: fileName,
      });
      const encoder = new TextEncoder();

      // TODO(crbug.com/1456818): Extract this logic and add more tests.
      let traceAsString;
      if (metadata?.dataOrigin === TraceEngine.Types.File.DataOrigin.CPUProfile) {
        const profileEvent = traceEvents.find(e => e.name === 'CpuProfile');
        if (!profileEvent || !profileEvent.args?.data) {
          return;
        }
        const profileEventData = profileEvent.args?.data;
        if (profileEventData.hasOwnProperty('cpuProfile')) {
          // TODO(crbug.com/1456799): Currently use a hack way because we can't differentiate
          // cpuprofile from trace events when loading a file.
          // The loader will directly add the fake trace created from CpuProfile to the tracingModel.
          // And there is where the old saving logic saves the cpuprofile.
          // This will be solved when the CPUProfileHandler is done. Then we can directly get it
          // from the new traceEngine
          const profile = (profileEventData as {cpuProfile: Protocol.Profiler.Profile}).cpuProfile;
          traceAsString = cpuprofileJsonGenerator(profile as Protocol.Profiler.Profile);
        }
      } else {
        const formattedTraceIter = traceJsonGenerator(traceEvents, metadata);
        traceAsString = Array.from(formattedTraceIter).join('');
      }
      const buffer = encoder.encode(traceAsString);
      const writable = await handler.createWritable();
      await writable.write(buffer);
      await writable.close();
    } catch (error) {
      console.error(error.stack);
      if (error.name === 'AbortError') {
        // The user cancelled the action, so this is not an error we need to report.
        return;
      }
      Common.Console.Console.instance().error(
          i18nString(UIStrings.failedToSaveTimelineSS, {PH1: error.message, PH2: error.name}));
    }
  }

  async showHistory(): Promise<void> {
    const recordingData = await this.#historyManager.showHistoryDropDown();
    if (recordingData && recordingData.legacyModel !== this.performanceModel) {
      this.setModel(recordingData.legacyModel, /* exclusiveFilter= */ null, recordingData.traceParseDataIndex);
    }
  }

  navigateHistory(direction: number): boolean {
    const recordingData = this.#historyManager.navigate(direction);
    if (recordingData && recordingData.legacyModel !== this.performanceModel) {
      this.setModel(recordingData.legacyModel, /* exclusiveFilter= */ null, recordingData.traceParseDataIndex);
    }
    return true;
  }

  selectFileToLoad(): void {
    if (this.fileSelectorElement) {
      this.fileSelectorElement.click();
    }
  }

  async loadFromFile(file: File): Promise<void> {
    if (this.state !== State.Idle) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = await TimelineLoader.loadFromFile(file, this);
    this.createFileSelector();
  }

  async loadFromURL(url: Platform.DevToolsPath.UrlString): Promise<void> {
    if (this.state !== State.Idle) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = await TimelineLoader.loadFromURL(url, this);
  }

  private updateOverviewControls(): void {
    const traceParsedData = this.#traceEngineModel.traceParsedData(this.#traceEngineActiveTraceIndex);
    const isCpuProfile = this.#traceEngineModel.metadata(this.#traceEngineActiveTraceIndex)?.dataOrigin ===
        TraceEngine.Types.File.DataOrigin.CPUProfile;

    this.#minimapComponent.setData({
      performanceModel: this.performanceModel,
      traceParsedData,
      isCpuProfile,
      settings: {
        showScreenshots: this.showScreenshotsSetting.get(),
        showMemory: this.showMemorySetting.get(),
      },
    });
  }

  private onModeChanged(): void {
    this.updateOverviewControls();
    this.doResize();
    this.select(null);
  }

  private updateSettingsPaneVisibility(): void {
    if (isNode) {
      return;
    }
    if (this.showSettingsPaneSetting.get()) {
      this.settingsPane.showWidget();
    } else {
      this.settingsPane.hideWidget();
    }
  }

  private updateShowSettingsToolbarButton(): void {
    const messages: string[] = [];
    if (SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingRate() !== 1) {
      messages.push(i18nString(UIStrings.CpuThrottlingIsEnabled));
    }
    if (MobileThrottling.ThrottlingManager.throttlingManager().hardwareConcurrencyOverrideEnabled) {
      messages.push(i18nString(UIStrings.HardwareConcurrencyIsEnabled));
    }
    if (SDK.NetworkManager.MultitargetNetworkManager.instance().isThrottling()) {
      messages.push(i18nString(UIStrings.NetworkThrottlingIsEnabled));
    }
    if (this.captureLayersAndPicturesSetting.get()) {
      messages.push(i18nString(UIStrings.SignificantOverheadDueToPaint));
    }
    if (this.disableCaptureJSProfileSetting.get()) {
      messages.push(i18nString(UIStrings.JavascriptSamplingIsDisabled));
    }

    this.showSettingsPaneButton.setDefaultWithRedColor(messages.length > 0);
    this.showSettingsPaneButton.setToggleWithRedColor(messages.length > 0);

    if (messages.length) {
      const tooltipElement = document.createElement('div');
      messages.forEach(message => {
        tooltipElement.createChild('div').textContent = message;
      });
      this.showSettingsPaneButton.setTitle(tooltipElement.textContent || '');
    } else {
      this.showSettingsPaneButton.setTitle(i18nString(UIStrings.captureSettings));
    }
  }

  private setUIControlsEnabled(enabled: boolean): void {
    this.recordingOptionUIControls.forEach(control => control.setEnabled(enabled));
  }

  async #evaluateInspectedURL(): Promise<Platform.DevToolsPath.UrlString> {
    if (!this.controller) {
      return Platform.DevToolsPath.EmptyUrlString;
    }

    // target.inspectedURL is reliably populated, however it lacks any url #hash
    const inspectedURL = this.controller.primaryPageTarget.inspectedURL();

    // We'll use the navigationHistory to acquire the current URL including hash
    const resourceTreeModel = this.controller.primaryPageTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const navHistory = resourceTreeModel && await resourceTreeModel.navigationHistory();
    if (!resourceTreeModel || !navHistory) {
      return inspectedURL;
    }

    const {currentIndex, entries} = navHistory;
    const navigationEntry = entries[currentIndex];
    return navigationEntry.url as Platform.DevToolsPath.UrlString;
  }

  async #navigateToAboutBlank(): Promise<void> {
    const aboutBlankNavigationComplete = new Promise<void>(async (resolve, reject) => {
      if (!this.controller) {
        reject('Could not find TimelineController');
        return;
      }
      const target = this.controller.primaryPageTarget;
      const resourceModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      if (!resourceModel) {
        reject('Could not load resourceModel');
        return;
      }

      // To clear out the page and any state from prior test runs, we
      // navigate to about:blank before initiating the trace recording.
      // Once we have navigated to about:blank, we start recording and
      // then navigate to the original page URL, to ensure we profile the
      // page load.
      function waitForAboutBlank(event: Common.EventTarget.EventTargetEvent<SDK.ResourceTreeModel.ResourceTreeFrame>):
          void {
        if (event.data.url === 'about:blank') {
          resolve();
        } else {
          reject(`Unexpected navigation to ${event.data.url}`);
        }
        resourceModel?.removeEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, waitForAboutBlank);
      }
      resourceModel.addEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, waitForAboutBlank);
      await resourceModel.navigate('about:blank' as Platform.DevToolsPath.UrlString);
    });
    await aboutBlankNavigationComplete;
  }

  async #startCPUProfilingRecording(): Promise<void> {
    try {
      // Only profile the first target devtools connects to. If we profile all target, but this will cause some bugs
      // like time for the function is calculated wrong, because the profiles will be concated and sorted together,
      // so the total time will be amplified.
      // Multiple targets problem might happen when you inspect multiple node servers on different port at same time,
      // or when you let DevTools listen to both locolhost:9229 & 127.0.0.1:9229.
      const firstNodeTarget =
          SDK.TargetManager.TargetManager.instance().targets().find(target => target.type() === SDK.Target.Type.Node);
      if (!firstNodeTarget) {
        throw new Error('Could not load any Node target.');
      }
      if (firstNodeTarget) {
        this.cpuProfiler = firstNodeTarget.model(SDK.CPUProfilerModel.CPUProfilerModel);
      }
      this.setUIControlsEnabled(false);
      this.hideLandingPage();
      if (!this.cpuProfiler) {
        throw new Error('No Node target is found.');
      }
      await SDK.TargetManager.TargetManager.instance().suspendAllTargets('performance-timeline');
      await this.cpuProfiler.startRecording();

      this.recordingStarted();
    } catch (e) {
      await this.recordingFailed(e.message);
    }
  }

  async #startTraceRecording(): Promise<void> {
    try {
      // We record against the root target, but also need to use the
      // primaryPageTarget to inspect the current URL. For more info, see the
      // JSDoc comment on the TimelineController constructor.
      const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
      const primaryPageTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();

      if (!primaryPageTarget) {
        throw new Error('Could not load primary page target.');
      }
      if (!rootTarget) {
        throw new Error('Could not load root target.');
      }

      if (UIDevtoolsUtils.isUiDevTools()) {
        this.controller = new UIDevtoolsController(rootTarget, primaryPageTarget, this);
      } else {
        this.controller = new TimelineController(rootTarget, primaryPageTarget, this);
      }
      this.setUIControlsEnabled(false);
      this.hideLandingPage();
      if (!this.controller) {
        throw new Error('Could not create Timeline controller');
      }

      const urlToTrace = await this.#evaluateInspectedURL();
      // If we are doing "Reload & record", we first navigate the page to
      // about:blank. This is to ensure any data on the timeline from any
      // previous performance recording is lost, avoiding the problem where a
      // timeline will show data & screenshots from a previous page load that
      // was not relevant.
      if (this.recordingPageReload) {
        await this.#navigateToAboutBlank();
      }
      const recordingOptions = {
        enableJSSampling: !this.disableCaptureJSProfileSetting.get(),
        capturePictures: this.captureLayersAndPicturesSetting.get(),
        captureFilmStrip: this.showScreenshotsSetting.get(),
      };
      // Order is important here: we tell the controller to start recording, which enables tracing.
      const response = await this.controller.startRecording(recordingOptions);
      if (response.getError()) {
        throw new Error(response.getError());
      }
      // Once we get here, we know tracing is active.
      // This is when, if the user has hit "Reload & Record" that we now need to navigate to the original URL.
      // If the user has just hit "record", we don't do any navigating.
      const recordingConfig = this.recordingPageReload ? {navigateToUrl: urlToTrace} : undefined;
      this.recordingStarted(recordingConfig);
    } catch (e) {
      await this.recordingFailed(e.message);
    }
  }

  private async startRecording(): Promise<void> {
    console.assert(!this.statusPane, 'Status pane is already opened.');
    this.setState(State.StartPending);
    this.showRecordingStarted();

    if (isNode) {
      await this.#startCPUProfilingRecording();
    } else {
      await this.#startTraceRecording();
    }
  }

  private async stopRecording(): Promise<void> {
    if (this.statusPane) {
      this.statusPane.finish();
      this.statusPane.updateStatus(i18nString(UIStrings.stoppingTimeline));
      this.statusPane.updateProgressBar(i18nString(UIStrings.received), 0);
    }
    this.setState(State.StopPending);
    if (this.controller) {
      this.performanceModel = this.controller.getPerformanceModel();
      await this.controller.stopRecording();
      this.setUIControlsEnabled(true);
      await this.controller.dispose();
      this.controller = null;
      return;
    }
    if (this.cpuProfiler) {
      const profile = await this.cpuProfiler.stopRecording();
      this.setState(State.Idle);
      this.loadFromCpuProfile(profile);

      this.setUIControlsEnabled(true);
      this.cpuProfiler = null;

      await SDK.TargetManager.TargetManager.instance().resumeAllTargets();
    }
  }

  private async recordingFailed(error: string): Promise<void> {
    if (this.statusPane) {
      this.statusPane.remove();
    }
    this.statusPane = new StatusPane(
        {
          description: error,
          buttonText: i18nString(UIStrings.close),
          buttonDisabled: false,
          showProgress: undefined,
          showTimer: undefined,
        },
        // When recording failed, we should load null to go back to the landing page.
        async () => {
          this.statusPane?.remove();
          await this.loadingComplete(/* tracingModel= */ null, /* exclusiveFilter= */ null, /* isCpuProfile= */ false);
        });
    this.statusPane.showPane(this.statusPaneContainer);
    this.statusPane.updateStatus(i18nString(UIStrings.recordingFailed));

    this.setState(State.RecordingFailed);
    this.performanceModel = null;
    this.traceLoadStart = null;
    this.setUIControlsEnabled(true);
    if (this.controller) {
      await this.controller.dispose();
      this.controller = null;
    }
    // Ensure we resume all targets, otherwise DevTools remains unresponsive in the event of an error.
    void SDK.TargetManager.TargetManager.instance().resumeAllTargets();
  }

  private onSuspendStateChanged(): void {
    this.updateTimelineControls();
  }

  private consoleProfileFinished(data: SDK.CPUProfilerModel.ProfileFinishedData): void {
    this.loadFromCpuProfile(data.cpuProfile, data.title);
    void UI.InspectorView.InspectorView.instance().showPanel('timeline');
  }

  private updateTimelineControls(): void {
    const state = State;
    this.toggleRecordAction.setToggled(this.state === state.Recording);
    this.toggleRecordAction.setEnabled(this.state === state.Recording || this.state === state.Idle);
    this.recordReloadAction.setEnabled(isNode ? false : this.state === state.Idle);
    this.#historyManager.setEnabled(this.state === state.Idle);
    this.clearButton.setEnabled(this.state === state.Idle);
    this.panelToolbar.setEnabled(this.state !== state.Loading);
    this.panelRightToolbar.setEnabled(this.state !== state.Loading);
    this.dropTarget.setEnabled(this.state === state.Idle);
    this.loadButton.setEnabled(this.state === state.Idle);
    this.saveButton.setEnabled(this.state === state.Idle && Boolean(this.performanceModel));
  }

  async toggleRecording(): Promise<void> {
    if (this.state === State.Idle) {
      this.recordingPageReload = false;
      await this.startRecording();
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.TimelineStarted);
    } else if (this.state === State.Recording) {
      await this.stopRecording();
    }
  }

  recordReload(): void {
    if (this.state !== State.Idle) {
      return;
    }
    this.recordingPageReload = true;
    void this.startRecording();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.TimelinePageReloadStarted);
  }

  private onClearButton(): void {
    this.#historyManager.clear();
    this.clear();
  }

  private clear(): void {
    if (this.statusPane) {
      this.statusPane.remove();
    }
    this.showLandingPage();
    this.reset();
  }

  private reset(): void {
    PerfUI.LineLevelProfile.Performance.instance().reset();
    if (this.performanceModel) {
      this.performanceModel.removeEventListener(Events.NamesResolved, this.updateModelAndFlameChart, this);
    }
    if (this.#sourceMapsResolver) {
      this.#sourceMapsResolver.removeEventListener(
          NodeNamesUpdated.eventName, this.#onSourceMapsNodeNamesResolvedBound);
      this.#sourceMapsResolver.uninstall();
      this.#sourceMapsResolver = null;
    }
    this.setModel(null);
  }

  private applyFilters(
      model: PerformanceModel,
      exclusiveFilter: TimelineModel.TimelineModelFilter.TimelineModelFilter|null = null): void {
    if (model.timelineModel().isGenericTrace() || Root.Runtime.experiments.isEnabled('timelineShowAllEvents')) {
      return;
    }
    model.setFilters(exclusiveFilter ? [exclusiveFilter] : [TimelineUIUtils.visibleEventsFilter()]);
  }

  setModel(
      model: PerformanceModel|null, exclusiveFilter: TimelineModel.TimelineModelFilter.TimelineModelFilter|null = null,
      traceEngineIndex: number = -1): void {
    if (this.performanceModel) {
      this.performanceModel.removeEventListener(Events.WindowChanged, this.onModelWindowChanged, this);
    }
    this.performanceModel = model;
    if (model) {
      this.searchableViewInternal.showWidget();
      this.applyFilters(model, exclusiveFilter);
    } else {
      this.searchableViewInternal.hideWidget();
    }
    this.#traceEngineActiveTraceIndex = traceEngineIndex;
    const traceParsedData = this.#traceEngineModel.traceParsedData(this.#traceEngineActiveTraceIndex);
    const isCpuProfile = this.#traceEngineModel.metadata(this.#traceEngineActiveTraceIndex)?.dataOrigin ===
        TraceEngine.Types.File.DataOrigin.CPUProfile;
    if (traceParsedData) {
      TraceBounds.TraceBounds.BoundsManager.instance({
        forceNew: true,
        initialBounds: traceParsedData.Meta.traceBounds,
      });
    }
    this.flameChart.setModel(model, traceParsedData, isCpuProfile);

    this.updateOverviewControls();
    this.#minimapComponent.reset();
    if (model) {
      model.addEventListener(Events.WindowChanged, this.onModelWindowChanged, this);
      this.#minimapComponent.setBounds(
          TraceEngine.Types.Timing.MilliSeconds(model.timelineModel().minimumRecordTime()),
          TraceEngine.Types.Timing.MilliSeconds(model.timelineModel().maximumRecordTime()));
      PerfUI.LineLevelProfile.Performance.instance().reset();
      for (const profile of model.timelineModel().cpuProfiles()) {
        PerfUI.LineLevelProfile.Performance.instance().appendCPUProfile(profile.cpuProfileData, profile.target);
      }
      this.flameChart.setSelection(null);
      const {left, right} = model.calculateWindowForMainThreadActivity();
      model.setWindow({left, right});
      this.#minimapComponent.setWindowTimes(left, right);
      if (traceParsedData) {
        TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
            TraceEngine.Helpers.Timing.traceWindowFromMilliSeconds(left, right),
        );
      }
    }

    this.updateOverviewControls();
    if (this.flameChart) {
      this.flameChart.resizeToPreferredHeights();
    }
    this.updateTimelineControls();
  }

  private recordingStarted(config?: {navigateToUrl: Platform.DevToolsPath.UrlString}): void {
    if (config && this.recordingPageReload && this.controller) {
      // If the user hit "Reload & record", by this point we have:
      // 1. Navigated to about:blank
      // 2. Initiated tracing.
      // We therefore now should navigate back to the original URL that the user wants to profile.
      const resourceModel = this.controller?.primaryPageTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
      if (!resourceModel) {
        void this.recordingFailed('Could not navigate to original URL');
        return;
      }
      // We don't need to await this because we are purposefully showing UI
      // progress as the page loads & tracing is underway.
      void resourceModel.navigate(config.navigateToUrl);
    }

    this.reset();
    this.setState(State.Recording);
    this.showRecordingStarted();
    if (this.statusPane) {
      this.statusPane.enableAndFocusButton();
      this.statusPane.updateStatus(i18nString(UIStrings.profiling));
      this.statusPane.updateProgressBar(i18nString(UIStrings.bufferUsage), 0);
      this.statusPane.startTimer();
    }
    this.hideLandingPage();
  }

  recordingProgress(usage: number): void {
    if (this.statusPane) {
      this.statusPane.updateProgressBar(i18nString(UIStrings.bufferUsage), usage * 100);
    }
  }

  private showLandingPage(): void {
    this.updateSettingsPaneVisibility();
    if (this.landingPage) {
      this.landingPage.show(this.statusPaneContainer);
      return;
    }

    function encloseWithTag(tagName: string, contents: string): HTMLElement {
      const e = document.createElement(tagName);
      e.textContent = contents;
      return e;
    }

    const learnMoreNode = UI.XLink.XLink.create(
        'https://developer.chrome.com/docs/devtools/evaluate-performance/', i18nString(UIStrings.learnmore));

    const recordKey = encloseWithTag(
        'b',
        UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction('timeline.toggle-recording')[0].title());
    const reloadKey = encloseWithTag(
        'b', UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction('timeline.record-reload')[0].title());
    const navigateNode = encloseWithTag('b', i18nString(UIStrings.wasd));

    this.landingPage = new UI.Widget.VBox();
    this.landingPage.contentElement.classList.add('timeline-landing-page', 'fill');
    const centered = this.landingPage.contentElement.createChild('div');

    const recordButton = UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButton(this.toggleRecordAction));
    const reloadButton =
        UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButtonForId('timeline.record-reload'));

    centered.createChild('p').appendChild(i18n.i18n.getFormatLocalizedString(
        str_, UIStrings.clickTheRecordButtonSOrHitSTo, {PH1: recordButton, PH2: recordKey}));

    centered.createChild('p').appendChild(i18n.i18n.getFormatLocalizedString(
        str_, UIStrings.clickTheReloadButtonSOrHitSTo, {PH1: reloadButton, PH2: reloadKey}));

    centered.createChild('p').appendChild(i18n.i18n.getFormatLocalizedString(
        str_, UIStrings.afterRecordingSelectAnAreaOf, {PH1: navigateNode, PH2: learnMoreNode}));

    if (isNode) {
      const previewSection = new PanelFeedback.PanelFeedback.PanelFeedback();
      previewSection.data = {
        feedbackUrl: 'https://bugs.chromium.org/p/chromium/issues/detail?id=1354548' as Platform.DevToolsPath.UrlString,
        quickStartUrl: 'https://developer.chrome.com/blog/js-profiler-deprecation/' as Platform.DevToolsPath.UrlString,
        quickStartLinkText: i18nString(UIStrings.learnmore),
      };
      centered.appendChild(previewSection);
      const feedbackButton = new PanelFeedback.FeedbackButton.FeedbackButton();
      feedbackButton.data = {
        feedbackUrl: 'https://bugs.chromium.org/p/chromium/issues/detail?id=1354548' as Platform.DevToolsPath.UrlString,
      };
      centered.appendChild(feedbackButton);
    }

    this.landingPage.show(this.statusPaneContainer);
  }

  private hideLandingPage(): void {
    this.landingPage.detach();

    // Hide pane settings in trace view to conserve UI space, but preserve underlying setting.
    this.showSettingsPaneButton?.setToggled(false);
    this.settingsPane?.hideWidget();
  }

  async loadingStarted(): Promise<void> {
    this.hideLandingPage();

    if (this.statusPane) {
      this.statusPane.remove();
    }
    this.statusPane = new StatusPane(
        {
          showProgress: true,
          showTimer: undefined,
          buttonDisabled: undefined,
          buttonText: undefined,
          description: undefined,
        },
        () => this.cancelLoading());
    this.statusPane.showPane(this.statusPaneContainer);
    this.statusPane.updateStatus(i18nString(UIStrings.loadingProfile));
    // FIXME: make loading from backend cancelable as well.
    if (!this.loader) {
      this.statusPane.finish();
    }
    this.traceLoadStart = performance.now();
    await this.loadingProgress(0);
  }

  async loadingProgress(progress?: number): Promise<void> {
    if (typeof progress === 'number' && this.statusPane) {
      this.statusPane.updateProgressBar(i18nString(UIStrings.received), progress * 100);
    }
  }

  async processingStarted(): Promise<void> {
    if (this.statusPane) {
      this.statusPane.updateStatus(i18nString(UIStrings.processingProfile));
    }
  }

  #onSourceMapsNodeNamesResolved(): void {
    this.updateModelAndFlameChart();
  }

  updateModelAndFlameChart(): void {
    if (!this.performanceModel) {
      return;
    }
    this.setModel(this.performanceModel, null, this.#traceEngineActiveTraceIndex);
    this.flameChart.updateColorMapper();
  }

  async loadingComplete(
      tracingModel: TraceEngine.Legacy.TracingModel|null,
      exclusiveFilter: TimelineModel.TimelineModelFilter.TimelineModelFilter|null = null,
      isCpuProfile: boolean): Promise<void> {
    this.#traceEngineModel.resetProcessor();
    SourceMapsResolver.clearResolvedNodeNames();

    delete this.loader;

    // If the user just recorded this trace via the record UI, the state will
    // be StopPending. Whereas if it was an existing trace they loaded via a
    // file, it will be State.Loading. This means we can tell the recording is
    // fresh by checking the state value.
    const recordingIsFresh = this.state === State.StopPending;

    this.setState(State.Idle);

    if (!tracingModel) {
      this.clear();
      return;
    }

    if (!this.performanceModel) {
      this.performanceModel = new PerformanceModel();
    }

    try {
      // Run the new engine in parallel with the parsing done in the performanceModel
      await Promise.all([
        // Calling setTracingModel now and setModel so much later, leads to several problems due to addEventListener order being unexpected
        // TODO(paulirish): Resolve this, or just wait for the death of tracingModel. :)
        this.performanceModel.setTracingModel(tracingModel, recordingIsFresh, {
          // If we are using the new engine for everything, we do not need to
          // resolve sourcemaps within the old engine.
          resolveSourceMaps: this.#threadTracksSource !== ThreadTracksSource.NEW_ENGINE,
          isCpuProfile,
        }),
        this.#executeNewTraceEngine(
            tracingModel, recordingIsFresh, isCpuProfile, this.performanceModel.recordStartTime()),
      ]);
      // This code path is only executed when a new trace is recorded/imported,
      // so we know that the active index will be the size of the model because
      // the newest trace will be automatically set to active.
      this.#traceEngineActiveTraceIndex = this.#traceEngineModel.size() - 1;

      this.setModel(this.performanceModel, exclusiveFilter, this.#traceEngineActiveTraceIndex);

      if (this.statusPane) {
        this.statusPane.remove();
      }
      this.statusPane = null;

      const traceData = this.#traceEngineModel.traceParsedData(this.#traceEngineActiveTraceIndex);
      if (!traceData) {
        throw new Error(`Could not get trace data at index ${this.#traceEngineActiveTraceIndex}`);
      }

      // If we are running the old engine for sync tracks, ensure we listen to
      // and update the flamechart on any sourcemap resolution.
      if (this.#threadTracksSource !== ThreadTracksSource.NEW_ENGINE &&
          !this.performanceModel.hasEventListeners(Events.NamesResolved)) {
        this.performanceModel.addEventListener(Events.NamesResolved, this.updateModelAndFlameChart, this);
      }

      // Otherwise if we are running the new engine, instantiate it with the
      // trace data and update the flamechart on any sourcemap resolution
      if (this.#threadTracksSource !== ThreadTracksSource.OLD_ENGINE) {
        this.#sourceMapsResolver = new SourceMapsResolver(traceData);
        this.#sourceMapsResolver.addEventListener(NodeNamesUpdated.eventName, this.#onSourceMapsNodeNamesResolvedBound);
        await this.#sourceMapsResolver.install();
      }

      // We store the Performance Model and the index of the active trace.
      // However we also pass in the full trace data because we use it to build
      // the preview overview thumbnail of the trace that gets shown in the UI.
      this.#historyManager.addRecording({
        data: {
          legacyModel: this.performanceModel,
          traceParseDataIndex: this.#traceEngineActiveTraceIndex,
        },
        filmStripForPreview: TraceEngine.Extras.FilmStrip.fromTraceData(traceData),
        traceParsedData: traceData,
      });
      if (this.#minimapComponent.breadcrumbsActivated) {
        this.#minimapComponent.addInitialBreadcrumb();
      }
    } catch (error) {
      void this.recordingFailed(error.message);
      console.error(error);
    } finally {
      this.recordTraceLoadMetric();
    }
  }

  recordTraceLoadMetric(): void {
    if (!this.traceLoadStart) {
      return;
    }
    const start = this.traceLoadStart;
    // Right *now* is the end of trace parsing and model building, but the flamechart rendering
    // isn't complete yet. To capture that we'll do a rAF+setTimeout to give the most accurate timestamp
    // for the first paint of the flamechart
    requestAnimationFrame(() => {
      setTimeout(() => {
        const end = performance.now();
        const measure = performance.measure('TraceLoad', {start, end});
        Host.userMetrics.performanceTraceLoad(measure);
      }, 0);
    });
  }

  /**
   * Call into the new Trace Engine to parse the data. We don't currently do
   * anything with this data, but we are calling it here to ensure that all the
   * pieces are connected together and we are able to parse data in the new engine
   * from OPP.
   *
   * The trace engine model runs the parsing in a worker, so this should not
   * impact the main thread, as we `void` it to ensure we don't want for the
   * parsing to complete.
   **/
  async #executeNewTraceEngine(
      tracingModel: TraceEngine.Legacy.TracingModel, isFreshRecording: boolean, isCpuProfile: boolean,
      recordStartTime?: number): Promise<void> {
    const shouldGatherMetadata = isFreshRecording && !isCpuProfile;
    const metadata = shouldGatherMetadata ? await TraceEngine.Extras.Metadata.forNewRecording(recordStartTime) : {};
    metadata.dataOrigin =
        isCpuProfile ? TraceEngine.Types.File.DataOrigin.CPUProfile : TraceEngine.Types.File.DataOrigin.TraceEvents;

    return this.#traceEngineModel.parse(
        // OPP's data layer uses `EventPayload` as the type to represent raw JSON from the trace.
        // When we pass this into the new data engine, we need to tell TS to use the new TraceEventData type.
        tracingModel.allRawEvents() as unknown as TraceEngine.Types.TraceEvents.TraceEventData[],
        {
          metadata,
          isFreshRecording,
        },
    );
  }

  loadingCompleteForTest(): void {
    // Not implemented, added only for allowing the TimelineTestRunner
    // to be in sync when a trace load is finished.
  }
  private showRecordingStarted(): void {
    if (this.statusPane) {
      return;
    }
    this.statusPane = new StatusPane(
        {
          showTimer: true,
          showProgress: true,
          buttonDisabled: true,
          description: undefined,
          buttonText: undefined,
        },
        () => this.stopRecording());
    this.statusPane.showPane(this.statusPaneContainer);
    this.statusPane.updateStatus(i18nString(UIStrings.initializingProfiler));
  }

  private cancelLoading(): void {
    if (this.loader) {
      void this.loader.cancel();
    }
  }

  private async loadEventFired(
      event: Common.EventTarget
          .EventTargetEvent<{resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel, loadTime: number}>):
      Promise<void> {
    if (this.state !== State.Recording || !this.recordingPageReload || !this.controller ||
        this.controller.primaryPageTarget !== event.data.resourceTreeModel.target()) {
      return;
    }
    const controller = this.controller;
    await new Promise(r => window.setTimeout(r, this.millisecondsToRecordAfterLoadEvent));

    // Check if we're still in the same recording session.
    if (controller !== this.controller || this.state !== State.Recording) {
      return;
    }
    void this.stopRecording();
  }

  private frameForSelection(selection: TimelineSelection): TimelineModel.TimelineFrameModel.TimelineFrame|null {
    if (TimelineSelection.isFrameObject(selection.object)) {
      return selection.object;
    }
    if (TimelineSelection.isRangeSelection(selection.object) ||
        TimelineSelection.isSyntheticNetworkRequestDetailsEventSelection(selection.object)) {
      return null;
    }
    if (TimelineSelection.isTraceEventSelection(selection.object)) {
      if (!this.performanceModel) {
        return null;
      }
      return this.performanceModel.frameModel().getFramesWithinWindow(selection.endTime, selection.endTime)[0];
    }
    console.assert(false, 'Should never be reached');
    return null;
  }

  jumpToFrame(offset: number): true|undefined {
    const currentFrame = this.selection && this.frameForSelection(this.selection);
    if (!currentFrame || !this.performanceModel) {
      return;
    }
    const frames = this.performanceModel.frames();
    let index = frames.indexOf(currentFrame);
    console.assert(index >= 0, 'Can\'t find current frame in the frame list');
    index = Platform.NumberUtilities.clamp(index + offset, 0, frames.length - 1);
    const frame = frames[index];
    this.revealTimeRange(frame.startTime, frame.endTime);
    this.select(TimelineSelection.fromFrame(frame));
    return true;
  }

  select(selection: TimelineSelection|null): void {
    this.selection = selection;
    this.flameChart.setSelection(selection);
  }

  selectEntryAtTime(events: TraceEngine.Legacy.Event[]|null, time: number): void {
    if (!events) {
      return;
    }
    // Find best match, then backtrack to the first visible entry.
    for (let index = Platform.ArrayUtilities.upperBound(events, time, (time, event) => time - event.startTime) - 1;
         index >= 0; --index) {
      const event = events[index];
      const endTime = event.endTime || event.startTime;
      if (TraceEngine.Legacy.TracingModel.isTopLevelEvent(event) && endTime < time) {
        break;
      }
      if (this.performanceModel && this.performanceModel.isVisible(event) && endTime >= time) {
        this.select(TimelineSelection.fromTraceEvent(event));
        return;
      }
    }
    this.select(null);
  }

  highlightEvent(event: TraceEngine.Legacy.Event|null): void {
    this.flameChart.highlightEvent(event);
  }

  private revealTimeRange(startTime: number, endTime: number): void {
    if (!this.performanceModel) {
      return;
    }
    const window = this.performanceModel.window();
    let offset = 0;
    if (window.right < endTime) {
      offset = endTime - window.right;
    } else if (window.left > startTime) {
      offset = startTime - window.left;
    }
    this.performanceModel.setWindow({left: window.left + offset, right: window.right + offset}, /* animate */ true);

    TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
        TraceEngine.Helpers.Timing.traceWindowFromMilliSeconds(
            TraceEngine.Types.Timing.MilliSeconds(window.left + offset),
            TraceEngine.Types.Timing.MilliSeconds(window.right + offset),
            ),
        {
          shouldAnimate: true,
        },
    );
  }

  private handleDrop(dataTransfer: DataTransfer): void {
    const items = dataTransfer.items;
    if (!items.length) {
      return;
    }
    const item = items[0];
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceImported);
    if (item.kind === 'string') {
      const url = dataTransfer.getData('text/uri-list') as Platform.DevToolsPath.UrlString;
      if (new Common.ParsedURL.ParsedURL(url).isValid) {
        void this.loadFromURL(url);
      }
    } else if (item.kind === 'file') {
      const file = items[0].getAsFile();
      if (!file) {
        return;
      }
      void this.loadFromFile(file);
    }
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum State {
  Idle = 'Idle',
  StartPending = 'StartPending',
  Recording = 'Recording',
  StopPending = 'StopPending',
  Loading = 'Loading',
  RecordingFailed = 'RecordingFailed',
}

// Define row and header height, should be in sync with styles for timeline graphs.
export const rowHeight = 18;

export const headerHeight = 20;
export interface TimelineModeViewDelegate {
  select(selection: TimelineSelection|null): void;
  selectEntryAtTime(events: TraceEngine.Legacy.CompatibleTraceEvent[]|null, time: number): void;
  highlightEvent(event: TraceEngine.Legacy.CompatibleTraceEvent|null): void;
}

export class StatusPane extends UI.Widget.VBox {
  private status: HTMLElement;
  private time: Element|undefined;
  private progressLabel!: Element;
  private progressBar!: Element;
  private readonly description: HTMLElement|undefined;
  private button: HTMLButtonElement;
  private startTime!: number;
  private timeUpdateTimer?: number;

  constructor(
      options: {
        showTimer?: boolean,
        showProgress?: boolean,
        description?: string,
        buttonText?: string,
        buttonDisabled?: boolean,
      },
      buttonCallback: () => (Promise<void>| void)) {
    super(true);

    this.contentElement.classList.add('timeline-status-dialog');

    const statusLine = this.contentElement.createChild('div', 'status-dialog-line status');
    statusLine.createChild('div', 'label').textContent = i18nString(UIStrings.status);
    this.status = statusLine.createChild('div', 'content');
    UI.ARIAUtils.markAsStatus(this.status);

    if (options.showTimer) {
      const timeLine = this.contentElement.createChild('div', 'status-dialog-line time');
      timeLine.createChild('div', 'label').textContent = i18nString(UIStrings.time);
      this.time = timeLine.createChild('div', 'content');
    }

    if (options.showProgress) {
      const progressLine = this.contentElement.createChild('div', 'status-dialog-line progress');
      this.progressLabel = progressLine.createChild('div', 'label');
      this.progressBar = progressLine.createChild('div', 'indicator-container').createChild('div', 'indicator');
      UI.ARIAUtils.markAsProgressBar(this.progressBar);
    }

    if (typeof options.description === 'string') {
      const descriptionLine = this.contentElement.createChild('div', 'status-dialog-line description');
      descriptionLine.createChild('div', 'label').textContent = i18nString(UIStrings.description);
      this.description = descriptionLine.createChild('div', 'content');
      this.description.innerText = options.description;
    }

    const buttonText = options.buttonText || i18nString(UIStrings.stop);
    this.button = UI.UIUtils.createTextButton(buttonText, buttonCallback, '', true);
    // Profiling can't be stopped during initialization.
    this.button.disabled = !options.buttonDisabled === false;
    this.contentElement.createChild('div', 'stop-button').appendChild(this.button);
  }

  finish(): void {
    this.stopTimer();
    this.button.disabled = true;
  }

  remove(): void {
    (this.element.parentNode as HTMLElement).classList.remove('tinted');
    this.arrangeDialog((this.element.parentNode as HTMLElement));
    this.stopTimer();
    this.element.remove();
  }

  showPane(parent: Element): void {
    this.arrangeDialog(parent);
    this.show(parent);
    parent.classList.add('tinted');
  }

  enableAndFocusButton(): void {
    this.button.disabled = false;
    this.button.focus();
  }

  updateStatus(text: string): void {
    this.status.textContent = text;
  }

  updateProgressBar(activity: string, percent: number): void {
    this.progressLabel.textContent = activity;
    (this.progressBar as HTMLElement).style.width = percent.toFixed(1) + '%';
    UI.ARIAUtils.setValueNow(this.progressBar, percent);
    this.updateTimer();
  }

  startTimer(): void {
    this.startTime = Date.now();
    this.timeUpdateTimer = window.setInterval(this.updateTimer.bind(this, false), 1000);
    this.updateTimer();
  }

  private stopTimer(): void {
    if (!this.timeUpdateTimer) {
      return;
    }
    clearInterval(this.timeUpdateTimer);
    this.updateTimer(true);
    delete this.timeUpdateTimer;
  }

  private updateTimer(precise?: boolean): void {
    this.arrangeDialog((this.element.parentNode as HTMLElement));
    if (!this.timeUpdateTimer || !this.time) {
      return;
    }
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.time.textContent = i18nString(UIStrings.ssec, {PH1: elapsed.toFixed(precise ? 1 : 0)});
  }

  private arrangeDialog(parent: Element): void {
    const isSmallDialog = parent.clientWidth < 325;
    this.element.classList.toggle('small-dialog', isSmallDialog);
    this.contentElement.classList.toggle('small-dialog', isSmallDialog);
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([timelineStatusDialogStyles]);
  }
}

let loadTimelineHandlerInstance: LoadTimelineHandler;

export class LoadTimelineHandler implements Common.QueryParamHandler.QueryParamHandler {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): LoadTimelineHandler {
    const {forceNew} = opts;
    if (!loadTimelineHandlerInstance || forceNew) {
      loadTimelineHandlerInstance = new LoadTimelineHandler();
    }

    return loadTimelineHandlerInstance;
  }

  handleQueryParam(value: string): void {
    void UI.ViewManager.ViewManager.instance().showView('timeline').then(async () => {
      await TimelinePanel.instance().loadFromURL(window.decodeURIComponent(value) as Platform.DevToolsPath.UrlString);
    });
  }
}

let actionDelegateInstance: ActionDelegate;

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }

    return actionDelegateInstance;
  }

  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    const panel = (UI.Context.Context.instance().flavor(TimelinePanel) as TimelinePanel);
    console.assert(panel && panel instanceof TimelinePanel);
    switch (actionId) {
      case 'timeline.toggle-recording':
        void panel.toggleRecording();
        return true;
      case 'timeline.record-reload':
        panel.recordReload();
        return true;
      case 'timeline.save-to-file':
        void panel.saveToFile();
        return true;
      case 'timeline.load-from-file':
        panel.selectFileToLoad();
        return true;
      case 'timeline.jump-to-previous-frame':
        panel.jumpToFrame(-1);
        return true;
      case 'timeline.jump-to-next-frame':
        panel.jumpToFrame(1);
        return true;
      case 'timeline.show-history':
        void panel.showHistory();
        return true;
      case 'timeline.previous-recording':
        panel.navigateHistory(1);
        return true;
      case 'timeline.next-recording':
        panel.navigateHistory(-1);
        return true;
    }
    return false;
  }
}
