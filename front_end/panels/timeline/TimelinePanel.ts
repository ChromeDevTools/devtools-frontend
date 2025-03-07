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

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as CrUXManager from '../../models/crux-manager/crux-manager.js';
import * as Trace from '../../models/trace/trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as Adorners from '../../ui/components/adorners/adorners.js';
import type * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../ui/components/dialogs/dialogs.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';

import {ActiveFilters} from './ActiveFilters.js';
import * as AnnotationHelpers from './AnnotationHelpers.js';
import {TraceLoadEvent} from './BenchmarkEvents.js';
import * as TimelineComponents from './components/components.js';
import * as TimelineInsights from './components/insights/insights.js';
import {SHOULD_SHOW_EASTER_EGG} from './EasterEgg.js';
import {Tracker} from './FreshRecording.js';
import {IsolateSelector} from './IsolateSelector.js';
import {AnnotationModifiedEvent, ModificationsManager} from './ModificationsManager.js';
import * as Overlays from './overlays/overlays.js';
import {cpuprofileJsonGenerator, traceJsonGenerator} from './SaveFileFormatter.js';
import {type Client, TimelineController} from './TimelineController.js';
import {Tab} from './TimelineDetailsView.js';
import type {TimelineFlameChartDataProvider} from './TimelineFlameChartDataProvider.js';
import {Events as TimelineFlameChartViewEvents, TimelineFlameChartView} from './TimelineFlameChartView.js';
import {TimelineHistoryManager} from './TimelineHistoryManager.js';
import {TimelineLoader} from './TimelineLoader.js';
import {TimelineMiniMap} from './TimelineMiniMap.js';
import timelinePanelStyles from './timelinePanel.css.js';
import {
  rangeForSelection,
  selectionFromEvent,
  selectionIsRange,
  type TimelineSelection,
} from './TimelineSelection.js';
import timelineStatusDialogStyles from './timelineStatusDialog.css.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';
import {UIDevtoolsController} from './UIDevtoolsController.js';
import {UIDevtoolsUtils} from './UIDevtoolsUtils.js';
import * as Utils from './utils/utils.js';

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
   *@description Title of CSS selector stats setting in timeline panel of the performance panel
   */
  enableSelectorStats: 'Enable CSS selector stats (slow)',
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
   *@description A label for a button that fixes something.
   */
  fixMe: 'Fix me',
  /**
   *@description Tooltip text that appears when hovering over the largeicon load button
   */
  loadProfile: 'Load profile…',
  /**
   *@description Tooltip text that appears when hovering over the largeicon download button
   */
  saveProfile: 'Save profile…',
  /**
   *@description An option to save trace with annotations that appears in the menu of the toolbar download button. This is the expected default option, therefore it does not mention annotations.
   */
  saveTraceWithAnnotationsMenuOption: 'Save trace',
  /**
   *@description An option to save trace without annotations that appears in the menu of the toolbar download button
   */
  saveTraceWithoutAnnotationsMenuOption: 'Save trace without annotations',
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
  capturesSelectorStats: 'Captures CSS selector statistics',
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
  SignificantOverheadDueToPaint: '- Significant overhead due to paint instrumentation',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  SelectorStatsEnabled: '- Selector stats is enabled',
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
   *@description Text in Timeline Panel of the Performance panel
   */
  processed: 'Processed',
  /**
   *@description Text to close something
   */
  close: 'Close',
  /**
   *@description Text to download the trace file after an error
   */
  downloadAfterError: 'Download trace',
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
   *
   * @description Text for exporting basic traces
   */
  exportNormalTraces: 'Basic performance traces',
  /**
   *
   * @description Text for exporting enhanced traces
   */
  exportEnhancedTraces: 'Enhanced performance traces',
  /**
   *@description Tooltip description for a checkbox that toggles the visibility of data added by extensions of this panel (Performance).
   */
  showDataAddedByExtensions: 'Show data added by extensions of the Performance panel',
  /**
   Label for a checkbox that toggles the visibility of data added by extensions of this panel (Performance).
   */
  showCustomtracks: 'Show custom tracks',

  /**
   * @description Tooltip for the the sidebar toggle in the Performance panel. Command to open/show the sidebar.
   */
  showSidebar: 'Show sidebar',
  /**
   * @description Tooltip for the the sidebar toggle in the Performance panel. Command to close the sidebar.
   */
  hideSidebar: 'Hide sidebar',
  /**
   * @description Screen reader announcement when the sidebar is shown in the Performance panel.
   */
  sidebarShown: 'Performance sidebar shown',
  /**
   * @description Screen reader announcement when the sidebar is hidden in the Performance panel.
   */
  sidebarHidden: 'Performance sidebar hidden',
  /**
   * @description Screen reader announcement when the user clears their selection
   */
  selectionCleared: 'Selection cleared',
  /**
   * @description Screen reader announcement when the user selects a frame.
   */
  frameSelected: 'Frame selected',
  /**
   * @description Screen reader announcement when the user selects a trace event.
   * @example {Paint} PH1
   */
  eventSelected: 'Event {PH1} selected',
  /**
   *@description Text of a hyperlink to documentation.
   */
  learnMore: 'Learn more',
  /**
   * @description Tooltip text for a button that takes the user back to the default view which shows performance metrics that are live.
   */
  backToLiveMetrics: 'Go back to the live metrics page',
  /**
   * @description Description of the Timeline up/down scroll action that appears in the Performance panel shortcuts dialog.
   */
  timelineScrollUpDown: 'Move up/down',
  /**
   * @description Description of the Timeline left/right panning action that appears in the Performance panel shortcuts dialog.
   */
  timelinePanLeftRight: 'Move left/right',
  /**
   * @description Description of the Timeline in/out zoom action that appears in the Performance panel shortcuts dialog.
   */
  timelineZoomInOut: 'Zoom in/out',
  /**
   * @description Description of the Timeline fast in/out zoom action that appears in the Performance panel shortcuts dialog.
   */
  timelineFastZoomInOut: 'Fast zoom in/out',
  /**
   * @description Title for the Dim 3rd Parties checkbox.
   */
  dimThirdParties: 'Dim 3rd parties',
  /**
   * @description Description for the Dim 3rd Parties checkbox tooltip describing how 3rd parties are classified.
   */
  thirdPartiesByThirdPartyWeb: '3rd parties classified by third-party-web',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelinePanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let timelinePanelInstance: TimelinePanel|undefined;
let isNode: boolean;

/**
 * Represents the states that the timeline panel can be in.
 * If you need to change the panel's view, use the {@see #changeView} method.
 * Note that we do not represent the "Loading/Processing" view here. The
 * StatusPane is managed in the code that handles file import/recording, and
 * when it is visible it is rendered on top of the UI so obscures what is behind
 * it. When it completes, we will set the view mode to the trace that has been
 * loaded.
 */
type ViewMode = {
  mode: 'LANDING_PAGE',
}|{
  mode: 'VIEWING_TRACE',
  traceIndex: number,
}|{
  mode: 'STATUS_PANE_OVERLAY',
};

export class TimelinePanel extends UI.Panel.Panel implements Client, TimelineModeViewDelegate {
  private readonly dropTarget: UI.DropTarget.DropTarget;
  private readonly recordingOptionUIControls: UI.Toolbar.ToolbarItem[];
  private state: State;
  private recordingPageReload: boolean;
  private readonly millisecondsToRecordAfterLoadEvent: number;
  private readonly toggleRecordAction: UI.ActionRegistration.Action;
  private readonly recordReloadAction: UI.ActionRegistration.Action;
  readonly #historyManager: TimelineHistoryManager;
  private disableCaptureJSProfileSetting: Common.Settings.Setting<boolean>;
  private readonly captureLayersAndPicturesSetting: Common.Settings.Setting<boolean>;
  private readonly captureSelectorStatsSetting: Common.Settings.Setting<boolean>;
  readonly #thirdPartyTracksSetting: Common.Settings.Setting<boolean>;
  private showScreenshotsSetting: Common.Settings.Setting<boolean>;
  private showMemorySetting: Common.Settings.Setting<boolean>;
  private readonly panelToolbar: UI.Toolbar.Toolbar;
  private readonly panelRightToolbar: UI.Toolbar.Toolbar;
  private readonly timelinePane: UI.Widget.VBox;
  readonly #minimapComponent = new TimelineMiniMap();
  #viewMode: ViewMode = {mode: 'LANDING_PAGE'};
  readonly #dimThirdPartiesSetting: Common.Settings.Setting<boolean>|null = null;
  #thirdPartyCheckbox: UI.Toolbar.ToolbarSettingCheckbox|null = null;

  /**
   * We get given any filters for a new trace when it is recorded/imported.
   * Because the user can then use the dropdown to navigate to another trace,
   * we store the filters by the trace index, so if the user then navigates back
   * to a previous trace we can reinstate the filters from this map.
   */
  #exclusiveFilterPerTrace = new Map<number, Trace.Extras.TraceFilter.TraceFilter>();
  /**
   * This widget holds the timeline sidebar which shows Insights & Annotations,
   * and the main UI which shows the timeline
   */
  readonly #splitWidget = new UI.SplitWidget.SplitWidget(
      true,                            // isVertical
      false,                           // secondIsSidebar
      'timeline-panel-sidebar-state',  // settingName (to persist the open/closed state for the user)
      TimelineComponents.Sidebar.DEFAULT_SIDEBAR_WIDTH_PX,
  );
  private readonly statusPaneContainer: HTMLElement;
  private readonly flameChart: TimelineFlameChartView;
  private readonly searchableViewInternal: UI.SearchableView.SearchableView;
  private showSettingsPaneButton!: UI.Toolbar.ToolbarSettingToggle;
  private showSettingsPaneSetting!: Common.Settings.Setting<boolean>;
  private settingsPane?: HTMLElement;
  private controller!: TimelineController|null;
  private cpuProfiler!: SDK.CPUProfilerModel.CPUProfilerModel|null;
  private clearButton!: UI.Toolbar.ToolbarButton;
  private brickBreakerToolbarButton: UI.Toolbar.ToolbarButton;
  private brickBreakerToolbarButtonAdded = false;
  private loadButton!: UI.Toolbar.ToolbarButton;
  private saveButton!: UI.Toolbar.ToolbarButton|UI.Toolbar.ToolbarMenuButton;
  private homeButton?: UI.Toolbar.ToolbarButton;
  private statusPane!: StatusPane|null;
  private landingPage!: UI.Widget.Widget;
  private loader?: TimelineLoader;
  private showScreenshotsToolbarCheckbox?: UI.Toolbar.ToolbarItem;
  private showMemoryToolbarCheckbox?: UI.Toolbar.ToolbarItem;
  private networkThrottlingSelect?: MobileThrottling.ThrottlingManager.NetworkThrottlingSelectorWrapper;
  private cpuThrottlingSelect?: MobileThrottling.ThrottlingManager.CPUThrottlingSelectorWrapper;
  private fileSelectorElement?: HTMLInputElement;
  private selection: TimelineSelection|null = null;
  private traceLoadStart!: Trace.Types.Timing.Milli|null;
  private primaryPageTargetPromiseCallback = (_target: SDK.Target.Target): void => {};
  // Note: this is technically unused, but we need it to define the promiseCallback function above.
  private primaryPageTargetPromise = new Promise<SDK.Target.Target>(res => {
    this.primaryPageTargetPromiseCallback = res;
  });

  #traceEngineModel: Trace.TraceModel.Model;
  #sourceMapsResolver: Utils.SourceMapsResolver.SourceMapsResolver|null = null;
  #entityMapper: Utils.EntityMapper.EntityMapper|null = null;
  #onSourceMapsNodeNamesResolvedBound = this.#onSourceMapsNodeNamesResolved.bind(this);
  readonly #onChartPlayableStateChangeBound: (event: Common.EventTarget.EventTargetEvent<boolean>) => void;
  #sidebarToggleButton = this.#splitWidget.createShowHideSidebarButton(
      i18nString(UIStrings.showSidebar),
      i18nString(UIStrings.hideSidebar),
      // These are used to announce to screen-readers and not shown visibly.
      i18nString(UIStrings.sidebarShown),
      i18nString(UIStrings.sidebarHidden),
      'timeline.sidebar',  // jslog context
  );

  #sideBar = new TimelineComponents.Sidebar.SidebarWidget();
  /**
   * Rather than auto-pop the sidebar every time the user records a trace,
   * which could get annoying, we instead persist the state of the sidebar
   * visibility to a setting so it's restored across sessions.
   * However, sometimes we have to automatically hide the sidebar, like when a
   * trace recording is happening, or the user is on the landing page. In those
   * times, we toggle this flag to true. Then, when we enter the VIEWING_TRACE
   * mode, we check this flag and pop the sidebar open if it's set to true.
   * Longer term a better fix here would be to divide the 3 UI screens
   * (status pane, landing page, trace view) into distinct components /
   * widgets, to avoid this complexity.
   */
  #restoreSidebarVisibilityOnTraceLoad = false;

  /**
   * Used to track an aria announcement that we need to alert for
   * screen-readers. We track these because we debounce announcements to not
   * overwhelm.
   */
  #pendingAriaMessage: string|null = null;

  #eventToRelatedInsights: TimelineComponents.RelatedInsightChips.EventToRelatedInsightsMap = new Map();
  #shortcutsDialog: Dialogs.ShortcutDialog.ShortcutDialog = new Dialogs.ShortcutDialog.ShortcutDialog();
  /**
   * Track if the user has opened the shortcuts dialog before. We do this so that the
   * very first time the performance panel is open after the shortcuts dialog ships, we can
   * automatically pop it open to aid discovery.
   */
  #userHadShortcutsDialogOpenedOnce = Common.Settings.Settings.instance().createSetting<boolean>(
      'timeline.user-had-shortcuts-dialog-opened-once', false);
  /**
   * Navigation radio buttons located in the shortcuts dialog.
   */
  #navigationRadioButtons = document.createElement('form');
  #modernNavRadioButton =
      UI.UIUtils.createRadioButton('flamechart-selected-navigation', 'Modern', 'timeline.select-modern-navigation');
  #classicNavRadioButton =
      UI.UIUtils.createRadioButton('flamechart-selected-navigation', 'Classic', 'timeline.select-classic-navigation');

  #onMainEntryHovered: (event: Common.EventTarget.EventTargetEvent<number>) => void;

  constructor(traceModel?: Trace.TraceModel.Model) {
    super('timeline');
    this.registerRequiredCSS(timelinePanelStyles);
    const adornerContent = document.createElement('span');
    adornerContent.innerHTML = `<div style="
      font-size: 12px;
      transform: scale(1.25);
      color: transparent;
      background: linear-gradient(90deg,CLICK255 0 0 / 100%) 0%, rgb(255 154 0 / 100%) 10%, rgb(208 222 33 / 100%) 20%, rgb(79 220 74 / 100%) 30%, rgb(63 218 216 / 100%) 40%, rgb(47 201 226 / 100%) 50%, rgb(28 127 238 / 100%) 60%, rgb(95 21 242 / 100%) 70%, rgb(186 12 248 / 100%) 80%, rgb(251 7 217 / 100%) 90%, rgb(255 0 0 / 100%) 100%);
      -webkit-background-clip: text;
      ">💫</div>`;
    const adorner = new Adorners.Adorner.Adorner();
    adorner.classList.add('fix-perf-icon');
    adorner.data = {
      name: i18nString(UIStrings.fixMe),
      content: adornerContent,
    };
    this.brickBreakerToolbarButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.fixMe), adorner);
    this.brickBreakerToolbarButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.CLICK, () => this.#onBrickBreakerEasterEggClick());

    this.#traceEngineModel = traceModel || this.#instantiateNewModel();
    this.#listenForProcessingProgress();

    this.element.addEventListener('contextmenu', this.contextMenu.bind(this), false);
    this.dropTarget = new UI.DropTarget.DropTarget(
        this.element, [UI.DropTarget.Type.File, UI.DropTarget.Type.URI],
        i18nString(UIStrings.dropTimelineFileOrUrlHere), this.handleDrop.bind(this));

    this.recordingOptionUIControls = [];
    this.state = State.IDLE;
    this.recordingPageReload = false;
    this.millisecondsToRecordAfterLoadEvent = 5000;
    this.toggleRecordAction = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.toggle-recording');
    this.recordReloadAction = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.record-reload');

    this.#historyManager = new TimelineHistoryManager(this.#minimapComponent, isNode);

    this.traceLoadStart = null;

    this.disableCaptureJSProfileSetting = Common.Settings.Settings.instance().createSetting(
        'timeline-disable-js-sampling', false, Common.Settings.SettingStorageType.SESSION);
    this.disableCaptureJSProfileSetting.setTitle(i18nString(UIStrings.disableJavascriptSamples));
    this.captureLayersAndPicturesSetting = Common.Settings.Settings.instance().createSetting(
        'timeline-capture-layers-and-pictures', false, Common.Settings.SettingStorageType.SESSION);
    this.captureLayersAndPicturesSetting.setTitle(i18nString(UIStrings.enableAdvancedPaint));
    this.captureSelectorStatsSetting = Common.Settings.Settings.instance().createSetting(
        'timeline-capture-selector-stats', false, Common.Settings.SettingStorageType.SESSION);
    this.captureSelectorStatsSetting.setTitle(i18nString(UIStrings.enableSelectorStats));

    this.showScreenshotsSetting =
        Common.Settings.Settings.instance().createSetting('timeline-show-screenshots', isNode ? false : true);
    this.showScreenshotsSetting.setTitle(i18nString(UIStrings.screenshots));
    this.showScreenshotsSetting.addChangeListener(this.updateMiniMap, this);

    this.showMemorySetting = Common.Settings.Settings.instance().createSetting(
        'timeline-show-memory', false, Common.Settings.SettingStorageType.SESSION);
    this.showMemorySetting.setTitle(i18nString(UIStrings.memory));
    this.showMemorySetting.addChangeListener(this.onMemoryModeChanged, this);

    this.#dimThirdPartiesSetting = Common.Settings.Settings.instance().createSetting(
        'timeline-dim-third-parties', false, Common.Settings.SettingStorageType.SESSION);
    this.#dimThirdPartiesSetting.setTitle(i18nString(UIStrings.dimThirdParties));
    this.#dimThirdPartiesSetting.addChangeListener(this.onDimThirdPartiesChanged, this);

    this.#thirdPartyTracksSetting = TimelinePanel.extensionDataVisibilitySetting();
    this.#thirdPartyTracksSetting.addChangeListener(this.#extensionDataVisibilityChanged, this);
    this.#thirdPartyTracksSetting.setTitle(i18nString(UIStrings.showCustomtracks));

    const timelineToolbarContainer = this.element.createChild('div', 'timeline-toolbar-container');
    timelineToolbarContainer.setAttribute('jslog', `${VisualLogging.toolbar()}`);
    timelineToolbarContainer.role = 'toolbar';
    this.panelToolbar = timelineToolbarContainer.createChild('devtools-toolbar', 'timeline-main-toolbar');
    this.panelToolbar.role = 'presentation';
    this.panelToolbar.wrappable = true;
    this.panelRightToolbar = timelineToolbarContainer.createChild('devtools-toolbar');
    this.panelRightToolbar.role = 'presentation';
    if (!isNode) {
      this.createSettingsPane();
      this.updateShowSettingsToolbarButton();
    }
    this.timelinePane = new UI.Widget.VBox();
    const topPaneElement = this.timelinePane.element.createChild('div', 'hbox');
    topPaneElement.id = 'timeline-overview-panel';

    this.#minimapComponent.show(topPaneElement);
    this.#minimapComponent.addEventListener(PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_MOVE, event => {
      this.flameChart.addTimestampMarkerOverlay(event.data.timeInMicroSeconds);
    });
    this.#minimapComponent.addEventListener(PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_LEAVE, async () => {
      await this.flameChart.removeTimestampMarkerOverlay();
    });

    this.statusPaneContainer = this.timelinePane.element.createChild('div', 'status-pane-container fill');

    this.createFileSelector();

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this.loadEventFired, this);

    this.flameChart = new TimelineFlameChartView(this);
    this.#onChartPlayableStateChangeBound = this.#onChartPlayableStateChange.bind(this);
    this.element.addEventListener(
        'toggle-popover', event => this.flameChart.togglePopover((event as CustomEvent).detail));

    this.flameChart.getMainFlameChart().addEventListener(
        PerfUI.FlameChart.Events.CHART_PLAYABLE_STATE_CHANGED, this.#onChartPlayableStateChangeBound, this);

    this.#onMainEntryHovered = this.#onEntryHovered.bind(this, this.flameChart.getMainDataProvider());
    this.flameChart.getMainFlameChart().addEventListener(
        PerfUI.FlameChart.Events.ENTRY_HOVERED, this.#onMainEntryHovered);

    this.flameChart.addEventListener(TimelineFlameChartViewEvents.ENTRY_LABEL_ANNOTATION_CLICKED, event => {
      const selection = selectionFromEvent(event.data.entry);
      this.select(selection);
    });

    this.searchableViewInternal = new UI.SearchableView.SearchableView(this.flameChart, null);
    this.searchableViewInternal.setMinimumSize(0, 100);
    this.searchableViewInternal.setMinimalSearchQuerySize(2);  // At 1 it can introduce a bit of jank.
    this.searchableViewInternal.element.classList.add('searchable-view');
    this.searchableViewInternal.show(this.timelinePane.element);
    this.flameChart.show(this.searchableViewInternal.element);
    this.flameChart.setSearchableView(this.searchableViewInternal);
    this.searchableViewInternal.hideWidget();

    this.#splitWidget.setMainWidget(this.timelinePane);
    this.#splitWidget.setSidebarWidget(this.#sideBar);
    this.#splitWidget.enableShowModeSaving();
    this.#splitWidget.show(this.element);

    this.flameChart.overlays().addEventListener(Overlays.Overlays.TimeRangeMouseOverEvent.eventName, event => {
      const {overlay} = event as Overlays.Overlays.TimeRangeMouseOverEvent;
      const overlayBounds = Overlays.Overlays.traceWindowContainingOverlays([overlay]);
      if (!overlayBounds) {
        return;
      }
      this.#minimapComponent.highlightBounds(overlayBounds, /* withBracket */ false);
    });

    this.flameChart.overlays().addEventListener(Overlays.Overlays.TimeRangeMouseOutEvent.eventName, () => {
      this.#minimapComponent.clearBoundsHighlight();
    });

    this.#sideBar.element.addEventListener(TimelineInsights.SidebarInsight.InsightDeactivated.eventName, () => {
      this.#setActiveInsight(null);
    });

    this.#sideBar.element.addEventListener(TimelineInsights.SidebarInsight.InsightActivated.eventName, event => {
      const {model, insightSetKey} = event;
      this.#setActiveInsight({model, insightSetKey});

      // Open the summary panel for the 3p insight.
      if (model.insightKey === Trace.Insights.Types.InsightKeys.THIRD_PARTIES) {
        this.#openSummaryTab();
      }
    });

    this.#sideBar.element.addEventListener(TimelineInsights.SidebarInsight.InsightProvideOverlays.eventName, event => {
      const {overlays, options} = event;

      this.flameChart.setOverlays(overlays, options);

      const overlaysBounds = Overlays.Overlays.traceWindowContainingOverlays(overlays);
      if (overlaysBounds) {
        this.#minimapComponent.highlightBounds(overlaysBounds, /* withBracket */ true);
      } else {
        this.#minimapComponent.clearBoundsHighlight();
      }
    });

    this.#sideBar.contentElement.addEventListener(TimelineInsights.EventRef.EventReferenceClick.eventName, event => {
      this.select(selectionFromEvent(event.event));
    });

    this.#sideBar.element.addEventListener(TimelineComponents.Sidebar.RemoveAnnotation.eventName, event => {
      const {removedAnnotation} = (event as TimelineComponents.Sidebar.RemoveAnnotation);
      ModificationsManager.activeManager()?.removeAnnotation(removedAnnotation);
    });

    this.#sideBar.element.addEventListener(TimelineComponents.Sidebar.RevealAnnotation.eventName, event => {
      this.flameChart.revealAnnotation(event.annotation);
    });

    this.#sideBar.element.addEventListener(TimelineInsights.SidebarInsight.InsightSetHovered.eventName, event => {
      if (event.bounds) {
        this.#minimapComponent.highlightBounds(event.bounds, /* withBracket */ true);
      } else {
        this.#minimapComponent.clearBoundsHighlight();
      }
    });

    this.#sideBar.element.addEventListener(TimelineInsights.SidebarInsight.InsightSetZoom.eventName, event => {
      TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
          event.bounds, {ignoreMiniMapBounds: true, shouldAnimate: true});
    });

    this.onMemoryModeChanged();
    this.populateToolbar();
    // The viewMode is set by default to the landing page, so we don't call
    // `#changeView` here and can instead directly call showLandingPage();
    this.#showLandingPage();
    this.updateTimelineControls();

    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.SUSPEND_STATE_CHANGED, this.onSuspendStateChanged, this);
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
                SDK.CPUProfilerModel.Events.CONSOLE_PROFILE_FINISHED, event => this.consoleProfileFinished(event.data));
          },
          modelRemoved: (_model: SDK.CPUProfilerModel.CPUProfilerModel) => {

          },
        },
    );
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

  #setActiveInsight(insight: TimelineComponents.Sidebar.ActiveInsight|null): void {
    // When an insight is selected, ensure that the 3P checkbox is disabled
    // to avoid dimming interference.
    if (insight) {
      this.#splitWidget.showBoth();
    }
    this.#sideBar.setActiveInsight(insight);
    this.flameChart.setActiveInsight(insight);

    if (insight) {
      const selectedInsight = new SelectedInsight(insight);
      UI.Context.Context.instance().setFlavor(SelectedInsight, selectedInsight);
    } else {
      UI.Context.Context.instance().setFlavor(SelectedInsight, null);
    }
  }

  /**
   * This "disables" the 3P checkbox in the toolbar.
   * Disabling here does a couple of things:
   * 1) makes the checkbox dimmed and unclickable
   * 2) gives the checkbox UI an indeterminate state
   */
  set3PCheckboxDisabled(disabled: boolean): void {
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_DIM_UNRELATED_EVENTS)) {
      this.#thirdPartyCheckbox?.applyEnabledState(!disabled);
      this.#thirdPartyCheckbox?.setIndeterminate(disabled);
    }
  }

  static instance(opts: {
    forceNew: boolean|null,
    isNode: boolean,
    traceModel?: Trace.TraceModel.Model,
  }|undefined = {forceNew: null, isNode: false}): TimelinePanel {
    const {forceNew, isNode: isNodeMode} = opts;
    isNode = isNodeMode;

    if (!timelinePanelInstance || forceNew) {
      timelinePanelInstance = new TimelinePanel(opts.traceModel);
    }

    return timelinePanelInstance;
  }
  static removeInstance(): void {
    // TODO(crbug.com/358583420): Simplify attached data management
    // so that we don't have to maintain all of these singletons.
    Utils.SourceMapsResolver.SourceMapsResolver.clearResolvedNodeNames();
    Trace.Helpers.SyntheticEvents.SyntheticEventsManager.reset();
    TraceBounds.TraceBounds.BoundsManager.removeInstance();
    ModificationsManager.reset();
    ActiveFilters.removeInstance();
    timelinePanelInstance = undefined;
  }

  #instantiateNewModel(): Trace.TraceModel.Model {
    const config = Trace.Types.Configuration.defaults();
    config.showAllEvents = Root.Runtime.experiments.isEnabled('timeline-show-all-events');
    config.includeRuntimeCallStats = Root.Runtime.experiments.isEnabled('timeline-v8-runtime-call-stats');
    config.debugMode = Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_DEBUG_MODE);

    return Trace.TraceModel.Model.createWithAllHandlers(config);
  }

  static extensionDataVisibilitySetting(): Common.Settings.Setting<boolean> {
    // Calling this multiple times doesn't recreate the setting.
    // Instead, after the second call, the cached setting is returned.
    return Common.Settings.Settings.instance().createSetting('timeline-show-extension-data', true);
  }
  override searchableView(): UI.SearchableView.SearchableView|null {
    return this.searchableViewInternal;
  }

  override wasShown(): void {
    super.wasShown();
    UI.Context.Context.instance().setFlavor(TimelinePanel, this);
    // Record the performance tool load time.
    Host.userMetrics.panelLoaded('timeline', 'DevTools.Launch.Timeline');

    const cruxManager = CrUXManager.CrUXManager.instance();
    cruxManager.addEventListener(CrUXManager.Events.FIELD_DATA_CHANGED, this.#onFieldDataChanged, this);
    this.#onFieldDataChanged();
  }

  override willHide(): void {
    UI.Context.Context.instance().setFlavor(TimelinePanel, null);
    this.#historyManager.cancelIfShowing();

    const cruxManager = CrUXManager.CrUXManager.instance();
    cruxManager.removeEventListener(CrUXManager.Events.FIELD_DATA_CHANGED, this.#onFieldDataChanged, this);
  }

  #onFieldDataChanged(): void {
    const recs = Utils.Helpers.getThrottlingRecommendations();
    this.cpuThrottlingSelect?.updateRecommendedOption(recs.cpuOption);
    this.networkThrottlingSelect?.updateRecommendedConditions(recs.networkConditions);
  }

  loadFromEvents(events: Trace.Types.Events.Event[]): void {
    if (this.state !== State.IDLE) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = TimelineLoader.loadFromEvents(events, this);
  }

  getFlameChart(): TimelineFlameChartView {
    return this.flameChart;
  }

  getMinimap(): TimelineMiniMap {
    return this.#minimapComponent;
  }

  /**
   * Determine if two view modes are equivalent. Useful because if {@see
   * #changeView} gets called and the new mode is identical to the current,
   * we can bail without doing any UI updates.
   */
  #viewModesEquivalent(m1: ViewMode, m2: ViewMode): boolean {
    if (m1.mode === 'LANDING_PAGE' && m2.mode === 'LANDING_PAGE') {
      return true;
    }

    if (m1.mode === 'STATUS_PANE_OVERLAY' && m2.mode === 'STATUS_PANE_OVERLAY') {
      return true;
    }

    // VIEWING_TRACE views are only equivalent if their traceIndex is the same.
    if (m1.mode === 'VIEWING_TRACE' && m2.mode === 'VIEWING_TRACE' && m1.traceIndex === m2.traceIndex) {
      return true;
    }
    return false;
  }

  #uninstallSourceMapsResolver(): void {
    if (this.#sourceMapsResolver) {
      // this set of NodeNames is cached by PIDs, so we clear it so we don't
      // use incorrect names from another trace that might happen to share
      // PID/TIDs.
      Utils.SourceMapsResolver.SourceMapsResolver.clearResolvedNodeNames();

      this.#sourceMapsResolver.removeEventListener(
          Utils.SourceMapsResolver.SourceMappingsUpdated.eventName, this.#onSourceMapsNodeNamesResolvedBound);
      this.#sourceMapsResolver.uninstall();
      this.#sourceMapsResolver = null;
    }
  }

  #removeStatusPane(): void {
    if (this.statusPane) {
      this.statusPane.remove();
    }
    this.statusPane = null;
  }

  #changeView(newMode: ViewMode): void {
    if (this.#viewModesEquivalent(this.#viewMode, newMode)) {
      return;
    }

    if (this.#viewMode.mode === 'VIEWING_TRACE') {
      // If the current / about to be "old" view was viewing a trace
      // we also uninstall any source maps resolver for the trace that was active.
      // If the user swaps back to this trace via the history dropdown, this will be reinstated.
      this.#uninstallSourceMapsResolver();

      // Store any modifications (e.g. annotations) that the user has created
      // on the current trace before we move away to a new view.
      this.#saveModificationsForActiveTrace();
    }

    this.#viewMode = newMode;
    this.updateTimelineControls();

    /**
     * Note that the TimelinePanel UI is really rendered in two distinct layers.
     * 1. status-pane-container: this is what renders both the StatusPane
     *    loading modal AND the landing page.
     *    What is important to note is that this renders ON TOP of the
     *    SearchableView widget, which is what holds the FlameChartView.
     *
     * 2. SearchableView: this is the container that renders
     *    TimelineFlameChartView and the rest of the flame chart code.
     *
     * What this layering means is that when we swap to the LANDING_PAGE or
     * STATUS_PANE_OVERLAY view, we don't actually need to reset the
     * SearchableView that is rendered behind it, because it won't be visible
     * and will be hidden behind the StatusPane/Landing Page.
     *
     * So the only time we update this SearchableView is when the user goes to
     * view a trace. That is why in the switch() statement below you won't see
     * any code that resets the SearchableView because we don't need to. We do
     * mark it as hidden, but mainly so the user can't accidentally use Cmd-F
     * to search a hidden view.
     */
    switch (newMode.mode) {
      case 'LANDING_PAGE': {
        this.#removeStatusPane();
        this.#showLandingPage();

        // Whilst we don't reset this, we hide it, mainly so the user cannot
        // hit Ctrl/Cmd-F and try to search when it isn't visible.
        this.searchableViewInternal.hideWidget();

        // Hide the brick-breaker easter egg
        this.brickBreakerToolbarButtonAdded = false;
        this.panelToolbar.removeToolbarItem(this.brickBreakerToolbarButton);
        return;
      }

      case 'VIEWING_TRACE': {
        this.#hideLandingPage();
        this.#setModelForActiveTrace();
        this.#removeStatusPane();
        this.#showSidebarIfRequired();
        this.flameChart.dimThirdPartiesIfRequired();
        return;
      }

      case 'STATUS_PANE_OVERLAY': {
        // We don't manage the StatusPane UI here; it is done in the
        // recordingStarted/recordingProgress callbacks, but we do make sure we
        // hide the landing page.
        this.#hideLandingPage();

        // We also hide the sidebar - else if the user is viewing a trace and
        // then load/record another, the sidebar remains visible.
        this.#hideSidebar();
        return;
      }
      default:
        Platform.assertNever(newMode, 'Unsupported TimelinePanel viewMode');
    }
  }

  #activeTraceIndex(): number|null {
    if (this.#viewMode.mode === 'VIEWING_TRACE') {
      return this.#viewMode.traceIndex;
    }
    return null;
  }

  /**
   * NOTE: this method only exists to enable some layout tests to be migrated to the new engine.
   * DO NOT use this method within DevTools. It is marked as deprecated so
   * within DevTools you are warned when using the method.
   * @deprecated
   **/
  getParsedTraceForLayoutTests(): Trace.Handlers.Types.ParsedTrace {
    const traceIndex = this.#activeTraceIndex();
    if (traceIndex === null) {
      throw new Error('No trace index active.');
    }
    const data = this.#traceEngineModel.parsedTrace(traceIndex);
    if (data === null) {
      throw new Error('No trace engine data found.');
    }
    return data;
  }

  /**
   * NOTE: this method only exists to enable some layout tests to be migrated to the new engine.
   * DO NOT use this method within DevTools. It is marked as deprecated so
   * within DevTools you are warned when using the method.
   * @deprecated
   **/
  getTraceEngineRawTraceEventsForLayoutTests(): readonly Trace.Types.Events.Event[] {
    const traceIndex = this.#activeTraceIndex();
    if (traceIndex === null) {
      throw new Error('No trace index active.');
    }
    const data = this.#traceEngineModel.rawTraceEvents(traceIndex);
    if (data === null) {
      throw new Error('No trace engine data found.');
    }
    return data;
  }

  #onChartPlayableStateChange(event: Common.EventTarget.EventTargetEvent<boolean, unknown>): void {
    if (event.data) {
      const dateObj = new Date();
      const month = dateObj.getUTCMonth() + 1;
      const day = dateObj.getUTCDate();
      const isAprilFools = (month === 4 && (day === 1 || day === 2));  // Show only on April fools and the next day
      if (isAprilFools && !this.brickBreakerToolbarButtonAdded && SHOULD_SHOW_EASTER_EGG) {
        this.brickBreakerToolbarButtonAdded = true;
        this.panelToolbar.appendToolbarItem(this.brickBreakerToolbarButton);
      }
    } else {
      this.brickBreakerToolbarButtonAdded = false;
      this.panelToolbar.removeToolbarItem(this.brickBreakerToolbarButton);
    }
  }

  #onEntryHovered(dataProvider: TimelineFlameChartDataProvider, event: Common.EventTarget.EventTargetEvent<number>):
      void {
    const entryIndex = event.data;
    if (entryIndex === -1) {
      this.#minimapComponent.clearBoundsHighlight();
      return;
    }
    const traceEvent = dataProvider.eventByIndex(entryIndex);
    if (!traceEvent) {
      return;
    }
    const bounds = Trace.Helpers.Timing.traceWindowFromEvent(traceEvent);
    this.#minimapComponent.highlightBounds(bounds, /* withBracket */ false);
  }

  private loadFromCpuProfile(profile: Protocol.Profiler.Profile|null): void {
    if (this.state !== State.IDLE || profile === null) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = TimelineLoader.loadFromCpuProfile(profile, this);
  }

  private setState(state: State): void {
    this.state = state;
    this.updateTimelineControls();
  }

  private createSettingCheckbox(setting: Common.Settings.Setting<boolean>, tooltip: Platform.UIString.LocalizedString):
      UI.Toolbar.ToolbarSettingCheckbox {
    const checkboxItem = new UI.Toolbar.ToolbarSettingCheckbox(setting, tooltip);
    this.recordingOptionUIControls.push(checkboxItem);
    return checkboxItem;
  }

  #addSidebarIconToToolbar(): void {
    if (this.panelToolbar.hasItem(this.#sidebarToggleButton)) {
      return;
    }

    this.panelToolbar.prependToolbarItem(this.#sidebarToggleButton);
  }

  /**
   * Used when the user deletes their last trace and is taken back to the
   * landing page - we don't add this icon until there is a trace loaded.
   */
  #removeSidebarIconFromToolbar(): void {
    this.panelToolbar.removeToolbarItem(this.#sidebarToggleButton);
  }

  #populateDownloadMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    contextMenu.viewSection().appendItem(i18nString(UIStrings.saveTraceWithAnnotationsMenuOption), () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceExported);
      void this.saveToFile(/* isEnhancedTrace */ false, /* addModifications */ true);
    }, {
      jslogContext: 'timeline.save-to-file-with-annotations',
    });
    contextMenu.viewSection().appendItem(i18nString(UIStrings.saveTraceWithoutAnnotationsMenuOption), () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceExported);
      void this.saveToFile();
    }, {
      jslogContext: 'timeline.save-to-file-without-annotations',
    });
  }

  private populateToolbar(): void {
    // Record
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.toggleRecordAction));
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.recordReloadAction));
    this.clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clear), 'clear', undefined, 'timeline.clear');
    this.clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => this.onClearButton());
    this.panelToolbar.appendToolbarItem(this.clearButton);

    // Load / SaveCLICK
    this.loadButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.loadProfile), 'import', undefined, 'timeline.load-from-file');
    this.loadButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceImported);
      this.selectFileToLoad();
    });

    this.saveButton = new UI.Toolbar.ToolbarMenuButton(
        this.#populateDownloadMenu.bind(this), true, true, 'timeline.save-to-file-more-options', 'download');
    this.saveButton.setTitle(i18nString(UIStrings.saveProfile));

    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_ENHANCED_TRACES)) {
      this.saveButton.element.addEventListener('contextmenu', event => {
        event.preventDefault();
        event.stopPropagation();

        if (event.ctrlKey || event.button === 2) {
          const contextMenu = new UI.ContextMenu.ContextMenu(event);
          contextMenu.saveSection().appendItem(i18nString(UIStrings.exportNormalTraces), () => {
            void this.saveToFile();
          });
          contextMenu.saveSection().appendItem(i18nString(UIStrings.exportEnhancedTraces), () => {
            void this.saveToFile(/* isEnhancedTrace */ true);
          });

          void contextMenu.show();
        } else {
          void this.saveToFile();
        }
      });
    }

    this.panelToolbar.appendSeparator();
    this.panelToolbar.appendToolbarItem(this.loadButton);
    this.panelToolbar.appendToolbarItem(this.saveButton);

    // History
    this.panelToolbar.appendSeparator();

    if (!isNode) {
      this.homeButton = new UI.Toolbar.ToolbarButton(
          i18nString(UIStrings.backToLiveMetrics), 'home', undefined, 'timeline.back-to-live-metrics');
      this.homeButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
        this.#changeView({mode: 'LANDING_PAGE'});
        this.#historyManager.navigateToLandingPage();
      });
      this.panelToolbar.appendToolbarItem(this.homeButton);
      this.panelToolbar.appendSeparator();
    }

    this.panelToolbar.appendToolbarItem(this.#historyManager.button());
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
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton('components.collect-garbage'));

    // Ignore list setting
    this.panelToolbar.appendSeparator();
    const showIgnoreListSetting = new TimelineComponents.IgnoreListSetting.IgnoreListSetting();
    this.panelToolbar.appendToolbarItem(new UI.Toolbar.ToolbarItem(showIgnoreListSetting));

    if (this.#dimThirdPartiesSetting) {
      const dimThirdPartiesCheckbox =
          this.createSettingCheckbox(this.#dimThirdPartiesSetting, i18nString(UIStrings.thirdPartiesByThirdPartyWeb));
      this.#thirdPartyCheckbox = dimThirdPartiesCheckbox;
      this.panelToolbar.appendToolbarItem(dimThirdPartiesCheckbox);
    }

    // Isolate selector
    if (isNode) {
      const isolateSelector = new IsolateSelector();
      this.panelToolbar.appendSeparator();
      this.panelToolbar.appendToolbarItem(isolateSelector);
    }

    // Settings
    if (!isNode) {
      this.panelRightToolbar.appendSeparator();
      this.panelRightToolbar.appendToolbarItem(this.showSettingsPaneButton);
    }
  }

  #setupNavigationSetting(): HTMLElement {
    const currentNavSetting = Common.Settings.moduleSetting('flamechart-selected-navigation').get();
    const hideTheDialogForTests: string|null = localStorage.getItem('hide-shortcuts-dialog-for-test');
    const userHadShortcutsDialogOpenedOnce = this.#userHadShortcutsDialogOpenedOnce.get();

    this.#shortcutsDialog.prependElement(this.#navigationRadioButtons);
    // Add the shortcuts dialog button to the toolbar.
    const dialogToolbarItem = new UI.Toolbar.ToolbarItem(this.#shortcutsDialog);
    dialogToolbarItem.element.setAttribute(
        'jslog', `${VisualLogging.action().track({click: true}).context('timeline.shortcuts-dialog-toggle')}`);

    this.panelRightToolbar.appendToolbarItem(dialogToolbarItem);
    this.#updateNavigationSettingSelection();
    // The setting could have been changed from the Devtools Settings. Therefore, we
    // need to update the radio buttons selection when the dialog is open.
    this.#shortcutsDialog.addEventListener('click', this.#updateNavigationSettingSelection.bind(this));
    this.#shortcutsDialog.data = {
      shortcuts: this.#getShortcutsInfo(currentNavSetting === 'classic'),
      open: !userHadShortcutsDialogOpenedOnce && hideTheDialogForTests !== 'true' &&
          !Host.InspectorFrontendHost.isUnderTest(),
    };

    this.#navigationRadioButtons.classList.add('nav-radio-buttons');
    UI.ARIAUtils.markAsRadioGroup(this.#navigationRadioButtons);
    // Change EventListener is only triggered when the radio button is selected
    this.#modernNavRadioButton.radio.addEventListener('change', () => {
      this.#shortcutsDialog.data = {shortcuts: this.#getShortcutsInfo(/* isNavClassic */ false)};
      Common.Settings.moduleSetting('flamechart-selected-navigation').set('modern');
    });
    this.#classicNavRadioButton.radio.addEventListener('change', () => {
      this.#shortcutsDialog.data = {shortcuts: this.#getShortcutsInfo(/* isNavClassic */ true)};
      Common.Settings.moduleSetting('flamechart-selected-navigation').set('classic');
    });

    this.#navigationRadioButtons.appendChild(this.#modernNavRadioButton.label);
    this.#navigationRadioButtons.appendChild(this.#classicNavRadioButton.label);

    this.#userHadShortcutsDialogOpenedOnce.set(true);
    return this.#navigationRadioButtons;
  }

  #updateNavigationSettingSelection(): void {
    const currentNavSetting = Common.Settings.moduleSetting('flamechart-selected-navigation').get();
    if (currentNavSetting === 'classic') {
      this.#classicNavRadioButton.radio.checked = true;
      Host.userMetrics.navigationSettingAtFirstTimelineLoad(
          Host.UserMetrics.TimelineNavigationSetting.SWITCHED_TO_CLASSIC);
    } else if (currentNavSetting === 'modern') {
      this.#modernNavRadioButton.radio.checked = true;
      Host.userMetrics.navigationSettingAtFirstTimelineLoad(
          Host.UserMetrics.TimelineNavigationSetting.SWITCHED_TO_MODERN);
    }
  }

  #getShortcutsInfo(isNavClassic: boolean): Dialogs.ShortcutDialog.Shortcut[] {
    if (isNavClassic) {
      return [
        {title: i18nString(UIStrings.timelineScrollUpDown), bindings: [['Shift', 'Scroll up/down'], ['Shift', '↑/↓']]},
        {
          title: i18nString(UIStrings.timelinePanLeftRight),
          bindings: [['Shift', '←/→'], ['Scroll left/right'], ['A/D']]
        },
        {title: i18nString(UIStrings.timelineZoomInOut), bindings: [['Scroll up/down'], ['W/S'], ['+/-']]},
        {title: i18nString(UIStrings.timelineFastZoomInOut), bindings: [['Shift', 'W/S'], ['Shift', '+/-']]},
      ];
    }

    return [
      {title: i18nString(UIStrings.timelineScrollUpDown), bindings: [['Scroll up/down'], ['Shift', '↑/↓']]},
      {
        title: i18nString(UIStrings.timelinePanLeftRight),
        bindings: [['Shift', 'Scroll up/down'], ['Scroll left/right'], ['Shift', '←/→'], ['A/D']],
      },
      {
        title: i18nString(UIStrings.timelineZoomInOut),
        bindings: [[Host.Platform.isMac() ? '⌘' : 'Ctrl', 'Scroll up/down'], ['W/S'], ['+/-']],
      },
      {title: i18nString(UIStrings.timelineFastZoomInOut), bindings: [['Shift', 'W/S'], ['Shift', '+/-']]},
    ];
  }

  private createSettingsPane(): void {
    this.showSettingsPaneSetting =
        Common.Settings.Settings.instance().createSetting('timeline-show-settings-toolbar', false);
    this.showSettingsPaneButton = new UI.Toolbar.ToolbarSettingToggle(
        this.showSettingsPaneSetting, 'gear', i18nString(UIStrings.captureSettings), 'gear-filled',
        'timeline-settings-toggle');
    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED, this.updateShowSettingsToolbarButton,
        this);
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener(
        SDK.CPUThrottlingManager.Events.RATE_CHANGED, this.updateShowSettingsToolbarButton, this);
    this.disableCaptureJSProfileSetting.addChangeListener(this.updateShowSettingsToolbarButton, this);
    this.captureLayersAndPicturesSetting.addChangeListener(this.updateShowSettingsToolbarButton, this);
    this.captureSelectorStatsSetting.addChangeListener(this.updateShowSettingsToolbarButton, this);

    this.settingsPane = this.element.createChild('div', 'timeline-settings-pane');
    this.settingsPane.setAttribute('jslog', `${VisualLogging.pane('timeline-settings-pane').track({resize: true})}`);

    this.settingsPane.append(UI.SettingsUI.createSettingCheckbox(
        this.disableCaptureJSProfileSetting.title(), this.disableCaptureJSProfileSetting,
        i18nString(UIStrings.disablesJavascriptSampling)));

    const cpuThrottlingPane = this.settingsPane.createChild('div');
    cpuThrottlingPane.append(i18nString(UIStrings.cpu));
    this.cpuThrottlingSelect = MobileThrottling.ThrottlingManager.throttlingManager().createCPUThrottlingSelector();
    cpuThrottlingPane.append(this.cpuThrottlingSelect.control.element);

    this.settingsPane.append(UI.SettingsUI.createSettingCheckbox(
        this.captureLayersAndPicturesSetting.title(), this.captureLayersAndPicturesSetting,
        i18nString(UIStrings.capturesAdvancedPaint)));

    const networkThrottlingPane = this.settingsPane.createChild('div');
    networkThrottlingPane.append(i18nString(UIStrings.network));
    networkThrottlingPane.append(this.createNetworkConditionsSelectToolbarItem().element);

    this.settingsPane.append(UI.SettingsUI.createSettingCheckbox(
        this.captureSelectorStatsSetting.title(), this.captureSelectorStatsSetting,
        i18nString(UIStrings.capturesSelectorStats)));

    const thirdPartyCheckbox =
        this.createSettingCheckbox(this.#thirdPartyTracksSetting, i18nString(UIStrings.showDataAddedByExtensions));

    const localLink = UI.XLink.XLink.create(
        'https://developer.chrome.com/docs/devtools/performance/extension', i18nString(UIStrings.learnMore));
    // Has to be done in JS because the element is inserted into the
    // checkbox's shadow DOM so any styling into timelinePanel.css would
    // not apply.
    localLink.style.marginLeft = '5px';
    thirdPartyCheckbox.element.shadowRoot?.appendChild(localLink);
    this.settingsPane.append(thirdPartyCheckbox.element);

    this.showSettingsPaneSetting.addChangeListener(this.updateSettingsPaneVisibility.bind(this));
    this.updateSettingsPaneVisibility();
  }

  private createNetworkConditionsSelectToolbarItem(): UI.Toolbar.ToolbarComboBox {
    const toolbarItem = new UI.Toolbar.ToolbarComboBox(null, i18nString(UIStrings.networkConditions));
    this.networkThrottlingSelect =
        MobileThrottling.ThrottlingManager.throttlingManager().createNetworkThrottlingSelector(toolbarItem.element);
    return toolbarItem;
  }

  private prepareToLoadTimeline(): void {
    console.assert(this.state === State.IDLE);
    this.setState(State.LOADING);
  }

  private createFileSelector(): void {
    if (this.fileSelectorElement) {
      this.fileSelectorElement.remove();
    }
    // .gz is far more popular than .gzip, but both are valid.
    this.fileSelectorElement =
        UI.UIUtils.createFileSelectorElement(this.loadFromFile.bind(this), '.json,.gz,.gzip,.cpuprofile');
    this.timelinePane.element.appendChild(this.fileSelectorElement);
  }

  private contextMenu(event: Event): void {
    // Do not show this Context menu on FlameChart entries because we have a different context menu for FlameChart entries
    const mouseEvent = (event as MouseEvent);
    if (this.flameChart.getMainFlameChart().coordinatesToEntryIndex(mouseEvent.offsetX, mouseEvent.offsetY) !== -1) {
      return;
    }
    const contextMenu = new UI.ContextMenu.ContextMenu(event, {useSoftMenu: true});
    contextMenu.appendItemsAtLocation('timelineMenu');
    void contextMenu.show();
  }

  async saveToFile(isEnhancedTrace = false, addModifications = false): Promise<void> {
    if (this.state !== State.IDLE) {
      return;
    }
    if (this.#viewMode.mode !== 'VIEWING_TRACE') {
      return;
    }
    let traceEvents = this.#traceEngineModel.rawTraceEvents(this.#viewMode.traceIndex);
    const metadata = this.#traceEngineModel.metadata(this.#viewMode.traceIndex);
    if (!traceEvents) {
      return;
    }

    if (!isEnhancedTrace ||
        !Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_COMPILED_SOURCES)) {
      traceEvents = traceEvents.filter(event => {
        return event.cat !== 'disabled-by-default-devtools.v8-source-rundown-sources';
      });
    }

    if (metadata) {
      metadata.modifications = addModifications ? ModificationsManager.activeManager()?.toJSON() : undefined;
      metadata.enhancedTraceVersion =
          isEnhancedTrace ? SDK.EnhancedTracesParser.EnhancedTracesParser.enhancedTraceVersion : undefined;
    }

    const traceStart = Platform.DateUtilities.toISO8601Compact(new Date());
    let fileName: Platform.DevToolsPath.RawPathString;
    if (metadata?.dataOrigin === Trace.Types.File.DataOrigin.CPU_PROFILE) {
      fileName = `CPU-${traceStart}.cpuprofile` as Platform.DevToolsPath.RawPathString;
    } else if (metadata?.enhancedTraceVersion) {
      fileName = `EnhancedTraces-${traceStart}.json` as Platform.DevToolsPath.RawPathString;
    } else {
      fileName = `Trace-${traceStart}.json` as Platform.DevToolsPath.RawPathString;
    }

    try {
      // TODO(crbug.com/1456818): Extract this logic and add more tests.
      let traceAsString;
      if (metadata?.dataOrigin === Trace.Types.File.DataOrigin.CPU_PROFILE) {
        const profileEvent = traceEvents.find(e => e.name === 'CpuProfile');
        if (!profileEvent?.args?.data) {
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
          traceAsString = cpuprofileJsonGenerator(profile);
        }
      } else {
        const formattedTraceIter = traceJsonGenerator(traceEvents, {
          ...metadata,
          sourceMaps: isEnhancedTrace ? metadata?.sourceMaps : undefined,
        });
        traceAsString = Array.from(formattedTraceIter).join('');
      }
      if (!traceAsString) {
        throw new Error('Trace content empty');
      }
      await Workspace.FileManager.FileManager.instance().save(
          fileName, traceAsString, true /* forceSaveAs */, false /* isBase64 */);
      Workspace.FileManager.FileManager.instance().close(fileName);
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

  async showHistoryDropdown(): Promise<void> {
    const recordingData = await this.#historyManager.showHistoryDropDown();
    if (recordingData) {
      if (recordingData.type === 'LANDING_PAGE') {
        this.#changeView({mode: 'LANDING_PAGE'});
      } else {
        this.#changeView({
          mode: 'VIEWING_TRACE',
          traceIndex: recordingData.parsedTraceIndex,
        });
      }
    }
  }

  navigateHistory(direction: number): boolean {
    const recordingData = this.#historyManager.navigate(direction);
    // When navigating programatically, you cannot navigate to the landing page
    // view, so we can discount that possibility here.
    if (recordingData && recordingData.type === 'TRACE_INDEX') {
      this.#changeView({
        mode: 'VIEWING_TRACE',
        traceIndex: recordingData.parsedTraceIndex,
      });
    }
    return true;
  }

  #saveModificationsForActiveTrace(): void {
    if (this.#viewMode.mode !== 'VIEWING_TRACE') {
      return;
    }
    const newModifications = ModificationsManager.activeManager()?.toJSON();
    if (newModifications) {
      this.#traceEngineModel.overrideModifications(this.#viewMode.traceIndex, newModifications);
    }
  }

  selectFileToLoad(): void {
    if (this.fileSelectorElement) {
      this.fileSelectorElement.click();
    }
  }

  async loadFromFile(file: File): Promise<void> {
    if (this.state !== State.IDLE) {
      return;
    }
    const maximumTraceFileLengthToDetermineEnhancedTraces = 5000;
    // We are expecting to locate the enhanced traces version within the first 5000
    // characters of the trace file if the given trace file is enhanced traces.
    // Doing so can avoid serializing the whole trace while needing to serialize
    // it again in rehydrated session for enhanced traces.
    const blob = file.slice(0, maximumTraceFileLengthToDetermineEnhancedTraces);
    const content = await blob.text();
    if (content.includes('enhancedTraceVersion')) {
      await window.scheduler?.postTask(() => {
        this.#launchRehydratedSession(file);
      }, {priority: 'background'});
    } else {
      this.loader = await TimelineLoader.loadFromFile(file, this);
      this.prepareToLoadTimeline();
    }
    this.createFileSelector();
  }

  #launchRehydratedSession(file: File): void {
    let rehydratingWindow: Window|null = null;
    let pathToLaunch: string|null = null;
    const url = new URL(window.location.href);
    const pathToEntrypoint = url.pathname.slice(0, url.pathname.lastIndexOf('/'));
    url.pathname = `${pathToEntrypoint}/rehydrated_devtools_app.html`;
    pathToLaunch = url.toString();

    // Clarifying the window the code is referring to
    const hostWindow = window;
    function onMessageHandler(ev: MessageEvent): void {
      if (url && ev.data && ev.data.type === 'REHYDRATING_WINDOW_READY') {
        rehydratingWindow?.postMessage({type: 'REHYDRATING_TRACE_FILE', traceFile: file}, url.origin);
      }
      hostWindow.removeEventListener('message', onMessageHandler);
    }
    hostWindow.addEventListener('message', onMessageHandler);
    rehydratingWindow = hostWindow.open(pathToLaunch, /* target: */ undefined, 'noopener=false,popup=true');
  }

  async loadFromURL(url: Platform.DevToolsPath.UrlString): Promise<void> {
    if (this.state !== State.IDLE) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = await TimelineLoader.loadFromURL(url, this);
  }

  private updateMiniMap(): void {
    if (this.#viewMode.mode !== 'VIEWING_TRACE') {
      return;
    }

    const parsedTrace = this.#traceEngineModel.parsedTrace(this.#viewMode.traceIndex);
    const isCpuProfile = this.#traceEngineModel.metadata(this.#viewMode.traceIndex)?.dataOrigin ===
        Trace.Types.File.DataOrigin.CPU_PROFILE;
    if (!parsedTrace) {
      return;
    }

    this.#minimapComponent.setData({
      parsedTrace,
      isCpuProfile,
      settings: {
        showScreenshots: this.showScreenshotsSetting.get(),
        showMemory: this.showMemorySetting.get(),
      },
    });
  }

  private onMemoryModeChanged(): void {
    this.flameChart.updateCountersGraphToggle(this.showMemorySetting.get());
    this.updateMiniMap();
    this.doResize();
    this.select(null);
  }

  private onDimThirdPartiesChanged(): void {
    if (this.#viewMode.mode !== 'VIEWING_TRACE') {
      return;
    }
    this.flameChart.dimThirdPartiesIfRequired();
  }

  #extensionDataVisibilityChanged(): void {
    this.flameChart.rebuildDataForTrace();
  }

  private updateSettingsPaneVisibility(): void {
    if (isNode) {
      return;
    }
    if (this.showSettingsPaneSetting.get()) {
      this.showSettingsPaneButton.setToggled(true);
      this.settingsPane?.classList.remove('hidden');
    } else {
      this.showSettingsPaneButton.setToggled(false);
      this.settingsPane?.classList.add('hidden');
    }
  }

  private updateShowSettingsToolbarButton(): void {
    const messages: string[] = [];
    if (SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingRate() !== 1) {
      messages.push(i18nString(UIStrings.CpuThrottlingIsEnabled));
    }
    if (SDK.NetworkManager.MultitargetNetworkManager.instance().isThrottling()) {
      messages.push(i18nString(UIStrings.NetworkThrottlingIsEnabled));
    }
    if (this.captureLayersAndPicturesSetting.get()) {
      messages.push(i18nString(UIStrings.SignificantOverheadDueToPaint));
    }
    if (this.captureSelectorStatsSetting.get()) {
      messages.push(i18nString(UIStrings.SelectorStatsEnabled));
    }
    if (this.disableCaptureJSProfileSetting.get()) {
      messages.push(i18nString(UIStrings.JavascriptSamplingIsDisabled));
    }

    this.showSettingsPaneButton.setChecked(messages.length > 0);
    this.showSettingsPaneButton.element.style.setProperty('--dot-toggle-top', '16px');
    this.showSettingsPaneButton.element.style.setProperty('--dot-toggle-left', '15px');

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
      this.cpuProfiler = UI.Context.Context.instance().flavor(SDK.CPUProfilerModel.CPUProfilerModel);
      if (!this.cpuProfiler) {
        // If there is no isolate selected, we will profile the first isolate that devtools connects to.
        // If we profile all target, but this will cause some bugs like time for the function is calculated wrong,
        // because the profiles will be concated and sorted together, so the total time will be amplified.
        // Multiple targets problem might happen when you inspect multiple node servers on different port at same time,
        // or when you let DevTools listen to both locolhost:9229 & 127.0.0.1:9229.
        const firstNodeTarget =
            SDK.TargetManager.TargetManager.instance().targets().find(target => target.type() === SDK.Target.Type.NODE);
        if (!firstNodeTarget) {
          throw new Error('Could not load any Node target.');
        }
        if (firstNodeTarget) {
          this.cpuProfiler = firstNodeTarget.model(SDK.CPUProfilerModel.CPUProfilerModel);
        }
      }

      this.setUIControlsEnabled(false);
      this.#changeView({mode: 'STATUS_PANE_OVERLAY'});
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
      this.#changeView({mode: 'STATUS_PANE_OVERLAY'});
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
        captureSelectorStats: this.captureSelectorStatsSetting.get(),
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
    this.setState(State.START_PENDING);
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
    this.setState(State.STOP_PENDING);
    if (this.controller) {
      await this.controller.stopRecording();
      this.setUIControlsEnabled(true);
      await this.controller.dispose();
      this.controller = null;
      return;
    }
    if (this.cpuProfiler) {
      const profile = await this.cpuProfiler.stopRecording();
      this.setState(State.IDLE);
      this.loadFromCpuProfile(profile);

      this.setUIControlsEnabled(true);
      this.cpuProfiler = null;

      await SDK.TargetManager.TargetManager.instance().resumeAllTargets();
    }
  }

  private async recordingFailed(error: string, rawEvents?: Trace.Types.Events.Event[]): Promise<void> {
    if (this.statusPane) {
      this.statusPane.remove();
    }
    this.statusPane = new StatusPane(
        {
          description: error,
          buttonText: i18nString(UIStrings.close),
          hideStopButton: true,
          showProgress: undefined,
          showTimer: undefined,
        },
        // When recording failed, we should load null to go back to the landing page.
        async () => {
          this.statusPane?.remove();
          await this.loadingComplete(
              /* no collectedEvents */[],
              /* exclusiveFilter= */ null,
              /* metadata= */ null);
        });
    this.statusPane.showPane(this.statusPaneContainer);
    this.statusPane.updateStatus(i18nString(UIStrings.recordingFailed));

    if (rawEvents) {
      this.statusPane.enableDownloadOfEvents(rawEvents);
    }

    this.setState(State.RECORDING_FAILED);
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
    this.loadFromCpuProfile(data.cpuProfile);
    void UI.InspectorView.InspectorView.instance().showPanel('timeline');
  }

  private updateTimelineControls(): void {
    this.toggleRecordAction.setToggled(this.state === State.RECORDING);
    this.toggleRecordAction.setEnabled(this.state === State.RECORDING || this.state === State.IDLE);
    this.recordReloadAction.setEnabled(isNode ? false : this.state === State.IDLE);
    this.#historyManager.setEnabled(this.state === State.IDLE);
    this.clearButton.setEnabled(this.state === State.IDLE);
    this.panelToolbar.setEnabled(this.state !== State.LOADING);
    this.panelRightToolbar.setEnabled(this.state !== State.LOADING);
    this.dropTarget.setEnabled(this.state === State.IDLE);
    this.loadButton.setEnabled(this.state === State.IDLE);
    this.saveButton.setEnabled(this.state === State.IDLE && this.#hasActiveTrace());
    this.homeButton?.setEnabled(this.state === State.IDLE && this.#hasActiveTrace());
    if (this.#viewMode.mode === 'VIEWING_TRACE') {
      this.#addSidebarIconToToolbar();
    }
  }

  async toggleRecording(): Promise<void> {
    if (this.state === State.IDLE) {
      this.recordingPageReload = false;
      await this.startRecording();
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.TimelineStarted);
    } else if (this.state === State.RECORDING) {
      await this.stopRecording();
    }
  }

  recordReload(): void {
    if (this.state !== State.IDLE) {
      return;
    }
    this.recordingPageReload = true;
    void this.startRecording();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.TimelinePageReloadStarted);
  }

  private onClearButton(): void {
    this.#historyManager.clear();
    this.#traceEngineModel = this.#instantiateNewModel();
    ModificationsManager.reset();
    this.#uninstallSourceMapsResolver();
    this.flameChart.getMainDataProvider().reset();
    this.flameChart.getNetworkDataProvider().reset();
    this.flameChart.reset();
    this.#changeView({mode: 'LANDING_PAGE'});
  }

  #hasActiveTrace(): boolean {
    return this.#viewMode.mode === 'VIEWING_TRACE';
  }

  #onBrickBreakerEasterEggClick(): void {
    if (!this.#hasActiveTrace()) {
      return;
    }
    this.flameChart.runBrickBreakerGame();
  }

  #applyActiveFilters(traceIsGeneric: boolean, exclusiveFilter: Trace.Extras.TraceFilter.TraceFilter|null = null):
      void {
    if (traceIsGeneric || Root.Runtime.experiments.isEnabled('timeline-show-all-events')) {
      return;
    }

    const newActiveFilters = exclusiveFilter ? [exclusiveFilter] : [
      TimelineUIUtils.visibleEventsFilter(),
    ];

    ActiveFilters.instance().setFilters(newActiveFilters);
  }

  /**
   * If we generate a lot of the same aria announcements very quickly, we don't
   * want to send them all to the user.
   */
  #ariaDebouncer = Common.Debouncer.debounce(() => {
    if (this.#pendingAriaMessage) {
      UI.ARIAUtils.alert(this.#pendingAriaMessage);
      this.#pendingAriaMessage = null;
    }
  }, 1_000);

  #makeAriaAnnouncement(message: string): void {
    // If we already have one pending, don't queue this one.
    if (message === this.#pendingAriaMessage) {
      return;
    }

    // If the pending message is different, immediately announce the pending
    // message + then update the pending message to the new one.
    if (this.#pendingAriaMessage) {
      UI.ARIAUtils.alert(this.#pendingAriaMessage);
    }
    this.#pendingAriaMessage = message;
    this.#ariaDebouncer();
  }

  /**
   * Called when we update the active trace that is being shown to the user.
   * This is called from {@see changeView} when we change the UI to show a
   * trace - either one the user has just recorded/imported, or one they have
   * navigated to via the dropdown.
   *
   * If you need code to execute whenever the active trace changes, this is the method to use.
   * If you need code to execute ONLY ON NEW TRACES, then use {@see loadingComplete}
   * You should not call this method directly if you want the UI to update; use
   * {@see changeView} to control what is shown to the user.
   */
  #setModelForActiveTrace(): void {
    if (this.#viewMode.mode !== 'VIEWING_TRACE') {
      return;
    }
    const {traceIndex} = this.#viewMode;
    const parsedTrace = this.#traceEngineModel.parsedTrace(traceIndex);
    const traceMetadata = this.#traceEngineModel.metadata(traceIndex);
    const syntheticEventsManager = this.#traceEngineModel.syntheticTraceEventsManager(traceIndex);

    if (!parsedTrace || !syntheticEventsManager) {
      // This should not happen, because you can only get into the
      // VIEWING_TRACE viewMode if you have a valid trace index from the
      // Trace Engine. If it does, let's bail back to the landing page.
      console.error(`setModelForActiveTrace was called with an invalid trace index: ${traceIndex}`);
      this.#changeView({mode: 'LANDING_PAGE'});
      return;
    }

    Trace.Helpers.SyntheticEvents.SyntheticEventsManager.activate(syntheticEventsManager);
    // Clear the line level profile that could exist from the previous trace.
    PerfUI.LineLevelProfile.Performance.instance().reset();

    this.#minimapComponent.reset();

    // Order is important: the bounds must be set before we initiate any UI
    // rendering.
    TraceBounds.TraceBounds.BoundsManager.instance().resetWithNewBounds(
        parsedTrace.Meta.traceBounds,
    );

    // Set up the modifications manager for the newly active trace.
    // The order is important: this needs to happen before we trigger a flame chart redraw by setting the model.
    // (it could happen after, but then we would need to trigger a fresh redraw so let's not do that)
    const currentManager = ModificationsManager.initAndActivateModificationsManager(this.#traceEngineModel, traceIndex);

    if (!currentManager) {
      console.error('ModificationsManager could not be created or activated.');
    }
    this.statusPane?.updateProgressBar(i18nString(UIStrings.processed), 70);

    const traceInsightsSets = this.#traceEngineModel.traceInsights(traceIndex);
    this.flameChart.setInsights(traceInsightsSets, this.#eventToRelatedInsights);

    this.flameChart.setModel(parsedTrace, traceMetadata);
    this.flameChart.resizeToPreferredHeights();
    // Reset the visual selection as we've just swapped to a new trace.
    this.flameChart.setSelectionAndReveal(null);
    this.#sideBar.setParsedTrace(parsedTrace, traceMetadata);

    this.searchableViewInternal.showWidget();

    const exclusiveFilter = this.#exclusiveFilterPerTrace.get(traceIndex) ?? null;
    this.#applyActiveFilters(parsedTrace.Meta.traceIsGeneric, exclusiveFilter);

    // Add ModificationsManager listeners for annotations change to update the Annotation Overlays.
    currentManager?.addEventListener(AnnotationModifiedEvent.eventName, event => {
      // Update screen readers.
      const announcementText = AnnotationHelpers.ariaAnnouncementForModifiedEvent(event as AnnotationModifiedEvent);
      if (announcementText) {
        this.#makeAriaAnnouncement(announcementText);
      }

      const {overlay, action} = (event as AnnotationModifiedEvent);
      if (action === 'Add') {
        this.flameChart.addOverlay(overlay);
      } else if (action === 'Remove') {
        this.flameChart.removeOverlay(overlay);
      } else if (action === 'UpdateTimeRange' && AnnotationHelpers.isTimeRangeLabel(overlay)) {
        this.flameChart.updateExistingOverlay(overlay, {
          bounds: overlay.bounds,
        });
      } else if (action === 'UpdateLinkToEntry' && AnnotationHelpers.isEntriesLink(overlay)) {
        this.flameChart.updateExistingOverlay(overlay, {
          entryTo: overlay.entryTo,
        });
      } else if (action === 'EnterLabelEditState' && AnnotationHelpers.isEntryLabel(overlay)) {
        this.flameChart.enterLabelEditMode(overlay);
      }

      const annotations = currentManager.getAnnotations();
      const annotationEntryToColorMap = this.buildColorsAnnotationsMap(annotations);
      this.#sideBar.setAnnotations(annotations, annotationEntryToColorMap);
    });

    // To calculate the activity we might want to zoom in, we use the top-most main-thread track
    const topMostMainThreadAppender =
        this.flameChart.getMainDataProvider().compatibilityTracksAppenderInstance().threadAppenders().at(0);
    if (topMostMainThreadAppender) {
      const zoomedInBounds = Trace.Extras.MainThreadActivity.calculateWindow(
          parsedTrace.Meta.traceBounds, topMostMainThreadAppender.getEntries());

      TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(zoomedInBounds);
    }

    // Add overlays for annotations loaded from the trace file
    const currModificationManager = ModificationsManager.activeManager();
    if (currModificationManager) {
      const annotations = currModificationManager.getAnnotations();
      const annotationEntryToColorMap = this.buildColorsAnnotationsMap(annotations);
      this.#sideBar.setAnnotations(annotations, annotationEntryToColorMap);
      this.flameChart.bulkAddOverlays(currModificationManager.getOverlays());
    }

    // Set up line level profiling with CPU profiles, if we found any.
    PerfUI.LineLevelProfile.Performance.instance().reset();
    if (parsedTrace?.Samples.profilesInProcess.size) {
      const primaryPageTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      // Gather up all CPU Profiles we found when parsing this trace.
      const cpuProfiles =
          Array.from(parsedTrace.Samples.profilesInProcess).flatMap(([_processId, threadsInProcess]) => {
            const profiles = Array.from(threadsInProcess.values()).map(profileData => profileData.parsedProfile);
            return profiles;
          });
      for (const profile of cpuProfiles) {
        PerfUI.LineLevelProfile.Performance.instance().appendCPUProfile(profile, primaryPageTarget);
      }
    }

    // Initialize EntityMapper
    this.#entityMapper = new Utils.EntityMapper.EntityMapper(parsedTrace);

    // Set up SourceMapsResolver to ensure we resolve any function names in
    // profile calls.
    // Pass in the entity mapper.
    this.#sourceMapsResolver = new Utils.SourceMapsResolver.SourceMapsResolver(parsedTrace, this.#entityMapper);
    this.#sourceMapsResolver.addEventListener(
        Utils.SourceMapsResolver.SourceMappingsUpdated.eventName, this.#onSourceMapsNodeNamesResolvedBound);
    void this.#sourceMapsResolver.install();

    // Initialize EntityMapper
    this.#entityMapper = new Utils.EntityMapper.EntityMapper(parsedTrace);

    this.statusPane?.updateProgressBar(i18nString(UIStrings.processed), 80);
    this.updateMiniMap();
    this.statusPane?.updateProgressBar(i18nString(UIStrings.processed), 90);
    this.updateTimelineControls();

    this.#setActiveInsight(null);

    this.#sideBar.setInsights(traceInsightsSets);

    this.#eventToRelatedInsights.clear();
    if (traceInsightsSets) {
      for (const [insightSetKey, insightSet] of traceInsightsSets) {
        for (const model of Object.values(insightSet.model)) {
          let relatedEvents = model.relatedEvents;
          if (!relatedEvents) {
            relatedEvents = new Map();
          } else if (Array.isArray(relatedEvents)) {
            relatedEvents = new Map(relatedEvents.map(e => [e, []]));
          }

          for (const [event, messages] of relatedEvents.entries()) {
            const relatedInsights = this.#eventToRelatedInsights.get(event) ?? [];
            this.#eventToRelatedInsights.set(event, relatedInsights);
            relatedInsights.push({
              insightLabel: model.title,
              messages,
              activateInsight: () => {
                this.#setActiveInsight({model, insightSetKey});
              },
            });
          }
        }
      }
    }

    this.#showSidebarIfRequired();

    // When the timeline is loaded for the first time, setup the shortcuts dialog and log what navigation setting is selected.
    // Logging the setting on the first timeline load will allow us to get an estimate number of people using each option.
    if (this.#traceEngineModel.size() === 1 &&
        Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_ALTERNATIVE_NAVIGATION)) {
      this.#setupNavigationSetting();
      if (Common.Settings.moduleSetting('flamechart-selected-navigation').get() === 'classic') {
        Host.userMetrics.navigationSettingAtFirstTimelineLoad(
            Host.UserMetrics.TimelineNavigationSetting.CLASSIC_AT_SESSION_FIRST_TRACE);
      } else {
        Host.userMetrics.navigationSettingAtFirstTimelineLoad(
            Host.UserMetrics.TimelineNavigationSetting.MODERN_AT_SESSION_FIRST_TRACE);
      }
    }
  }

  /**
   * We automatically show the sidebar in only 2 scenarios:
   * 1. The user has never seen it before, so we show it once to aid discovery
   * 2. The user had it open, and we hid it (for example, during recording), so now we need to bring it back.
   */
  #showSidebarIfRequired(): void {
    if (Root.Runtime.Runtime.queryParam('disable-auto-performance-sidebar-reveal') !== null) {
      // Used in interaction tests & screenshot tests.
      return;
    }
    const needToRestore = this.#restoreSidebarVisibilityOnTraceLoad;
    const userHasSeenSidebar = this.#sideBar.userHasOpenedSidebarOnce();

    if (!userHasSeenSidebar || needToRestore) {
      this.#splitWidget.showBoth();
    }
    this.#restoreSidebarVisibilityOnTraceLoad = false;
  }

  // Build a map mapping annotated entries to the colours that are used to display them in the FlameChart.
  // We need this map to display the entries in the sidebar with the same colours.
  private buildColorsAnnotationsMap(annotations: Trace.Types.File.Annotation[]): Map<Trace.Types.Events.Event, string> {
    const annotationEntryToColorMap = new Map<Trace.Types.Events.Event, string>();

    for (const annotation of annotations) {
      if (Trace.Types.File.isEntryLabelAnnotation(annotation)) {
        annotationEntryToColorMap.set(annotation.entry, this.getEntryColorByEntry(annotation.entry));
      } else if (Trace.Types.File.isEntriesLinkAnnotation(annotation)) {
        annotationEntryToColorMap.set(annotation.entryFrom, this.getEntryColorByEntry(annotation.entryFrom));
        if (annotation.entryTo) {
          annotationEntryToColorMap.set(annotation.entryTo, this.getEntryColorByEntry(annotation.entryTo));
        }
      }
    }

    return annotationEntryToColorMap;
  }

  private getEntryColorByEntry(entry: Trace.Types.Events.Event): string {
    const mainIndex = this.flameChart.getMainDataProvider().indexForEvent(entry);
    const networkIndex = this.flameChart.getNetworkDataProvider().indexForEvent(entry);
    if (mainIndex !== null) {
      const color = this.flameChart.getMainDataProvider().entryColor(mainIndex);

      // The color for idle frames will be white in flame chart, which will display weird in the sidebar, so just use a
      // light gray color instead.
      if (color === 'white') {
        return ThemeSupport.ThemeSupport.instance().getComputedValue('--app-color-system');
      }
      return color;
    }
    if (networkIndex !== null) {
      const color = this.flameChart.getNetworkDataProvider().entryColor(networkIndex);
      return color;
    }

    console.warn('Could not get entry color for ', entry);
    return ThemeSupport.ThemeSupport.instance().getComputedValue('--app-color-system');
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

    this.#changeView({mode: 'STATUS_PANE_OVERLAY'});
    this.setState(State.RECORDING);
    this.showRecordingStarted();
    if (this.statusPane) {
      this.statusPane.enableAndFocusButton();
      this.statusPane.updateStatus(i18nString(UIStrings.profiling));
      this.statusPane.updateProgressBar(i18nString(UIStrings.bufferUsage), 0);
      this.statusPane.startTimer();
    }
  }

  recordingProgress(usage: number): void {
    if (this.statusPane) {
      this.statusPane.updateProgressBar(i18nString(UIStrings.bufferUsage), usage * 100);
    }
  }

  /**
   * Hide the sidebar, but persist the user's state, because when they import a
   * trace we want to revert the sidebar back to what it was.
   */
  #hideSidebar(): void {
    if (this.#splitWidget.sidebarIsShowing()) {
      this.#restoreSidebarVisibilityOnTraceLoad = true;
      this.#splitWidget.hideSidebar();
    }
  }

  #showLandingPage(): void {
    this.updateSettingsPaneVisibility();
    this.#removeSidebarIconFromToolbar();
    this.#hideSidebar();

    if (this.landingPage) {
      this.landingPage.show(this.statusPaneContainer);
      return;
    }

    const liveMetrics = new TimelineComponents.LiveMetricsView.LiveMetricsView();
    liveMetrics.isNode = isNode;
    this.landingPage = LegacyWrapper.LegacyWrapper.legacyWrapper(UI.Widget.Widget, liveMetrics);
    this.landingPage.element.classList.add('timeline-landing-page', 'fill');
    this.landingPage.contentElement.classList.add('fill');
    this.landingPage.show(this.statusPaneContainer);
  }

  #hideLandingPage(): void {
    this.landingPage.detach();

    // Hide pane settings in trace view to conserve UI space, but preserve underlying setting.
    this.showSettingsPaneButton?.setToggled(false);
    this.settingsPane?.classList.add('hidden');
  }

  async loadingStarted(): Promise<void> {
    this.#changeView({mode: 'STATUS_PANE_OVERLAY'});

    if (this.statusPane) {
      this.statusPane.remove();
    }
    this.statusPane = new StatusPane(
        {
          showProgress: true,
          showTimer: undefined,
          hideStopButton: true,
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
    this.traceLoadStart = Trace.Types.Timing.Milli(performance.now());
    await this.loadingProgress(0);
  }

  async loadingProgress(progress?: number): Promise<void> {
    if (typeof progress === 'number' && this.statusPane) {
      this.statusPane.updateProgressBar(i18nString(UIStrings.received), progress * 100);
    }
  }

  async processingStarted(): Promise<void> {
    this.statusPane?.updateStatus(i18nString(UIStrings.processingProfile));
  }

  #listenForProcessingProgress(): void {
    this.#traceEngineModel.addEventListener(Trace.TraceModel.ModelUpdateEvent.eventName, e => {
      const updateEvent = e as Trace.TraceModel.ModelUpdateEvent;
      const str = i18nString(UIStrings.processed);

      // Trace Engine will report progress from [0...1] but we still have more work to do. So, scale them down a bit.
      const traceParseMaxProgress = 0.7;

      if (updateEvent.data.type === Trace.TraceModel.ModelUpdateType.COMPLETE) {
        this.statusPane?.updateProgressBar(str, 100 * traceParseMaxProgress);
      } else if (updateEvent.data.type === Trace.TraceModel.ModelUpdateType.PROGRESS_UPDATE) {
        const data = updateEvent.data.data;
        this.statusPane?.updateProgressBar(str, data.percent * 100 * traceParseMaxProgress);
      }
    });
  }

  #onSourceMapsNodeNamesResolved(): void {
    // Source maps can change the way calls hierarchies should look in
    // the flame chart (f.e. if some calls are ignore listed after
    // resolving source maps). Thus, we must reappend the flamechart
    // entries.
    this.flameChart.getMainDataProvider().timelineData(true);
    this.flameChart.getMainFlameChart().update();
  }

  /**
   * This is called with we are done loading a trace from a file, or after we
   * have recorded a fresh trace.
   *
   * IMPORTANT: All the code in here should be code that is only required when we have
   * recorded or loaded a brand new trace. If you need the code to run when the
   * user switches to an existing trace, please @see #setModelForActiveTrace and put your
   * code in there.
   **/
  async loadingComplete(
      collectedEvents: Trace.Types.Events.Event[], exclusiveFilter: Trace.Extras.TraceFilter.TraceFilter|null = null,
      metadata: Trace.Types.File.MetaData|null): Promise<void> {
    this.#traceEngineModel.resetProcessor();

    delete this.loader;

    // If the user just recorded this trace via the record UI, the state will
    // be StopPending. Whereas if it was an existing trace they loaded via a
    // file, it will be State.Loading. This means we can tell the recording is
    // fresh by checking the state value.
    const recordingIsFresh = this.state === State.STOP_PENDING;

    this.setState(State.IDLE);

    if (collectedEvents.length === 0) {
      // 0 collected events indicates probably an invalid file was imported.
      // If the user does not have any already-loaded traces, then we should
      // just reset the panel back to the landing page. However if they had a
      // previous trace imported, we should go to that instead.
      if (this.#traceEngineModel.size()) {
        this.#changeView({
          mode: 'VIEWING_TRACE',
          traceIndex: this.#traceEngineModel.lastTraceIndex(),
        });
      } else {
        this.#changeView({mode: 'LANDING_PAGE'});
      }
      return;
    }

    try {
      await this.#executeNewTrace(collectedEvents, recordingIsFresh, metadata);
      const traceIndex = this.#traceEngineModel.lastTraceIndex();
      if (exclusiveFilter) {
        this.#exclusiveFilterPerTrace.set(traceIndex, exclusiveFilter);
      }
      this.#changeView({
        mode: 'VIEWING_TRACE',
        traceIndex,
      });

      const parsedTrace = this.#traceEngineModel.parsedTrace(traceIndex);
      if (!parsedTrace) {
        throw new Error(`Could not get trace data at index ${traceIndex}`);
      }

      if (recordingIsFresh) {
        Tracker.instance().registerFreshRecording(parsedTrace);
      }

      // We store the index of the active trace so we can load it back easily
      // if the user goes to a different trace then comes back.
      // However we also pass in the full trace data because we use it to build
      // the preview overview thumbnail of the trace that gets shown in the UI.
      this.#historyManager.addRecording({
        data: {
          parsedTraceIndex: traceIndex,
          type: 'TRACE_INDEX',
        },
        filmStripForPreview: Trace.Extras.FilmStrip.fromParsedTrace(parsedTrace),
        parsedTrace,
        metadata,
      });
    } catch (error) {
      // If we errored during the parsing stage, it
      // is useful to get access to the raw events to download the trace. This
      // allows us to debug crashes!
      void this.recordingFailed(error.message, collectedEvents);
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
        const end = Trace.Types.Timing.Milli(performance.now());
        const measure = performance.measure('TraceLoad', {start, end});
        const duration = Trace.Types.Timing.Milli(measure.duration);
        this.element.dispatchEvent(new TraceLoadEvent(duration));
        Host.userMetrics.performanceTraceLoad(measure);
      }, 0);
    });
  }

  /**
   * Store source maps on trace metadata (but just the non-data url ones).
   *
   * Many raw source maps are already in memory, but there are some cases where they may
   * not be and have to be fetched here:
   *
   * 1. If the trace processor (via `#createSourceMapResolver`) never fetched it,
   *    due to `ScriptHandler` skipping the script if it could not find an associated frame.
   * 2. If the initial fetch failed (perhaps the failure was intermittent and a
   *    subsequent attempt will work).
   */
  async #retainSourceMapsForEnhancedTrace(
      parsedTrace: Trace.Handlers.Types.ParsedTrace, metadata: Trace.Types.File.MetaData): Promise<void> {
    const handleScript = async(script: Trace.Handlers.ModelHandlers.Scripts.Script): Promise<void> => {
      if (!script.sourceMapUrl || script.sourceMapUrl.startsWith('data:')) {
        return;
      }

      if (metadata.sourceMaps?.find(m => m.sourceMapUrl === script.sourceMapUrl)) {
        return;
      }

      // TimelineController sets `SDK.SourceMap.SourceMap.retainRawSourceMaps` to true,
      // which means the raw source map is present (assuming `script.sourceMap` is too).
      let rawSourceMap = script.sourceMap?.json();

      // If the raw map is not present for some reason, fetch it again.
      if (!rawSourceMap) {
        const initiator = {
          target: null,
          frameId: script.frame as Protocol.Page.FrameId,
          initiatorUrl: script.url as Platform.DevToolsPath.UrlString
        };
        rawSourceMap = await SDK.SourceMapManager.tryLoadSourceMap(
            script.sourceMapUrl as Platform.DevToolsPath.UrlString, initiator);
      }

      if (script.url && rawSourceMap) {
        metadata.sourceMaps?.push({url: script.url, sourceMapUrl: script.sourceMapUrl, sourceMap: rawSourceMap});
      }
    };

    metadata.sourceMaps = [];

    const promises = [];
    for (const script of parsedTrace?.Scripts.scripts.values() ?? []) {
      promises.push(handleScript(script));
    }
    await Promise.all(promises);
  }

  #createSourceMapResolver(isFreshRecording: boolean, metadata: Trace.Types.File.MetaData|null):
      Trace.TraceModel.ParseConfig['resolveSourceMap'] {
    // Currently, only experimental insights need source maps.
    if (!Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_EXPERIMENTAL_INSIGHTS)) {
      return;
    }

    const debuggerModelForFrameId = new Map<string, SDK.DebuggerModel.DebuggerModel>();
    for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      if (!debuggerModel) {
        continue;
      }

      const resourceModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      const activeFrameIds = (resourceModel?.frames() ?? []).map(frame => frame.id);
      for (const frameId of activeFrameIds) {
        debuggerModelForFrameId.set(frameId, debuggerModel);
      }
    }

    async function getExistingSourceMap(frame: string, scriptId: string, scriptUrl: Platform.DevToolsPath.UrlString):
        Promise<SDK.SourceMap.SourceMap|undefined> {
      const debuggerModel = debuggerModelForFrameId.get(frame);
      if (!debuggerModel) {
        return;
      }

      const script = debuggerModel.scriptForId(scriptId);
      if (!script || (scriptUrl && scriptUrl !== script.sourceURL)) {
        return;
      }

      return await debuggerModel.sourceMapManager().sourceMapForClientPromise(script);
    }

    return async function resolveSourceMap(params: Trace.Types.Configuration.ResolveSourceMapParams) {
      const {scriptId, scriptUrl, sourceMapUrl, frame} = params;

      // For still-active frames, the source map is likely already fetched or at least in-flight.
      if (isFreshRecording) {
        const map = await getExistingSourceMap(frame, scriptId, scriptUrl);
        if (map) {
          return map;
        }
      }

      // If loading from disk, check the metadata for source maps.
      // The metadata doesn't store data url source maps.
      const isDataUrl = sourceMapUrl.startsWith('data:');
      if (!isFreshRecording && metadata?.sourceMaps && !isDataUrl) {
        const cachedSourceMap = metadata.sourceMaps.find(m => m.sourceMapUrl === sourceMapUrl);
        if (cachedSourceMap) {
          return new SDK.SourceMap.SourceMap(scriptUrl, sourceMapUrl, cachedSourceMap.sourceMap);
        }
      }

      // Never fetch source maps if the trace is not fresh - the source maps may not
      // reflect what was actually loaded by the page for this trace on disk.
      if (!isFreshRecording && !isDataUrl) {
        return null;
      }

      if (!scriptUrl) {
        return null;
      }

      // In all other cases, fetch the source map.
      //
      // 1) data urls
      // 2) fresh recording + source map not for active frame
      //
      // For example, since the debugger model is disable during recording, any
      // non-final navigations during the trace will never have their source maps
      // fetched by the debugger model. That's only ever done here.

      const initiator = {target: null, frameId: frame, initiatorUrl: scriptUrl};
      const payload = await SDK.SourceMapManager.tryLoadSourceMap(sourceMapUrl, initiator);
      return payload ? new SDK.SourceMap.SourceMap(scriptUrl, sourceMapUrl, payload) : null;
    };
  }

  async #executeNewTrace(
      collectedEvents: Trace.Types.Events.Event[], isFreshRecording: boolean,
      metadata: Trace.Types.File.MetaData|null): Promise<void> {
    await this.#traceEngineModel.parse(
        collectedEvents,
        {
          metadata: metadata ?? undefined,
          isFreshRecording,
          resolveSourceMap: this.#createSourceMapResolver(isFreshRecording, metadata),
        },
    );

    // Store all source maps on the trace metadata.
    // If not fresh, we can't validate the maps are still accurate.
    if (isFreshRecording && metadata &&
        Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_ENHANCED_TRACES)) {
      const traceIndex = this.#traceEngineModel.lastTraceIndex();
      const parsedTrace = this.#traceEngineModel.parsedTrace(traceIndex);
      if (parsedTrace) {
        await this.#retainSourceMapsForEnhancedTrace(parsedTrace, metadata);
      }
    }
  }

  loadingCompleteForTest(): void {
    // Not implemented, added only for allowing the TimelineTestRunner
    // to be in sync when a trace load is finished.
  }

  private showRecordingStarted(): void {
    this.#changeView({mode: 'STATUS_PANE_OVERLAY'});
    if (this.statusPane) {
      this.statusPane.remove();
    }
    this.statusPane = new StatusPane(
        {
          showTimer: true,
          showProgress: true,
          hideStopButton: false,
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
    if (this.state !== State.RECORDING || !this.recordingPageReload || !this.controller ||
        this.controller.primaryPageTarget !== event.data.resourceTreeModel.target()) {
      return;
    }
    const controller = this.controller;
    await new Promise(r => window.setTimeout(r, this.millisecondsToRecordAfterLoadEvent));

    // Check if we're still in the same recording session.
    if (controller !== this.controller || this.state !== State.RECORDING) {
      return;
    }
    void this.stopRecording();
  }

  private frameForSelection(selection: TimelineSelection): Trace.Types.Events.LegacyTimelineFrame|null {
    if (this.#viewMode.mode !== 'VIEWING_TRACE') {
      return null;
    }
    if (selectionIsRange(selection)) {
      return null;
    }
    if (Trace.Types.Events.isSyntheticNetworkRequest(selection.event)) {
      return null;
    }

    // If the user has selected a random trace event, the frame we want is the last
    // frame in that time window, hence why the window we look for is the
    // endTime to the endTime.
    const parsedTrace = this.#traceEngineModel.parsedTrace(this.#viewMode.traceIndex);
    if (!parsedTrace) {
      return null;
    }
    const endTime = rangeForSelection(selection).max;
    const lastFrameInSelection = Trace.Handlers.ModelHandlers.Frames
                                     .framesWithinWindow(
                                         parsedTrace.Frames.frames,
                                         endTime,
                                         endTime,
                                         )
                                     .at(0);
    return lastFrameInSelection || null;
  }

  jumpToFrame(offset: number): true|undefined {
    if (this.#viewMode.mode !== 'VIEWING_TRACE') {
      return;
    }
    const currentFrame = this.selection && this.frameForSelection(this.selection);
    if (!currentFrame) {
      return;
    }
    const parsedTrace = this.#traceEngineModel.parsedTrace(this.#viewMode.traceIndex);
    if (!parsedTrace) {
      return;
    }
    let index = parsedTrace.Frames.frames.indexOf(currentFrame);
    console.assert(index >= 0, 'Can\'t find current frame in the frame list');
    index = Platform.NumberUtilities.clamp(index + offset, 0, parsedTrace.Frames.frames.length - 1);
    const frame = parsedTrace.Frames.frames[index];
    this.#revealTimeRange(
        Trace.Helpers.Timing.microToMilli(frame.startTime), Trace.Helpers.Timing.microToMilli(frame.endTime));
    this.select(selectionFromEvent(frame));
    return true;
  }

  #announceSelectionToAria(oldSelection: TimelineSelection|null, newSelection: TimelineSelection|null): void {
    if (oldSelection !== null && newSelection === null) {
      UI.ARIAUtils.alert(i18nString(UIStrings.selectionCleared));
    }
    if (newSelection === null) {
      return;
    }

    if (selectionIsRange(newSelection)) {
      // We don't announce here; within the annotations code we announce when
      // the user creates a new time range selection. So if we also announce
      // here we will duplicate and overwhelm rather than be useful.
      return;
    }

    // Announce the type of event that was selected (special casing frames.)
    if (Trace.Types.Events.isLegacyTimelineFrame(newSelection.event)) {
      UI.ARIAUtils.alert(i18nString(UIStrings.frameSelected));
      return;
    }
    const name = Utils.EntryName.nameForEntry(newSelection.event);
    UI.ARIAUtils.alert(i18nString(UIStrings.eventSelected, {PH1: name}));
  }

  select(selection: TimelineSelection|null): void {
    this.#announceSelectionToAria(this.selection, selection);
    this.selection = selection;
    this.flameChart.setSelectionAndReveal(selection);
  }

  selectEntryAtTime(events: Trace.Types.Events.Event[]|null, time: number): void {
    if (!events) {
      return;
    }

    if (events.length === 0) {
      this.select(null);
      return;
    }

    // Find best match, then backtrack to the first visible entry.
    for (let index = Platform.ArrayUtilities.upperBound(events, time, (time, event) => time - event.ts) - 1; index >= 0;
         --index) {
      const event = events[index];
      const {endTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
      if (Trace.Helpers.Trace.isTopLevelEvent(event) && endTime < time) {
        break;
      }
      if (ActiveFilters.instance().isVisible(event) && endTime >= time) {
        this.select(selectionFromEvent(event));
        return;
      }
    }
    this.select(null);
  }

  highlightEvent(event: Trace.Types.Events.Event|null): void {
    this.flameChart.highlightEvent(event);
  }

  #revealTimeRange(startTime: Trace.Types.Timing.Milli, endTime: Trace.Types.Timing.Milli): void {
    const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }
    const traceWindow = traceBoundsState.milli.timelineTraceWindow;

    let offset = 0;
    if (traceWindow.max < endTime) {
      offset = endTime - traceWindow.max;
    } else if (traceWindow.min > startTime) {
      offset = startTime - traceWindow.min;
    }
    TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
        Trace.Helpers.Timing.traceWindowFromMilliSeconds(
            Trace.Types.Timing.Milli(traceWindow.min + offset),
            Trace.Types.Timing.Milli(traceWindow.max + offset),
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

  #openSummaryTab(): void {
    // If we have a selection, we should remove it.
    this.flameChart.setSelectionAndReveal(null);
    this.flameChart.selectDetailsViewTab(Tab.Details, null);
  }
}

export const enum State {
  IDLE = 'Idle',
  START_PENDING = 'StartPending',
  RECORDING = 'Recording',
  STOP_PENDING = 'StopPending',
  LOADING = 'Loading',
  RECORDING_FAILED = 'RecordingFailed',
}

// Define row and header height, should be in sync with styles for timeline graphs.
export const rowHeight = 18;

export const headerHeight = 20;
export interface TimelineModeViewDelegate {
  select(selection: TimelineSelection|null): void;
  element: Element;
  set3PCheckboxDisabled(disabled: boolean): void;
  selectEntryAtTime(events: Trace.Types.Events.Event[]|null, time: number): void;
  highlightEvent(event: Trace.Types.Events.Event|null): void;
}

export class StatusPane extends UI.Widget.VBox {
  private status: HTMLElement;
  private time: Element|undefined;
  private progressLabel!: Element;
  private progressBar!: Element;
  private readonly description: HTMLElement|undefined;
  private button: Buttons.Button.Button;
  private downloadTraceButton: Buttons.Button.Button;
  private startTime!: number;
  private timeUpdateTimer?: number;
  #rawEvents?: Trace.Types.Events.Event[];

  constructor(
      options: {
        hideStopButton: boolean,
        showTimer?: boolean,
        showProgress?: boolean,
        description?: string,
        buttonText?: string,
      },
      buttonCallback: () => (Promise<void>| void)) {
    super(true);

    this.contentElement.classList.add('timeline-status-dialog');
    this.contentElement.setAttribute('jslog', `${VisualLogging.dialog('timeline-status').track({resize: true})}`);

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

    const buttonContainer = this.contentElement.createChild('div', 'stop-button');
    this.downloadTraceButton = UI.UIUtils.createTextButton(i18nString(UIStrings.downloadAfterError), () => {
      void this.#downloadRawTraceAfterError();
    }, {jslogContext: 'timeline.download-after-error'});

    this.downloadTraceButton.disabled = true;
    this.downloadTraceButton.classList.add('hidden');

    const buttonText = options.buttonText || i18nString(UIStrings.stop);
    this.button = UI.UIUtils.createTextButton(buttonText, buttonCallback, {
      jslogContext: 'timeline.stop-recording',
    });
    // Profiling can't be stopped during initialization.
    this.button.classList.toggle('hidden', options.hideStopButton);

    buttonContainer.append(this.downloadTraceButton);
    buttonContainer.append(this.button);
  }

  finish(): void {
    this.stopTimer();
    this.button.classList.add('hidden');
  }

  async #downloadRawTraceAfterError(): Promise<void> {
    if (!this.#rawEvents || this.#rawEvents.length === 0) {
      return;
    }
    const traceStart = Platform.DateUtilities.toISO8601Compact(new Date());
    const fileName = `Trace-Load-Error-${traceStart}.json` as Platform.DevToolsPath.RawPathString;
    const formattedTraceIter = traceJsonGenerator(this.#rawEvents, {});
    const traceAsString = Array.from(formattedTraceIter).join('');
    await Workspace.FileManager.FileManager.instance().save(
        fileName, traceAsString, true /* forceSaveAs */, false /* isBase64 */);
    Workspace.FileManager.FileManager.instance().close(fileName);
  }

  enableDownloadOfEvents(rawEvents: Trace.Types.Events.Event[]): void {
    this.#rawEvents = rawEvents;
    this.downloadTraceButton.disabled = false;
    this.downloadTraceButton.classList.remove('hidden');
  }

  remove(): void {
    (this.element.parentNode as HTMLElement)?.classList.remove('tinted');
    this.stopTimer();
    this.element.remove();
  }

  showPane(parent: Element): void {
    this.show(parent);
    parent.classList.add('tinted');
  }

  enableAndFocusButton(): void {
    this.button.classList.remove('hidden');
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
    this.timeUpdateTimer = window.setInterval(this.updateTimer.bind(this), 100);
    this.updateTimer();
  }

  private stopTimer(): void {
    if (!this.timeUpdateTimer) {
      return;
    }
    clearInterval(this.timeUpdateTimer);
    this.updateTimer();
    delete this.timeUpdateTimer;
  }

  private updateTimer(): void {
    if (!this.timeUpdateTimer || !this.time) {
      return;
    }

    const seconds = (Date.now() - this.startTime) / 1000;
    this.time.textContent = i18n.TimeUtilities.preciseSecondsToString(seconds, 1);
  }

  override wasShown(): void {
    super.wasShown();
    this.registerRequiredCSS(timelineStatusDialogStyles);
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

export class TraceRevealer implements Common.Revealer.Revealer<SDK.TraceObject.TraceObject> {
  async reveal(trace: SDK.TraceObject.TraceObject): Promise<void> {
    // TODO(cjamcl): This needs to be given a TraceFile, so that metadata is loaded too. Important
    // for source maps (which otherwise won't be saved on export).
    await UI.ViewManager.ViewManager.instance().showView('timeline');
    TimelinePanel.instance().loadFromEvents(trace.traceEvents);
  }
}

export class EventRevealer implements Common.Revealer.Revealer<SDK.TraceObject.RevealableEvent> {
  async reveal(rEvent: SDK.TraceObject.RevealableEvent): Promise<void> {
    await UI.ViewManager.ViewManager.instance().showView('timeline');
    TimelinePanel.instance().select(selectionFromEvent(rEvent.event));
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const panel = context.flavor(TimelinePanel);
    if (panel === null) {
      return false;
    }
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
        void panel.showHistoryDropdown();
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

/**
 * Used to set the UI.Context when the user expands an Insight. This is only
 * relied upon in the AI Agent code to know which agent to pick by default based
 * on the context of the panel.
 */
export class SelectedInsight {
  constructor(public insight: TimelineComponents.Sidebar.ActiveInsight) {
  }
}
