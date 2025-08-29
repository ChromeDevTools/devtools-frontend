// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

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
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as CrUXManager from '../../models/crux-manager/crux-manager.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Trace from '../../models/trace/trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as Adorners from '../../ui/components/adorners/adorners.js';
import * as Dialogs from '../../ui/components/dialogs/dialogs.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
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
import {IsolateSelector} from './IsolateSelector.js';
import {AnnotationModifiedEvent, ModificationsManager} from './ModificationsManager.js';
import * as Overlays from './overlays/overlays.js';
import {traceJsonGenerator} from './SaveFileFormatter.js';
import {StatusDialog} from './StatusDialog.js';
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
  selectionsEqual,
  type TimelineSelection,
} from './TimelineSelection.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';
import {createHiddenTracksOverlay} from './TrackConfigBanner.js';
import {UIDevtoolsController} from './UIDevtoolsController.js';
import {UIDevtoolsUtils} from './UIDevtoolsUtils.js';
import * as Utils from './utils/utils.js';

const UIStrings = {
  /**
   * @description Text that appears when user drag and drop something (for example, a file) in Timeline Panel of the Performance panel
   */
  dropTimelineFileOrUrlHere: 'Drop trace file or URL here',
  /**
   * @description Title of disable capture jsprofile setting in timeline panel of the performance panel
   */
  disableJavascriptSamples: 'Disable JavaScript samples',
  /**
   *@description Title of capture layers and pictures setting in timeline panel of the performance panel
   */
  enableAdvancedPaint: 'Enable advanced paint instrumentation (slow)',
  /**
   * @description Title of CSS selector stats setting in timeline panel of the performance panel
   */
  enableSelectorStats: 'Enable CSS selector stats (slow)',
  /**
   * @description Title of show screenshots setting in timeline panel of the performance panel
   */
  screenshots: 'Screenshots',
  /**
   * @description Text for the memory of the page
   */
  memory: 'Memory',
  /**
   * @description Text to clear content
   */
  clear: 'Clear',
  /**
   * @description A label for a button that fixes something.
   */
  fixMe: 'Fix me',
  /**
   * @description Tooltip text that appears when hovering over the largeicon load button
   */
  loadTrace: 'Load trace…',
  /**
   * @description Text to take screenshots
   */
  captureScreenshots: 'Capture screenshots',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  showMemoryTimeline: 'Show memory timeline',
  /**
   * @description Tooltip text that appears when hovering over the largeicon settings gear in show settings pane setting in timeline panel of the performance panel
   */
  captureSettings: 'Capture settings',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  disablesJavascriptSampling: 'Disables JavaScript sampling, reduces overhead when running against mobile devices',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  capturesAdvancedPaint: 'Captures advanced paint instrumentation, introduces significant performance overhead',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  capturesSelectorStats: 'Captures CSS selector statistics',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  network: 'Network:',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  cpu: 'CPU:',
  /**
   * @description Title of the 'Network conditions' tool in the bottom drawer
   */
  networkConditions: 'Network conditions',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  CpuThrottlingIsEnabled: '- CPU throttling is enabled',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  NetworkThrottlingIsEnabled: '- Network throttling is enabled',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  SignificantOverheadDueToPaint: '- Significant overhead due to paint instrumentation',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  SelectorStatsEnabled: '- Selector stats is enabled',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  JavascriptSamplingIsDisabled: '- JavaScript sampling is disabled',
  /**
   *@description Text in Timeline Panel of the Performance panel
   */
  stoppingTimeline: 'Stopping timeline…',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  received: 'Received',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  processed: 'Processed',
  /**
   * @description Text to close something
   */
  close: 'Close',
  /**
   * @description Status text to indicate the recording has failed in the Performance panel
   */
  recordingFailed: 'Recording failed',
  /**
   * @description Status text to indicate that exporting the trace has failed
   */
  exportingFailed: 'Exporting the trace failed',
  /**
   * @description Text to indicate the progress of a trace. Informs the user that we are currently
   * creating a performance trace.
   */
  tracing: 'Tracing…',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  bufferUsage: 'Buffer usage',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  loadingTrace: 'Loading trace…',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  processingTrace: 'Processing trace…',
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  initializingTracing: 'Initializing tracing…',
  /**
   * @description Tooltip description for a checkbox that toggles the visibility of data added by extensions of this panel (Performance).
   */
  showDataAddedByExtensions: 'Show data added by extensions of the Performance panel',
  /**
   * Label for a checkbox that toggles the visibility of data added by extensions of this panel (Performance).
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
   * @description Text of a hyperlink to documentation.
   */
  learnMore: 'Learn more',
  /**
   * @description Tooltip text for a button that takes the user back to the default view which shows performance metrics that are live.
   */
  backToLiveMetrics: 'Go back to the live metrics page',
  /**
   * @description Description of the Timeline zoom keyboard instructions that appear in the shortcuts dialog
   */
  timelineZoom: 'Zoom',
  /**
   * @description Description of the Timeline scrolling & panning instructions that appear in the shortcuts dialog.
   */
  timelineScrollPan: 'Scroll & Pan',
  /**
   * @description Title for the Dim 3rd Parties checkbox.
   */
  dimThirdParties: 'Dim 3rd parties',
  /**
   * @description Description for the Dim 3rd Parties checkbox tooltip describing how 3rd parties are classified.
   */
  thirdPartiesByThirdPartyWeb: '3rd parties classified by third-party-web',
  /**
   * @description Title of the shortcuts dialog shown to the user that lists keyboard shortcuts.
   */
  shortcutsDialogTitle: 'Keyboard shortcuts for flamechart',
  /**
   * @description Notification shown to the user whenever DevTools receives an external request.
   */
  externalRequestReceived: '`DevTools` received an external request',
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
  forceOpenSidebar: boolean,
}|{
  mode: 'STATUS_PANE_OVERLAY',
};

export class TimelinePanel extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Panel.Panel>(UI.Panel.Panel)
    implements Client, TimelineModeViewDelegate {
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

  #onAnnotationModifiedEventBound = this.#onAnnotationModifiedEvent.bind(this);

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
  private loadButton!: UI.Toolbar.ToolbarButton;
  private saveButton!: UI.Toolbar.ToolbarButton|UI.Toolbar.ToolbarMenuButton|UI.Toolbar.ToolbarItem;
  private homeButton?: UI.Toolbar.ToolbarButton;
  private askAiButton?: UI.Toolbar.ToolbarButton;
  private statusDialog: StatusDialog|null = null;
  private landingPage!: UI.Widget.Widget;
  private loader?: TimelineLoader;
  private showScreenshotsToolbarCheckbox?: UI.Toolbar.ToolbarItem;
  private showMemoryToolbarCheckbox?: UI.Toolbar.ToolbarItem;
  private networkThrottlingSelect?: MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect;
  private cpuThrottlingSelect?: MobileThrottling.ThrottlingManager.CPUThrottlingSelectorWrapper;
  private fileSelectorElement?: HTMLInputElement;
  private selection: TimelineSelection|null = null;
  private traceLoadStart!: Trace.Types.Timing.Milli|null;

  #traceEngineModel: Trace.TraceModel.Model;
  #externalAIConversationData: AiAssistanceModel.ExternalPerformanceAIConversationData|null = null;
  #sourceMapsResolver: Utils.SourceMapsResolver.SourceMapsResolver|null = null;
  #entityMapper: Utils.EntityMapper.EntityMapper|null = null;
  #onSourceMapsNodeNamesResolvedBound = this.#onSourceMapsNodeNamesResolved.bind(this);
  #sidebarToggleButton = this.#splitWidget.createShowHideSidebarButton(
      i18nString(UIStrings.showSidebar),
      i18nString(UIStrings.hideSidebar),
      // These are used to announce to screen-readers and not shown visibly.
      i18nString(UIStrings.sidebarShown),
      i18nString(UIStrings.sidebarHidden),
      'timeline.sidebar',  // jslog context
  );

  #sideBar = new TimelineComponents.Sidebar.SidebarWidget();
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
  #modernNavRadioButton = UI.UIUtils.createRadioButton(
      'flamechart-selected-navigation', 'Modern - normal scrolling', 'timeline.select-modern-navigation');
  #classicNavRadioButton = UI.UIUtils.createRadioButton(
      'flamechart-selected-navigation', 'Classic - scroll to zoom', 'timeline.select-classic-navigation');

  #onMainEntryHovered: (event: Common.EventTarget.EventTargetEvent<number>) => void;
  #hiddenTracksInfoBarPerTrace = new WeakMap<Trace.Handlers.Types.ParsedTrace, UI.Infobar.Infobar|'DISMISSED'>();

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
    if (!isNode && this.canRecord()) {
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
    this.element.addEventListener(
        'toggle-popover', event => this.flameChart.togglePopover((event as CustomEvent).detail));

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
        void window.scheduler.postTask(() => {
          this.#openSummaryTab();
        }, {priority: 'background'});
      }
    });

    this.#sideBar.element.addEventListener(TimelineInsights.SidebarInsight.InsightProvideOverlays.eventName, event => {
      const {overlays, options} = event;

      void window.scheduler.postTask(() => {
        this.flameChart.setOverlays(overlays, options);

        const overlaysBounds = Overlays.Overlays.traceWindowContainingOverlays(overlays);
        if (overlaysBounds) {
          this.#minimapComponent.highlightBounds(overlaysBounds, /* withBracket */ true);
        } else {
          this.#minimapComponent.clearBoundsHighlight();
        }
      }, {priority: 'user-visible'});
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

    this.#sideBar.element.addEventListener(TimelineComponents.Sidebar.HoverAnnotation.eventName, event => {
      this.flameChart.hoverAnnotationInSidebar(event.annotation);
    });

    this.#sideBar.element.addEventListener(TimelineComponents.Sidebar.AnnotationHoverOut.eventName, () => {
      this.flameChart.sidebarAnnotationHoverOut();
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
  }

  /**
   * Activates an insight and ensures the sidebar is open too.
   * Pass `highlightInsight: true` to flash the insight with the background highlight colour.
   */
  #setActiveInsight(insight: TimelineComponents.Sidebar.ActiveInsight|null, opts: {
    highlightInsight: boolean,
  } = {highlightInsight: false}): void {
    if (insight) {
      this.#splitWidget.showBoth();
    }
    this.#sideBar.setActiveInsight(insight, {highlight: opts.highlightInsight});
    this.flameChart.setActiveInsight(insight);

    if (insight) {
      const selectedInsight = new SelectedInsight(insight);
      UI.Context.Context.instance().setFlavor(SelectedInsight, selectedInsight);
    } else {
      UI.Context.Context.instance().setFlavor(SelectedInsight, null);
    }
  }

  /**
   * This disables the 3P checkbox in the toolbar.
   * If the checkbox was checked, we flip it to indeterminiate to communicate it doesn't currently apply.
   */
  set3PCheckboxDisabled(disabled: boolean): void {
    this.#thirdPartyCheckbox?.applyEnabledState(!disabled);
    if (this.#dimThirdPartiesSetting?.get()) {
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
    if (this.networkThrottlingSelect) {
      this.networkThrottlingSelect.recommendedConditions = recs.networkConditions;
    }
  }

  loadFromEvents(events: Trace.Types.Events.Event[]): void {
    if (this.state !== State.IDLE) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = TimelineLoader.loadFromEvents(events, this);
  }

  loadFromTraceFile(traceFile: Trace.Types.File.TraceFile): void {
    if (this.state !== State.IDLE) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = TimelineLoader.loadFromTraceFile(traceFile, this);
  }

  getFlameChart(): TimelineFlameChartView {
    return this.flameChart;
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
    if (this.statusDialog) {
      this.statusDialog.remove();
    }
    this.statusDialog = null;
  }

  hasActiveTrace(): boolean {
    return this.#viewMode.mode === 'VIEWING_TRACE';
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

      // No need to listen to annotation events, they cannot occur on non
      // visible traces. When a trace is made visible, this listener is added
      // back.
      const manager = ModificationsManager.activeManager();
      if (manager) {
        manager.removeEventListener(AnnotationModifiedEvent.eventName, this.#onAnnotationModifiedEventBound);
      }
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
        this.updateMiniMap();
        this.dispatchEventToListeners(Events.IS_VIEWING_TRACE, false);

        // Whilst we don't reset this, we hide it, mainly so the user cannot
        // hit Ctrl/Cmd-F and try to search when it isn't visible.
        this.searchableViewInternal.hideWidget();
        return;
      }

      case 'VIEWING_TRACE': {
        this.#hideLandingPage();
        this.#setModelForActiveTrace();
        this.#removeStatusPane();
        if (newMode.forceOpenSidebar) {
          this.#showSidebar();
        }
        this.flameChart.dimThirdPartiesIfRequired();
        this.dispatchEventToListeners(Events.IS_VIEWING_TRACE, true);

        return;
      }

      case 'STATUS_PANE_OVERLAY': {
        // We don't manage the StatusPane UI here; it is done in the
        // recordingStarted/recordingProgress callbacks, but we do make sure we
        // hide the landing page.
        this.#hideLandingPage();
        this.dispatchEventToListeners(Events.IS_VIEWING_TRACE, false);

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
   * Exposed for handling external requests.
   */
  get model(): Trace.TraceModel.Model {
    return this.#traceEngineModel;
  }

  getOrCreateExternalAIConversationData(): AiAssistanceModel.ExternalPerformanceAIConversationData {
    if (!this.#externalAIConversationData) {
      const conversationHandler = AiAssistanceModel.ConversationHandler.instance();
      const focus = Utils.AIContext.getPerformanceAgentFocusFromModel(this.model);
      if (!focus) {
        throw new Error('could not create performance agent focus');
      }

      const agent = conversationHandler.createAgent(AiAssistanceModel.ConversationType.PERFORMANCE_FULL);
      const conversation = new AiAssistanceModel.Conversation(
          AiAssistanceModel.ConversationType.PERFORMANCE_FULL,
          [],
          agent.id,
          /* isReadOnly */ true,
          /* isExternal */ true,
      );

      const selected = new AiAssistanceModel.PerformanceTraceContext(focus);

      this.#externalAIConversationData = {
        conversationHandler,
        conversation,
        agent,
        selected,
      };
    }

    return this.#externalAIConversationData;
  }

  invalidateExternalAIConversationData(): void {
    this.#externalAIConversationData = null;
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

  /**
   * Returns false if this was loaded in a standalone context such that recording is
   * not possible, like an enhanced trace (which opens a new devtools window) or
   * trace.cafe.
   */
  private canRecord(): boolean {
    // TODO(paulirish) Determine a more robust method as checking `primaryPageTarget()?.sessionId` isn't accurate.
    return true;
  }

  private shouldEnableFullAskAI(): boolean {
    if (!Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_ASK_AI_FULL_BUTTON)) {
      return false;
    }

    if (Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.DISABLE) {
      return false;
    }

    return true;
  }

  private populateToolbar(): void {
    const canRecord = this.canRecord();

    if (canRecord || isNode) {
      this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.toggleRecordAction));
    }
    if (canRecord) {
      this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.recordReloadAction));
    }

    this.clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clear), 'clear', undefined, 'timeline.clear');
    this.clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => this.onClearButton());
    this.panelToolbar.appendToolbarItem(this.clearButton);

    // Load / Save
    this.loadButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.loadTrace), 'import', undefined, 'timeline.load-from-file');
    this.loadButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceImported);
      this.selectFileToLoad();
    });

    const exportTraceOptions = new TimelineComponents.ExportTraceOptions.ExportTraceOptions();
    exportTraceOptions.data = {
      onExport: this.saveToFile.bind(this),
      buttonEnabled: this.state === State.IDLE && this.#hasActiveTrace(),
    };
    this.saveButton = new UI.Toolbar.ToolbarItem(exportTraceOptions);

    this.panelToolbar.appendSeparator();
    this.panelToolbar.appendToolbarItem(this.loadButton);
    this.panelToolbar.appendToolbarItem(this.saveButton);

    if (canRecord) {
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
    }

    if (this.shouldEnableFullAskAI()) {
      this.askAiButton = new UI.Toolbar.ToolbarButton('Ask AI', 'button-magic', undefined, 'timeline.ask-ai');
      this.askAiButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.#onClickAskAIButton.bind(this));
      this.panelToolbar.appendToolbarItem(this.askAiButton);
      this.panelToolbar.appendSeparator();
    }

    // TODO(crbug.com/337909145): need to hide "Live metrics" option if !canRecord.
    this.panelToolbar.appendToolbarItem(this.#historyManager.button());

    // View
    this.panelToolbar.appendSeparator();
    if (!isNode) {
      this.showScreenshotsToolbarCheckbox =
          this.createSettingCheckbox(this.showScreenshotsSetting, i18nString(UIStrings.captureScreenshots));
      this.panelToolbar.appendToolbarItem(this.showScreenshotsToolbarCheckbox);
    }

    this.showMemoryToolbarCheckbox =
        this.createSettingCheckbox(this.showMemorySetting, i18nString(UIStrings.showMemoryTimeline));

    if (canRecord) {
      // GC
      this.panelToolbar.appendToolbarItem(this.showMemoryToolbarCheckbox);
      this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton('components.collect-garbage'));
    }

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
    if (!isNode && canRecord) {
      this.panelRightToolbar.appendSeparator();
      this.panelRightToolbar.appendToolbarItem(this.showSettingsPaneButton);
    }
  }

  // Currently for debugging purposes only.
  #onClickAskAIButton(): void {
    const actionId = 'drjones.performance-panel-full-context';
    if (!UI.ActionRegistry.ActionRegistry.instance().hasAction(actionId)) {
      return;
    }

    const focus = Utils.AIContext.getPerformanceAgentFocusFromModel(this.#traceEngineModel);
    if (!focus) {
      return;
    }

    UI.Context.Context.instance().setFlavor(Utils.AIContext.AgentFocus, focus);

    // Trigger the AI Assistance panel to open.
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction(actionId);
    void action.execute();
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
      customTitle: i18nString(UIStrings.shortcutsDialogTitle),
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
    const metaKey = Host.Platform.isMac() ? '⌘' : 'Ctrl';
    if (isNavClassic) {
      // Classic navigation = scroll to zoom.
      return [
        {
          title: i18nString(UIStrings.timelineZoom),
          rows: [
            [{key: 'Scroll ↕'}], [{key: 'W'}, {key: 'S'}, {joinText: 'or'}, {key: '+'}, {key: '-'}],
            {footnote: 'hold shift for fast zoom'}
          ]
        },
        {
          title: i18nString(UIStrings.timelineScrollPan),
          rows: [
            [{key: 'Shift'}, {joinText: '+'}, {key: 'Scroll ↕'}],
            [{key: 'Scroll ↔'}, {joinText: 'or'}, {key: 'A'}, {key: 'D'}],
            [
              {key: 'Drag'}, {joinText: 'or'}, {key: 'Shift'}, {joinText: '+'}, {key: '↑'}, {key: '↓'}, {key: '←'},
              {key: '→'}
            ],
          ]
        }
      ];
    }

    // New navigation where scroll = scroll.
    return [
      {
        title: i18nString(UIStrings.timelineZoom),
        rows: [
          [{key: metaKey}, {joinText: '+'}, {key: 'Scroll ↕'}],
          [{key: 'W'}, {key: 'S'}, {joinText: 'or'}, {key: '+'}, {key: '-'}], {footnote: ''}
        ]
      },
      {
        title: i18nString(UIStrings.timelineScrollPan),
        rows: [
          [{key: 'Scroll ↕'}],
          [
            {key: 'Shift'}, {joinText: '+'}, {key: 'Scroll ↕'}, {joinText: 'or'}, {key: 'Scroll ↔'}, {joinText: 'or'},
            {key: 'A'}, {key: 'D'}
          ],
          [
            {key: 'Drag'}, {joinText: 'or'}, {key: 'Shift'}, {joinText: '+'}, {key: '↑'}, {key: '↓'}, {key: '←'},
            {key: '→'}
          ],
        ]
      }
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

    const cpuThrottlingPane = this.settingsPane.createChild('div');
    cpuThrottlingPane.append(i18nString(UIStrings.cpu));
    this.cpuThrottlingSelect = MobileThrottling.ThrottlingManager.throttlingManager().createCPUThrottlingSelector();
    cpuThrottlingPane.append(this.cpuThrottlingSelect.control.element);

    this.settingsPane.append(UI.SettingsUI.createSettingCheckbox(
        this.captureSelectorStatsSetting.title(), this.captureSelectorStatsSetting,
        i18nString(UIStrings.capturesSelectorStats)));

    const networkThrottlingPane = this.settingsPane.createChild('div');
    networkThrottlingPane.append(i18nString(UIStrings.network));
    networkThrottlingPane.append(this.createNetworkConditionsSelectToolbarItem().element);

    this.settingsPane.append(UI.SettingsUI.createSettingCheckbox(
        this.captureLayersAndPicturesSetting.title(), this.captureLayersAndPicturesSetting,
        i18nString(UIStrings.capturesAdvancedPaint)));

    this.settingsPane.append(UI.SettingsUI.createSettingCheckbox(
        this.disableCaptureJSProfileSetting.title(), this.disableCaptureJSProfileSetting,
        i18nString(UIStrings.disablesJavascriptSampling)));

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

  private createNetworkConditionsSelectToolbarItem(): UI.Toolbar.ToolbarItem {
    const toolbarItem = new UI.Toolbar.ToolbarItem(document.createElement('div'));
    this.networkThrottlingSelect =
        MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect.createForGlobalConditions(
            toolbarItem.element, i18nString(UIStrings.networkConditions));
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
    // If we are recording (or transitioning to/from recording, don't let the user use the context menu)
    if (this.state === State.START_PENDING || this.state === State.RECORDING || this.state === State.STOP_PENDING) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Do not show this Context menu on FlameChart entries because we have a different context menu for FlameChart entries
    const mouseEvent = (event as MouseEvent);
    if (this.flameChart.getMainFlameChart().coordinatesToEntryIndex(mouseEvent.offsetX, mouseEvent.offsetY) !== -1) {
      return;
    }
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendItemsAtLocation('timelineMenu');
    void contextMenu.show();
  }

  /**
   * Saves a trace file to disk.
   * Pass `config.savingEnhancedTrace === true` to include source maps in the resulting metadata.
   * Pass `config.addModifications === true` to include user modifications to the trace file, which includes:
   *      1. Annotations
   *      2. Filtering / collapsing of the flame chart.
   *      3. Visual track configuration (re-ordering or hiding tracks).
   */
  async saveToFile(config: {
    includeScriptContent: boolean,
    includeSourceMaps: boolean,
    addModifications: boolean,
  }): Promise<void> {
    if (this.state !== State.IDLE) {
      return;
    }
    if (this.#viewMode.mode !== 'VIEWING_TRACE') {
      return;
    }
    const trace = this.#traceEngineModel.parsedTrace(this.#viewMode.traceIndex);
    if (!trace) {
      return;
    }
    let traceEvents = this.#traceEngineModel.rawTraceEvents(this.#viewMode.traceIndex);
    if (!traceEvents) {
      return;
    }

    // Grab the script mapping to be able to filter out by url.
    const mappedScriptsWithData = Trace.Handlers.ModelHandlers.Scripts.data().scripts;
    const scriptByIdMap = new Map<string, Trace.Handlers.ModelHandlers.Scripts.Script>();

    for (const mapScript of mappedScriptsWithData) {
      scriptByIdMap.set(`${mapScript.isolate}.${mapScript.scriptId}`, mapScript);
    }

    const metadata = this.#traceEngineModel.metadata(this.#viewMode.traceIndex) ?? {};

    traceEvents = traceEvents.map(event => {
      if (Trace.Types.Events.isAnyScriptCatchupEvent(event) && event.name !== 'StubScriptCatchup') {
        const mappedScript = scriptByIdMap.get(`${event.args.data.isolate}.${event.args.data.scriptId}`);

        // If the checkbox to include script content is not checked or if it comes from and
        // extension we dont include the script content.
        if (!config.includeScriptContent ||
            (mappedScript?.url && Trace.Helpers.Trace.isExtensionUrl(mappedScript.url))) {
          return {
            cat: event.cat,
            name: 'StubScriptCatchup',
            ts: event.ts,
            dur: event.dur,
            ph: event.ph,
            pid: event.pid,
            tid: event.tid,
            args: {
              data: {isolate: event.args.data.isolate, scriptId: event.args.data.scriptId},
            },
          } as Trace.Types.Events.V8SourceRundownSourcesStubScriptCatchupEvent;
        }
      }

      return event;
    });

    metadata.modifications = config.addModifications ? ModificationsManager.activeManager()?.toJSON() : undefined;

    // NOTE: we used to export the track configuration changes into the trace
    // file here.
    // We don't do this now because as of August 2025 (M141) track
    // configuration is persisted globally (not per trace). When a user imports
    // a trace, we don't look for any configuration (as we treat the user's
    // DevTools config as the canonical config), so it doesn't make sense to
    // export the config.

    try {
      await this.innerSaveToFile(traceEvents, metadata, {
        includeScriptContent: config.includeScriptContent,
        includeSourceMaps: config.includeSourceMaps,
        addModifications: config.addModifications
      });
    } catch (e) {
      // We expect the error to be an Error class, but this deals with any weird case where it's not.
      const error = e instanceof Error ? e : new Error(e);

      console.error(error.stack);
      if (error.name === 'AbortError') {
        // The user cancelled the action, so this is not an error we need to report.
        return;
      }

      this.#showExportTraceErrorDialog(error);
    }
  }

  async innerSaveToFile(traceEvents: readonly Trace.Types.Events.Event[], metadata: Trace.Types.File.MetaData, config: {
    includeScriptContent: boolean,
    includeSourceMaps: boolean,
    addModifications: boolean,
  }): Promise<void> {
    // Base the filename on the trace's time of recording
    const isoDate =
        Platform.DateUtilities.toISO8601Compact(metadata.startTime ? new Date(metadata.startTime) : new Date());

    const isCpuProfile = metadata.dataOrigin === Trace.Types.File.DataOrigin.CPU_PROFILE;
    const {includeScriptContent, includeSourceMaps} = config;
    metadata.enhancedTraceVersion =
        includeScriptContent ? SDK.EnhancedTracesParser.EnhancedTracesParser.enhancedTraceVersion : undefined;

    let fileName = (isCpuProfile ? `CPU-${isoDate}.cpuprofile` :
                        includeScriptContent ? `EnhancedTrace-${isoDate}.json` :
                                               `Trace-${isoDate}.json`) as Platform.DevToolsPath.RawPathString;

    let blobParts: string[] = [];
    if (isCpuProfile) {
      const profile = Trace.Helpers.SamplesIntegrator.SamplesIntegrator.extractCpuProfileFromFakeTrace(traceEvents);
      blobParts = [JSON.stringify(profile)];
    } else {
      const filteredMetadataSourceMaps =
          includeScriptContent && includeSourceMaps ? this.#filterMetadataSourceMaps(metadata) : undefined;
      const formattedTraceIter = traceJsonGenerator(traceEvents, {
        ...metadata,
        sourceMaps: filteredMetadataSourceMaps,
      });
      blobParts = Array.from(formattedTraceIter);
    }

    if (!blobParts.length) {
      throw new Error('Trace content empty');
    }

    let blob = new Blob(blobParts, {type: 'application/json'});

    // TODO: Enable by default and connect with upcoming SaveDialog
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_SAVE_AS_GZ)) {
      fileName = `${fileName}.gz` as Platform.DevToolsPath.RawPathString;
      const gzStream = Common.Gzip.compressStream(blob.stream());
      blob = await new Response(gzStream, {
               headers: {'Content-Type': 'application/gzip'},
             }).blob();

      // At this point this should be true:
      //  blobParts.join('') === (await gzBlob.arrayBuffer().then(bytes => Common.Gzip.arrayBufferToString(bytes)))
    }

    // In some cases Base64.encode() can return undefined; see crbug.com/436482118 for details.
    // TODO(crbug.com/436482118): understand this edge case and fix the Base64.encode method to not just return undefined.
    let bytesAsB64: string|null = null;
    try {
      // The maximum string length in v8 is `2 ** 29 - 23`, aka 538 MB.
      // If the gzipped&base64-encoded trace is larger than that, this'll throw a RangeError.
      bytesAsB64 = await Common.Base64.encode(blob);
    } catch {
    }
    if (bytesAsB64?.length) {
      const contentData = new TextUtils.ContentData.ContentData(bytesAsB64, /* isBase64=*/ true, blob.type);
      await Workspace.FileManager.FileManager.instance().save(fileName, contentData, /* forceSaveAs=*/ true);
      Workspace.FileManager.FileManager.instance().close(fileName);
    } else {
      // Fallback scenario used in edge case where trace.gz.base64 is larger than 538 MB.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  #filterMetadataSourceMaps(metadata: Trace.Types.File.MetaData): Trace.Types.File.MetadataSourceMap[]|undefined {
    if (!metadata.sourceMaps) {
      return undefined;
    }

    // extensions sourcemaps provide little to no-value for the exported trace
    // debugging, so they are filtered out.
    return metadata.sourceMaps.filter(value => {
      return value.url && Trace.Helpers.Trace.isExtensionUrl(value.url);
    });
  }

  #showExportTraceErrorDialog(error: Error): void {
    if (this.statusDialog) {
      this.statusDialog.remove();
    }

    this.statusDialog = new StatusDialog(
        {
          description: error.message ?? error.toString(),
          buttonText: i18nString(UIStrings.close),
          hideStopButton: false,
          showProgress: false,
          showTimer: false,
        },
        async () => {
          this.statusDialog?.remove();
          this.statusDialog = null;
        });
    this.statusDialog.showPane(this.statusPaneContainer);
    this.statusDialog.updateStatus(i18nString(UIStrings.exportingFailed));
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
          forceOpenSidebar: false,
        });
      }
    }
  }

  navigateHistory(direction: number): boolean {
    const recordingData = this.#historyManager.navigate(direction);
    // When navigating programmatically, you cannot navigate to the landing page
    // view, so we can discount that possibility here.
    if (recordingData && recordingData.type === 'TRACE_INDEX') {
      this.#changeView({
        mode: 'VIEWING_TRACE',
        traceIndex: recordingData.parsedTraceIndex,
        forceOpenSidebar: false,
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

    const content = await Common.Gzip.fileToString(file);
    if (content.includes('enhancedTraceVersion')) {
      await window.scheduler.postTask(() => {
        this.#launchRehydratedSession(content);
      }, {priority: 'background'});
    } else {
      this.loader = TimelineLoader.loadFromParsedJsonFile(JSON.parse(content), this);
      this.prepareToLoadTimeline();
    }
    this.createFileSelector();
  }

  #launchRehydratedSession(traceJson: string): void {
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
        rehydratingWindow?.postMessage({type: 'REHYDRATING_TRACE_FILE', traceJson}, url.origin);
      }
      hostWindow.removeEventListener('message', onMessageHandler);
    }
    hostWindow.addEventListener('message', onMessageHandler);

    if (this.isDocked()) {
      rehydratingWindow = hostWindow.open(pathToLaunch, /* target: */ '_blank', 'noopener=false,popup=false');
    } else {
      rehydratingWindow = hostWindow.open(pathToLaunch, /* target: */ undefined, 'noopener=false,popup=true');
    }
  }

  async loadFromURL(url: Platform.DevToolsPath.UrlString): Promise<void> {
    if (this.state !== State.IDLE) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = await TimelineLoader.loadFromURL(url, this);
  }

  private isDocked(): boolean {
    return UI.DockController.DockController.instance().dockSide() !== UI.DockController.DockState.UNDOCKED;
  }

  private updateMiniMap(): void {
    if (this.#viewMode.mode !== 'VIEWING_TRACE') {
      this.#minimapComponent.setData(null);
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
    this.flameChart.rebuildDataForTrace({updateType: 'REDRAW_EXISTING_TRACE'});
  }

  private updateSettingsPaneVisibility(): void {
    if (isNode || !this.canRecord()) {
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
        // or when you let DevTools listen to both localhost:9229 & 127.0.0.1:9229.
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
    console.assert(!this.statusDialog, 'Status pane is already opened.');
    this.setState(State.START_PENDING);
    this.showRecordingStarted();

    if (isNode) {
      await this.#startCPUProfilingRecording();
    } else {
      await this.#startTraceRecording();
    }
  }

  private async stopRecording(): Promise<void> {
    if (this.statusDialog) {
      this.statusDialog.finish();
      this.statusDialog.updateStatus(i18nString(UIStrings.stoppingTimeline));
      this.statusDialog.updateProgressBar(i18nString(UIStrings.received), 0);
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
    if (this.statusDialog) {
      this.statusDialog.remove();
    }
    this.statusDialog = new StatusDialog(
        {
          description: error,
          buttonText: i18nString(UIStrings.close),
          hideStopButton: true,
          showProgress: undefined,
          showTimer: undefined,
        },
        // When recording failed, we should load null to go back to the landing page.
        async () => {
          this.statusDialog?.remove();
          await this.loadingComplete(
              /* no collectedEvents */[],
              /* exclusiveFilter= */ null,
              /* metadata= */ null);
        });
    this.statusDialog.showPane(this.statusPaneContainer);
    this.statusDialog.updateStatus(i18nString(UIStrings.recordingFailed));

    if (rawEvents) {
      this.statusDialog.enableDownloadOfEvents(rawEvents);
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
    if (this.#viewMode.mode === 'VIEWING_TRACE') {
      this.#addSidebarIconToToolbar();
    }

    const exportTraceOptionsElement =
        this.saveButton.element as TimelineComponents.ExportTraceOptions.ExportTraceOptions;
    exportTraceOptionsElement.data = {
      onExport: this.saveToFile.bind(this),
      buttonEnabled: this.state === State.IDLE && this.#hasActiveTrace(),
    };

    this.#historyManager.setEnabled(this.state === State.IDLE);
    this.clearButton.setEnabled(this.state === State.IDLE);
    this.dropTarget.setEnabled(this.state === State.IDLE);
    this.loadButton.setEnabled(this.state === State.IDLE);
    this.toggleRecordAction.setToggled(this.state === State.RECORDING);
    this.toggleRecordAction.setEnabled(this.state === State.RECORDING || this.state === State.IDLE);
    this.askAiButton?.setEnabled(this.state === State.IDLE && this.#hasActiveTrace());

    if (!this.canRecord()) {
      return;
    }

    this.recordReloadAction.setEnabled(isNode ? false : this.state === State.IDLE);
    this.panelToolbar.setEnabled(this.state !== State.LOADING);
    this.panelRightToolbar.setEnabled(this.state !== State.LOADING);
    this.homeButton?.setEnabled(this.state === State.IDLE && this.#hasActiveTrace());
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
    UI.Context.Context.instance().setFlavor(Utils.AIContext.AgentFocus, null);
  }

  #hasActiveTrace(): boolean {
    return this.#viewMode.mode === 'VIEWING_TRACE';
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
    this.statusDialog?.updateProgressBar(i18nString(UIStrings.processed), 70);

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
    (this.saveButton.element as TimelineComponents.ExportTraceOptions.ExportTraceOptions)
        .updateContentVisibility(currentManager ? currentManager.getAnnotations()?.length > 0 : false);

    // Add ModificationsManager listeners for annotations change to update the
    // Annotation Overlays.
    currentManager?.addEventListener(AnnotationModifiedEvent.eventName, this.#onAnnotationModifiedEventBound);

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

    this.statusDialog?.updateProgressBar(i18nString(UIStrings.processed), 80);
    this.updateMiniMap();
    this.statusDialog?.updateProgressBar(i18nString(UIStrings.processed), 90);
    this.updateTimelineControls();
    this.#maybeCreateHiddenTracksBanner(parsedTrace);

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

    // When the timeline is loaded for the first time, setup the shortcuts dialog and log what navigation setting is selected.
    // Logging the setting on the first timeline load will allow us to get an estimate number of people using each option.
    if (this.#traceEngineModel.size() === 1) {
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

  #onAnnotationModifiedEvent(e: Event): void {
    const event = e as AnnotationModifiedEvent;
    const announcementText = AnnotationHelpers.ariaAnnouncementForModifiedEvent(event);
    if (announcementText) {
      UI.ARIAUtils.LiveAnnouncer.alert(announcementText);
    }

    const {overlay, action} = event;
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
    } else if (action === 'LabelBringForward' && AnnotationHelpers.isEntryLabel(overlay)) {
      this.flameChart.bringLabelForward(overlay);
    }

    const currentManager = ModificationsManager.activeManager();
    const annotations = currentManager?.getAnnotations() ?? [];
    const annotationEntryToColorMap = this.buildColorsAnnotationsMap(annotations);
    this.#sideBar.setAnnotations(annotations, annotationEntryToColorMap);
    (this.saveButton.element as TimelineComponents.ExportTraceOptions.ExportTraceOptions)
        .updateContentVisibility(currentManager ? currentManager.getAnnotations()?.length > 0 : false);
  }

  /**
   * After the user imports / records a trace, we auto-show the sidebar.
   */
  #showSidebar(): void {
    const disabledByLocalStorageForTests =
        window.localStorage.getItem('disable-auto-show-rpp-sidebar-for-test') === 'true';
    if (disabledByLocalStorageForTests) {
      return;
    }

    if (!this.#splitWidget.sidebarIsShowing()) {
      this.#splitWidget.showBoth();
    }
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

  /**
   * If the user imports or records a trace and we have any hidden tracks, we
   * show a warning banner at the bottom. This can be dismissed by the user and
   * if that happens we do not want to bring it back again.
   */
  #maybeCreateHiddenTracksBanner(trace: Trace.Handlers.Types.ParsedTrace): void {
    const hasHiddenTracks = this.flameChart.hasHiddenTracks();
    if (!hasHiddenTracks) {
      return;
    }

    const maybeOverlay = createHiddenTracksOverlay(trace, {
      onClose: () => {
        this.flameChart.overlays().removeOverlaysOfType('BOTTOM_INFO_BAR');
        this.#hiddenTracksInfoBarPerTrace.set(trace, 'DISMISSED');
      },
      onShowAllTracks: () => {
        this.flameChart.showAllMainChartTracks();
      },
      onShowTrackConfigurationMode: () => {
        this.flameChart.enterMainChartTrackConfigurationMode();
      }
    });
    if (maybeOverlay) {
      this.flameChart.addOverlay(maybeOverlay);
    }
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
    if (this.statusDialog) {
      this.statusDialog.enableAndFocusButton();
      this.statusDialog.updateStatus(i18nString(UIStrings.tracing));
      this.statusDialog.updateProgressBar(i18nString(UIStrings.bufferUsage), 0);
      this.statusDialog.startTimer();
    }
  }

  recordingProgress(usage: number): void {
    if (this.statusDialog) {
      this.statusDialog.updateProgressBar(i18nString(UIStrings.bufferUsage), usage * 100);
    }
  }

  /**
   * Hide the sidebar, but persist the user's state, because when they import a
   * trace we want to revert the sidebar back to what it was.
   */
  #hideSidebar(): void {
    if (this.#splitWidget.sidebarIsShowing()) {
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

    if (this.statusDialog) {
      this.statusDialog.remove();
    }
    this.statusDialog = new StatusDialog(
        {
          showProgress: true,
          showTimer: undefined,
          hideStopButton: true,
          buttonText: undefined,
          description: undefined,
        },
        () => this.cancelLoading());
    this.statusDialog.showPane(this.statusPaneContainer);
    this.statusDialog.updateStatus(i18nString(UIStrings.loadingTrace));
    // FIXME: make loading from backend cancelable as well.
    if (!this.loader) {
      this.statusDialog.finish();
    }
    this.traceLoadStart = Trace.Types.Timing.Milli(performance.now());
    await this.loadingProgress(0);
  }

  async loadingProgress(progress?: number): Promise<void> {
    if (typeof progress === 'number' && this.statusDialog) {
      this.statusDialog.updateProgressBar(i18nString(UIStrings.received), progress * 100);
    }
  }

  async processingStarted(): Promise<void> {
    this.statusDialog?.updateStatus(i18nString(UIStrings.processingTrace));
  }

  #listenForProcessingProgress(): void {
    this.#traceEngineModel.addEventListener(Trace.TraceModel.ModelUpdateEvent.eventName, e => {
      const updateEvent = e as Trace.TraceModel.ModelUpdateEvent;
      const str = i18nString(UIStrings.processed);

      // Trace Engine will report progress from [0...1] but we still have more work to do. So, scale them down a bit.
      const traceParseMaxProgress = 0.7;

      if (updateEvent.data.type === Trace.TraceModel.ModelUpdateType.COMPLETE) {
        this.statusDialog?.updateProgressBar(str, 100 * traceParseMaxProgress);
      } else if (updateEvent.data.type === Trace.TraceModel.ModelUpdateType.PROGRESS_UPDATE) {
        const data = updateEvent.data.data;
        this.statusDialog?.updateProgressBar(str, data.percent * 100 * traceParseMaxProgress);
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
   * recorded or imported from disk a brand new trace. If you need the code to
   * run when the user switches to an existing trace, please @see
   * #setModelForActiveTrace and put your code in there.
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
          forceOpenSidebar: false,
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
        // This is a new trace, so we want to open the insights sidebar automatically.
        forceOpenSidebar: true,
      });

      const parsedTrace = this.#traceEngineModel.parsedTrace(traceIndex);
      if (!parsedTrace) {
        throw new Error(`Could not get trace data at index ${traceIndex}`);
      }

      if (recordingIsFresh) {
        Utils.FreshRecording.Tracker.instance().registerFreshRecording(parsedTrace);
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

      this.dispatchEventToListeners(Events.RECORDING_COMPLETED, {
        traceIndex,
      });
    } catch (error) {
      // If we errored during the parsing stage, it
      // is useful to get access to the raw events to download the trace. This
      // allows us to debug crashes!
      void this.recordingFailed(error.message, collectedEvents);
      console.error(error);
      this.dispatchEventToListeners(Events.RECORDING_COMPLETED, {errorText: error.message});
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
      if (script.sourceMapUrlElided) {
        if (metadata.sourceMaps?.find(m => m.url === script.url)) {
          return;
        }

        const rawSourceMap = script.sourceMap?.json();
        if (rawSourceMap && script.url) {
          metadata.sourceMaps?.push({url: script.url, sourceMap: rawSourceMap});
        }
        return;
      }

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
      if (!rawSourceMap && !script.sourceMapUrlElided) {
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
      const {scriptId, scriptUrl, sourceUrl, sourceMapUrl, frame, cachedRawSourceMap} = params;

      if (cachedRawSourceMap) {
        return new SDK.SourceMap.SourceMap(
            sourceUrl, sourceMapUrl ?? '' as Platform.DevToolsPath.UrlString, cachedRawSourceMap);
      }

      // For still-active frames, the source map is likely already fetched or at least in-flight.
      if (isFreshRecording) {
        const map = await getExistingSourceMap(frame, scriptId, scriptUrl);
        if (map) {
          return map;
        }
      }

      if (!sourceMapUrl) {
        return null;
      }

      // If loading from disk, check the metadata for source maps.
      // The metadata doesn't store data url source maps.
      const isDataUrl = sourceMapUrl.startsWith('data:');
      if (!isFreshRecording && metadata?.sourceMaps && !isDataUrl) {
        const cachedSourceMap = metadata.sourceMaps.find(m => m.sourceMapUrl === sourceMapUrl);
        if (cachedSourceMap) {
          return new SDK.SourceMap.SourceMap(sourceUrl, sourceMapUrl, cachedSourceMap.sourceMap);
        }
      }

      // Never fetch source maps if the trace is not fresh - the source maps may not
      // reflect what was actually loaded by the page for this trace on disk.
      if (!isFreshRecording && !isDataUrl) {
        return null;
      }

      if (!sourceUrl) {
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

      const initiator = {target: null, frameId: frame, initiatorUrl: sourceUrl};
      const payload = await SDK.SourceMapManager.tryLoadSourceMap(sourceMapUrl, initiator);
      return payload ? new SDK.SourceMap.SourceMap(sourceUrl, sourceMapUrl, payload) : null;
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
    if (this.statusDialog) {
      this.statusDialog.remove();
    }
    this.statusDialog = new StatusDialog(
        {
          showTimer: true,
          showProgress: true,
          hideStopButton: false,
          description: undefined,
          buttonText: undefined,
        },
        () => this.stopRecording());
    this.statusDialog.showPane(this.statusPaneContainer);
    this.statusDialog.updateStatus(i18nString(UIStrings.initializingTracing));
    this.statusDialog.updateProgressBar(i18nString(UIStrings.bufferUsage), 0);
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
      UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.selectionCleared));
    }
    if (newSelection === null) {
      return;
    }

    if (oldSelection && selectionsEqual(oldSelection, newSelection)) {
      // Don't announce to the user if the selection has not changed.
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
      UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.frameSelected));
      return;
    }
    const name = Utils.EntryName.nameForEntry(newSelection.event);
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.eventSelected, {PH1: name}));
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

  /**
   * Used to reveal an insight - and is called from the AI Assistance panel when the user clicks on the Insight context button that is shown.
   * Revealing an insight should:
   * 1. Ensure the sidebar is open
   * 2. Ensure the insight is expanded
   *    (both of these should be true in the AI Assistance case)
   * 3. Flash the Insight with the highlight colour we use in other panels.
   */
  revealInsight(insightModel: Trace.Insights.Types.InsightModel): void {
    const insightSetKey = insightModel.navigationId ?? Trace.Types.Events.NO_NAVIGATION;
    this.#setActiveInsight({model: insightModel, insightSetKey}, {highlightInsight: true});
  }

  static async *
      handleExternalRecordRequest():
          AsyncGenerator<AiAssistanceModel.ExternalRequestResponse, AiAssistanceModel.ExternalRequestResponse> {
    yield {
      type: AiAssistanceModel.ExternalRequestResponseType.NOTIFICATION,
      message: 'Recording performance trace',
    };
    TimelinePanel.instance().invalidateExternalAIConversationData();
    void VisualLogging.logFunctionCall('timeline.record-reload', 'external');
    Snackbars.Snackbar.Snackbar.show({message: i18nString(UIStrings.externalRequestReceived)});

    const panelInstance = TimelinePanel.instance();
    // Given how the current UX works, it's nice to show the user the Perf
    // Panel so they see what's happening
    await UI.ViewManager.ViewManager.instance().showView('timeline');

    function onRecordingCompleted(eventData: EventTypes[Events.RECORDING_COMPLETED]):
        AiAssistanceModel.ExternalRequestResponse {
      if ('errorText' in eventData) {
        return {
          type: AiAssistanceModel.ExternalRequestResponseType.ERROR,
          message: `Error running the trace: ${eventData.errorText}`,
        };
      }
      const parsedTrace = panelInstance.model.parsedTrace(eventData.traceIndex);
      const insights = panelInstance.model.traceInsights(eventData.traceIndex);
      if (!parsedTrace || !insights || insights.size === 0) {
        return {
          type: AiAssistanceModel.ExternalRequestResponseType.ERROR,
          message: 'The trace was loaded successfully but no Insights were detected.',
        };
      }

      const navigationId = Array.from(insights.keys()).find(k => k !== 'NO_NAVIGATION');
      if (!navigationId) {
        return {
          type: AiAssistanceModel.ExternalRequestResponseType.ERROR,
          message: 'The trace was loaded successfully but no navigation was detected.',
        };
      }

      const insightsForNav = insights.get(navigationId);
      if (!insightsForNav) {
        return {
          type: AiAssistanceModel.ExternalRequestResponseType.ERROR,
          message: 'The trace was loaded successfully but no Insights were detected.',
        };
      }

      let responseTextForNonPassedInsights = '';
      // We still return info on the passed insights, but we put it at the
      // bottom of the response under a heading.
      let responseTextForPassedInsights = '';

      for (const modelName in insightsForNav.model) {
        const model = modelName as keyof Trace.Insights.Types.InsightModelsType;
        const insight = insightsForNav.model[model];
        const formatter = new AiAssistanceModel.PerformanceInsightFormatter(parsedTrace, insight);
        if (!formatter.insightIsSupported()) {
          // Not all Insights are integrated with "Ask AI" yet, let's avoid
          // filling up the response with those ones because there will be no
          // useful information.
          continue;
        }

        const formatted = formatter.formatInsight({headingLevel: 3});

        if (insight.state === 'pass') {
          responseTextForPassedInsights += `${formatted}\n\n`;
          continue;
        } else {
          responseTextForNonPassedInsights += `${formatted}\n\n`;
        }
      }

      const finalText = `# Trace recording results

## Non-passing insights:

These insights highlight potential problems and opportunities to improve performance.
${responseTextForNonPassedInsights}

## Passing insights:

These insights are passing, which means they are not considered to highlight considerable performance problems.
${responseTextForPassedInsights}`;

      return {
        type: AiAssistanceModel.ExternalRequestResponseType.ANSWER,
        message: finalText,
        devToolsLogs: [],
      };
    }

    return await new Promise(resolve => {
      function listener(e: Common.EventTarget.EventTargetEvent<EventTypes[Events.RECORDING_COMPLETED]>): void {
        resolve(onRecordingCompleted(e.data));
        panelInstance.removeEventListener(Events.RECORDING_COMPLETED, listener);
      }
      panelInstance.addEventListener(Events.RECORDING_COMPLETED, listener);

      panelInstance.recordReload();
    });
  }

  static async handleExternalAnalyzeRequest(prompt: string):
      Promise<AsyncGenerator<AiAssistanceModel.ExternalRequestResponse, AiAssistanceModel.ExternalRequestResponse>> {
    const data = TimelinePanel.instance().getOrCreateExternalAIConversationData();
    return await data.conversationHandler.handleExternalRequest({
      conversationType: AiAssistanceModel.ConversationType.PERFORMANCE_FULL,
      prompt,
      data,
    });
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

export let loadTimelineHandlerInstance: LoadTimelineHandler;

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
    await UI.ViewManager.ViewManager.instance().showView('timeline');
    TimelinePanel.instance().loadFromTraceFile(trace);
  }
}

export class EventRevealer implements Common.Revealer.Revealer<SDK.TraceObject.RevealableEvent> {
  async reveal(rEvent: SDK.TraceObject.RevealableEvent): Promise<void> {
    await UI.ViewManager.ViewManager.instance().showView('timeline');
    TimelinePanel.instance().select(selectionFromEvent(rEvent.event));
  }
}

export class InsightRevealer implements Common.Revealer.Revealer<Utils.Helpers.RevealableInsight> {
  async reveal(revealable: Utils.Helpers.RevealableInsight): Promise<void> {
    await UI.ViewManager.ViewManager.instance().showView('timeline');
    TimelinePanel.instance().revealInsight(revealable.insight);
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
        void panel.saveToFile({includeScriptContent: false, includeSourceMaps: false, addModifications: false});
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
export const enum Events {
  IS_VIEWING_TRACE = 'IsViewingTrace',
  RECORDING_COMPLETED = 'RecordingCompleted',
}
export interface EventTypes {
  [Events.IS_VIEWING_TRACE]: boolean;
  [Events.RECORDING_COMPLETED]: {traceIndex: number}|{errorText: string};
}
