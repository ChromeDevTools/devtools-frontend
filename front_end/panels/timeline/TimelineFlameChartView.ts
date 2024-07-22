// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type * as TimelineComponents from './components/components.js';
import {CountersGraph} from './CountersGraph.js';
import {SHOULD_SHOW_EASTER_EGG} from './EasterEgg.js';
import {ModificationsManager} from './ModificationsManager.js';
import * as Overlays from './overlays/overlays.js';
import {targetForEvent} from './TargetForEvent.js';
import {TimelineDetailsView} from './TimelineDetailsView.js';
import {TimelineRegExp} from './TimelineFilters.js';
import {
  Events as TimelineFlameChartDataProviderEvents,
  TimelineFlameChartDataProvider,
} from './TimelineFlameChartDataProvider.js';
import {TimelineFlameChartNetworkDataProvider} from './TimelineFlameChartNetworkDataProvider.js';
import timelineFlameChartViewStyles from './timelineFlameChartView.css.js';
import {type TimelineModeViewDelegate} from './TimelinePanel.js';
import {TimelineSelection} from './TimelineSelection.js';
import {AggregatedTimelineTreeView} from './TimelineTreeView.js';
import {type TimelineMarkerStyle} from './TimelineUIUtils.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart View of the Performance panel
   *@example {Frame} PH1
   *@example {10ms} PH2
   */
  sAtS: '{PH1} at {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineFlameChartView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const MAX_HIGHLIGHTED_SEARCH_ELEMENTS: number = 200;

export class TimelineFlameChartView extends UI.Widget.VBox implements PerfUI.FlameChart.FlameChartDelegate,
                                                                      UI.SearchableView.Searchable {
  private readonly delegate: TimelineModeViewDelegate;
  private searchResults!: number[]|undefined;
  private eventListeners: Common.EventTarget.EventDescriptor[];
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  private readonly networkSplitWidget: UI.SplitWidget.SplitWidget;
  private mainDataProvider: TimelineFlameChartDataProvider;
  private readonly mainFlameChart: PerfUI.FlameChart.FlameChart;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly networkFlameChartGroupExpansionSetting: Common.Settings.Setting<any>;
  private networkDataProvider: TimelineFlameChartNetworkDataProvider;
  private readonly networkFlameChart: PerfUI.FlameChart.FlameChart;
  private readonly networkPane: UI.Widget.VBox;
  private readonly splitResizer: HTMLElement;
  private readonly chartSplitWidget: UI.SplitWidget.SplitWidget;
  private brickGame?: PerfUI.BrickBreaker.BrickBreaker;
  private readonly countersView: CountersGraph;
  private readonly detailsSplitWidget: UI.SplitWidget.SplitWidget;
  private readonly detailsView: TimelineDetailsView;
  private readonly onMainAnnotateEntry: (event: Common.EventTarget.EventTargetEvent<number>) => void;
  private readonly onNetworkAnnotateEntry: (event: Common.EventTarget.EventTargetEvent<number>) => void;
  private readonly onMainEntrySelected: (event: Common.EventTarget.EventTargetEvent<number>) => void;
  private readonly onNetworkEntrySelected: (event: Common.EventTarget.EventTargetEvent<number>) => void;
  readonly #boundRefreshAfterIgnoreList: () => void;
  #selectedEvents: TraceEngine.Types.TraceEvents.TraceEventData[]|null;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly groupBySetting: Common.Settings.Setting<any>;
  private searchableView!: UI.SearchableView.SearchableView;
  private needsResizeToPreferredHeights?: boolean;
  private selectedSearchResult?: number;
  private searchRegex?: RegExp;
  #traceEngineData: TraceEngine.Handlers.Types.TraceParseData|null;
  #traceInsightsData: TraceEngine.Insights.Types.TraceInsightData|null = null;
  #selectedGroupName: string|null = null;
  #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
  #gameKeyMatches = 0;
  #gameTimeout = setTimeout(() => ({}), 0);

  #overlaysContainer: HTMLElement = document.createElement('div');
  #overlays: Overlays.Overlays.Overlays;

  #timeRangeSelectionOverlay: Overlays.Overlays.TimeRangeLabel|null = null;

  #currentInsightOverlays: Array<Overlays.Overlays.TimelineOverlay> = [];
  #activeInsight: TimelineComponents.Sidebar.ActiveInsight|null = null;

  #tooltipElement = document.createElement('div');

  // We use an symbol as the loggable for each group. This is because
  // groups can get re-built at times and we need a common reference to act as
  // the reference for each group that we log. By storing these symbols in
  // a map keyed off the context of the group, we ensure we persist the
  // loggable even if the group gets rebuilt at some point in time.
  #loggableForGroupByLogContext: Map<string, Symbol> = new Map();

  constructor(delegate: TimelineModeViewDelegate) {
    super();
    this.element.classList.add('timeline-flamechart');

    this.delegate = delegate;
    this.eventListeners = [];
    this.#traceEngineData = null;

    const flameChartsContainer = new UI.Widget.VBox();
    flameChartsContainer.element.classList.add('flame-charts-container');

    // Create main and network flamecharts.
    this.networkSplitWidget = new UI.SplitWidget.SplitWidget(false, false, 'timeline-flamechart-main-view', 150);
    this.networkSplitWidget.show(flameChartsContainer.element);

    this.#overlaysContainer.classList.add('timeline-overlays-container');
    flameChartsContainer.element.appendChild(this.#overlaysContainer);

    this.#tooltipElement.classList.add('timeline-entry-tooltip-element');
    flameChartsContainer.element.appendChild(this.#tooltipElement);

    // Ensure that the network panel & resizer appears above the main thread.
    this.networkSplitWidget.sidebarElement().style.zIndex = '120';

    const mainViewGroupExpansionSetting =
        Common.Settings.Settings.instance().createSetting('timeline-flamechart-main-view-group-expansion', {});
    this.mainDataProvider = new TimelineFlameChartDataProvider();
    this.mainDataProvider.addEventListener(
        TimelineFlameChartDataProviderEvents.DataChanged, () => this.mainFlameChart.scheduleUpdate());
    this.mainFlameChart = new PerfUI.FlameChart.FlameChart(this.mainDataProvider, this, {
      groupExpansionSetting: mainViewGroupExpansionSetting,
      // The TimelineOverlays are used for selected elements
      selectedElementOutline: false,
      tooltipElement: this.#tooltipElement,
      useOverlaysForCursorRuler: true,
    });
    this.mainFlameChart.alwaysShowVerticalScroll();
    this.mainFlameChart.enableRuler(false);

    this.mainFlameChart.addEventListener(PerfUI.FlameChart.Events.LatestDrawDimensions, dimensions => {
      this.#overlays.updateChartDimensions('main', dimensions.data.chart);
      this.#overlays.updateVisibleWindow(dimensions.data.traceWindow);
      this.#overlays.update();
    });

    this.networkFlameChartGroupExpansionSetting =
        Common.Settings.Settings.instance().createSetting('timeline-flamechart-network-view-group-expansion', {});
    this.networkDataProvider = new TimelineFlameChartNetworkDataProvider();
    this.networkFlameChart = new PerfUI.FlameChart.FlameChart(this.networkDataProvider, this, {
      groupExpansionSetting: this.networkFlameChartGroupExpansionSetting,
      // The TimelineOverlays are used for selected elements
      selectedElementOutline: false,
      tooltipElement: this.#tooltipElement,
      useOverlaysForCursorRuler: true,
    });
    this.networkFlameChart.alwaysShowVerticalScroll();
    this.networkFlameChart.addEventListener(PerfUI.FlameChart.Events.LatestDrawDimensions, dimensions => {
      this.#overlays.updateChartDimensions('network', dimensions.data.chart);
      this.#overlays.updateVisibleWindow(dimensions.data.traceWindow);
      this.#overlays.update();

      // If the height of the network chart has changed, we need to tell the
      // main flame chart because its tooltips are positioned based in part on
      // the height of the network chart.
      this.mainFlameChart.setTooltipYPixelAdjustment(this.#overlays.networkChartOffsetHeight());
    });

    this.mainFlameChart.addEventListener(PerfUI.FlameChart.Events.MouseMove, event => {
      this.#processFlameChartMouseMoveEvent(event.data);
    });

    this.networkFlameChart.addEventListener(PerfUI.FlameChart.Events.MouseMove, event => {
      this.#processFlameChartMouseMoveEvent(event.data);
    });

    this.#overlays = new Overlays.Overlays.Overlays({
      container: this.#overlaysContainer,
      charts: {
        mainChart: this.mainFlameChart,
        mainProvider: this.mainDataProvider,
        networkChart: this.networkFlameChart,
        networkProvider: this.networkDataProvider,
      },
    });

    this.#overlays.addEventListener(Overlays.Overlays.AnnotationOverlayActionEvent.eventName, event => {
      const {overlay, action} = (event as Overlays.Overlays.AnnotationOverlayActionEvent);
      if (action === 'Remove') {
        ModificationsManager.activeManager()?.removeAnnotationOverlay(overlay);
      } else if (action === 'Update') {
        ModificationsManager.activeManager()?.updateAnnotationOverlay(overlay);
      }
    });

    this.networkPane = new UI.Widget.VBox();
    this.networkPane.setMinimumSize(23, 23);
    this.networkFlameChart.show(this.networkPane.element);
    this.splitResizer = this.networkPane.element.createChild('div', 'timeline-flamechart-resizer');
    this.networkSplitWidget.hideDefaultResizer(true);
    this.networkSplitWidget.installResizer(this.splitResizer);
    this.networkSplitWidget.setMainWidget(this.mainFlameChart);
    this.networkSplitWidget.setSidebarWidget(this.networkPane);

    // Create counters chart splitter.
    this.chartSplitWidget = new UI.SplitWidget.SplitWidget(false, true, 'timeline-counters-split-view-state');
    this.countersView = new CountersGraph(this.delegate);
    this.chartSplitWidget.setMainWidget(flameChartsContainer);
    this.chartSplitWidget.setSidebarWidget(this.countersView);
    this.chartSplitWidget.hideDefaultResizer();
    this.chartSplitWidget.installResizer((this.countersView.resizerElement() as Element));

    // Create top level properties splitter.
    this.detailsSplitWidget = new UI.SplitWidget.SplitWidget(false, true, 'timeline-panel-details-split-view-state');
    this.detailsSplitWidget.element.classList.add('timeline-details-split');
    this.detailsView = new TimelineDetailsView(delegate);
    this.detailsSplitWidget.installResizer(this.detailsView.headerElement());
    this.detailsSplitWidget.setMainWidget(this.chartSplitWidget);
    this.detailsSplitWidget.setSidebarWidget(this.detailsView);
    this.detailsSplitWidget.show(this.element);

    this.onMainAnnotateEntry = this.onAnnotateEntry.bind(this, this.mainDataProvider);
    this.onNetworkAnnotateEntry = this.onAnnotateEntry.bind(this, this.networkDataProvider);
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_ANNOTATIONS_OVERLAYS)) {
      this.mainFlameChart.addEventListener(PerfUI.FlameChart.Events.AnnotateEntry, this.onMainAnnotateEntry, this);
      this.networkFlameChart.addEventListener(
          PerfUI.FlameChart.Events.AnnotateEntry, this.onNetworkAnnotateEntry, this);
    }
    this.onMainEntrySelected = this.onEntrySelected.bind(this, this.mainDataProvider);
    this.onNetworkEntrySelected = this.onEntrySelected.bind(this, this.networkDataProvider);
    this.mainFlameChart.addEventListener(PerfUI.FlameChart.Events.EntrySelected, this.onMainEntrySelected, this);
    this.mainFlameChart.addEventListener(PerfUI.FlameChart.Events.EntryInvoked, this.onMainEntrySelected, this);
    this.networkFlameChart.addEventListener(PerfUI.FlameChart.Events.EntrySelected, this.onNetworkEntrySelected, this);
    this.networkFlameChart.addEventListener(PerfUI.FlameChart.Events.EntryInvoked, this.onNetworkEntrySelected, this);
    this.mainFlameChart.addEventListener(PerfUI.FlameChart.Events.EntryHighlighted, this.onEntryHighlighted, this);
    this.element.addEventListener('keydown', this.#keydownHandler.bind(this));
    this.#boundRefreshAfterIgnoreList = this.#refreshAfterIgnoreList.bind(this);
    this.#selectedEvents = null;

    this.groupBySetting = Common.Settings.Settings.instance().createSetting(
        'timeline-tree-group-by', AggregatedTimelineTreeView.GroupBy.None);
    this.groupBySetting.addChangeListener(this.refreshMainFlameChart, this);
    this.refreshMainFlameChart();

    TraceBounds.TraceBounds.onChange(this.#onTraceBoundsChangeBound);
  }

  setActiveInsight(insight: TimelineComponents.Sidebar.ActiveInsight|null): void {
    this.#activeInsight = insight;

    for (const overlay of this.#currentInsightOverlays) {
      this.removeOverlay(overlay);
    }

    if (!this.#activeInsight) {
      return;
    }

    if (insight) {
      const newInsightOverlays = insight.createOverlayFn();
      this.#currentInsightOverlays = newInsightOverlays;
      for (const overlay of this.#currentInsightOverlays) {
        this.addOverlay(overlay);
      }
    }
  }

  #processFlameChartMouseMoveEvent(data: PerfUI.FlameChart.EventTypes['MouseMove']): void {
    const {mouseEvent, timeInMicroSeconds} = data;

    // If the user is no longer holding shift, remove any existing marker.
    if (!mouseEvent.shiftKey) {
      const removedCount = this.#overlays.removeOverlaysOfType('CURSOR_TIMESTAMP_MARKER');
      if (removedCount > 0) {
        // Don't trigger lots of updates on a mouse move if we didn't actually
        // remove any overlays.
        this.#overlays.update();
      }
    }

    if (!mouseEvent.metaKey && mouseEvent.shiftKey) {
      // CURSOR_TIMESTAMP_MARKER is a singleton; if one already exists it will
      // be updated rather than create an entirely new one.
      this.addOverlay({
        type: 'CURSOR_TIMESTAMP_MARKER',
        timestamp: timeInMicroSeconds,
      });
    }
  }

  #keydownHandler(event: KeyboardEvent): void {
    const keyCombo = 'fixme';
    if (event.key === keyCombo[this.#gameKeyMatches]) {
      this.#gameKeyMatches++;
      clearTimeout(this.#gameTimeout);
      this.#gameTimeout = setTimeout(() => {
        this.#gameKeyMatches = 0;
      }, 2000);
    } else {
      this.#gameKeyMatches = 0;
      clearTimeout(this.#gameTimeout);
    }
    if (this.#gameKeyMatches !== keyCombo.length) {
      return;
    }
    this.fixMe();
  }

  fixMe(): void {
    if (!SHOULD_SHOW_EASTER_EGG) {
      return;
    }
    if ([...this.element.childNodes].find(child => child instanceof PerfUI.BrickBreaker.BrickBreaker)) {
      return;
    }
    this.brickGame = new PerfUI.BrickBreaker.BrickBreaker(this.mainFlameChart);
    this.brickGame.classList.add('brick-game');
    this.element.append(this.brickGame);
  }

  #onTraceBoundsChange(event: TraceBounds.TraceBounds.StateChangedEvent): void {
    if (event.updateType === 'MINIMAP_BOUNDS') {
      // If the update type was a changing of the minimap bounds, we do not
      // need to redraw the timeline.
      return;
    }

    const visibleWindow = event.state.milli.timelineTraceWindow;
    const shouldAnimate = Boolean(event.options.shouldAnimate);
    this.mainFlameChart.setWindowTimes(visibleWindow.min, visibleWindow.max, shouldAnimate);
    this.networkDataProvider.setWindowTimes(visibleWindow.min, visibleWindow.max);
    this.networkFlameChart.setWindowTimes(visibleWindow.min, visibleWindow.max, shouldAnimate);
    this.updateSearchResults(false, false);
  }

  isNetworkTrackShownForTests(): boolean {
    return this.networkSplitWidget.showMode() !== UI.SplitWidget.ShowMode.OnlyMain;
  }

  getMainDataProvider(): TimelineFlameChartDataProvider {
    return this.mainDataProvider;
  }

  refreshMainFlameChart(): void {
    this.mainFlameChart.update();
  }

  extensionDataVisibilityChanged(): void {
    this.#reset();
    this.mainDataProvider.reset(true);
    this.mainDataProvider.timelineData(true);
    this.refreshMainFlameChart();
  }

  windowChanged(
      windowStartTime: TraceEngine.Types.Timing.MilliSeconds, windowEndTime: TraceEngine.Types.Timing.MilliSeconds,
      animate: boolean): void {
    TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
        TraceEngine.Helpers.Timing.traceWindowFromMilliSeconds(
            TraceEngine.Types.Timing.MilliSeconds(windowStartTime),
            TraceEngine.Types.Timing.MilliSeconds(windowEndTime),
            ),
        {shouldAnimate: animate},
    );
  }

  /**
   * @param startTime - the start time of the selection in MilliSeconds
   * @param endTime - the end time of the selection in MilliSeconds
   * TODO(crbug.com/346312365): update the type definitions in ChartViewport.ts
   */
  updateRangeSelection(startTime: number, endTime: number): void {
    this.delegate.select(TimelineSelection.fromRange(startTime, endTime));
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_ANNOTATIONS_OVERLAYS)) {
      const bounds = TraceEngine.Helpers.Timing.traceWindowFromMilliSeconds(
          TraceEngine.Types.Timing.MilliSeconds(startTime),
          TraceEngine.Types.Timing.MilliSeconds(endTime),
      );

      if (this.#timeRangeSelectionOverlay) {
        this.updateExistingOverlay(this.#timeRangeSelectionOverlay, {
          bounds,
        });
      } else {
        this.#timeRangeSelectionOverlay = this.addOverlay({
          type: 'TIME_RANGE',
          label: '',
          showDuration: true,
          bounds,
        });
      }
    }
  }

  getMainFlameChart(): PerfUI.FlameChart.FlameChart {
    return this.mainFlameChart;
  }

  // This function is public for test purpose.
  getNetworkFlameChart(): PerfUI.FlameChart.FlameChart {
    return this.networkFlameChart;
  }

  updateSelectedGroup(flameChart: PerfUI.FlameChart.FlameChart, group: PerfUI.FlameChart.Group|null): void {
    if (flameChart !== this.mainFlameChart || this.#selectedGroupName === group?.name) {
      return;
    }
    this.#selectedGroupName = group?.name || null;
    this.#selectedEvents = group ? this.mainDataProvider.groupTreeEvents(group) : null;
    this.#updateDetailViews();
  }

  setModel(newTraceEngineData: TraceEngine.Handlers.Types.TraceParseData|null, isCpuProfile = false): void {
    if (newTraceEngineData === this.#traceEngineData) {
      return;
    }
    this.#selectedGroupName = null;
    this.#traceEngineData = newTraceEngineData;
    Common.EventTarget.removeEventListeners(this.eventListeners);
    this.#selectedEvents = null;
    this.mainDataProvider.setModel(newTraceEngineData, isCpuProfile);
    this.networkDataProvider.setModel(newTraceEngineData);
    this.#reset();
    this.updateSearchResults(false, false);
    this.refreshMainFlameChart();
    this.#updateFlameCharts();
  }

  setInsights(insights: TraceEngine.Insights.Types.TraceInsightData|null): void {
    if (this.#traceInsightsData !== insights) {
      this.#traceInsightsData = insights;
    }
  }

  #reset(): void {
    if (this.networkDataProvider.isEmpty()) {
      this.mainFlameChart.enableRuler(true);
      this.networkSplitWidget.hideSidebar();
    } else {
      this.mainFlameChart.enableRuler(false);
      this.networkSplitWidget.showBoth();
      this.resizeToPreferredHeights();
    }
    this.#overlays.reset();
    this.mainFlameChart.reset();
    this.networkFlameChart.reset();
    this.updateSearchResults(false, false);

    const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      throw new Error('TimelineFlameChartView could not set the window bounds.');
    }
    const visibleWindow = traceBoundsState.milli.timelineTraceWindow;
    this.mainFlameChart.setWindowTimes(visibleWindow.min, visibleWindow.max);
    this.networkDataProvider.setWindowTimes(visibleWindow.min, visibleWindow.max);
    this.networkFlameChart.setWindowTimes(visibleWindow.min, visibleWindow.max);
  }

  #refreshAfterIgnoreList(): void {
    // The ignore list will only affect Thread tracks, which will only be in main flame chart.
    // So just force recalculate and redraw the main flame chart here.
    this.mainDataProvider.timelineData(true);
    this.mainFlameChart.scheduleUpdate();
  }

  #updateDetailViews(): void {
    this.countersView.setModel(this.#traceEngineData, this.#selectedEvents);
    void this.detailsView.setModel(this.#traceEngineData, this.#selectedEvents);
  }

  #updateFlameCharts(): void {
    this.mainFlameChart.scheduleUpdate();
    this.networkFlameChart.scheduleUpdate();

    this.#registerLoggableGroups();
  }

  #registerLoggableGroups(): void {
    const groups = [
      ...this.mainFlameChart.timelineData()?.groups ?? [],
      ...this.networkFlameChart.timelineData()?.groups ?? [],
    ];
    for (const group of groups) {
      if (!group.jslogContext) {
        continue;
      }
      const loggable = this.#loggableForGroupByLogContext.get(group.jslogContext) ?? Symbol(group.jslogContext);

      if (!this.#loggableForGroupByLogContext.has(group.jslogContext)) {
        // This is the first time this group has been created, so register its loggable.
        this.#loggableForGroupByLogContext.set(group.jslogContext, loggable);
        VisualLogging.registerLoggable(
            loggable, `${VisualLogging.section().context(`timeline.${group.jslogContext}`)}`, this.delegate.element);
      }
    }
  }

  private onEntryHighlighted(commonEvent: Common.EventTarget.EventTargetEvent<number>): void {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    const entryIndex = commonEvent.data;
    const event = this.mainDataProvider.eventByIndex(entryIndex);
    if (!event || !this.#traceEngineData) {
      return;
    }
    if (event instanceof TraceEngine.Handlers.ModelHandlers.Frames.TimelineFrame) {
      return;
    }

    const target = targetForEvent(this.#traceEngineData, event);
    if (!target) {
      return;
    }

    const nodeIds = TraceEngine.Extras.FetchNodes.nodeIdsForEvent(this.#traceEngineData, event);
    for (const nodeId of nodeIds) {
      new SDK.DOMModel.DeferredDOMNode(target, nodeId).highlight();
    }
  }

  highlightEvent(event: TraceEngine.Types.TraceEvents.TraceEventData|null): void {
    const entryIndex =
        event ? this.mainDataProvider.entryIndexForSelection(TimelineSelection.fromTraceEvent(event)) : -1;
    if (entryIndex >= 0) {
      this.mainFlameChart.highlightEntry(entryIndex);
    } else {
      this.mainFlameChart.hideHighlight();
    }
  }

  override willHide(): void {
    this.networkFlameChartGroupExpansionSetting.removeChangeListener(this.resizeToPreferredHeights, this);
    Bindings.IgnoreListManager.IgnoreListManager.instance().removeChangeListener(this.#boundRefreshAfterIgnoreList);
  }

  override wasShown(): void {
    this.registerCSSFiles([timelineFlameChartViewStyles]);
    this.networkFlameChartGroupExpansionSetting.addChangeListener(this.resizeToPreferredHeights, this);
    Bindings.IgnoreListManager.IgnoreListManager.instance().addChangeListener(this.#boundRefreshAfterIgnoreList);
    if (this.needsResizeToPreferredHeights) {
      this.resizeToPreferredHeights();
    }
    this.#updateFlameCharts();
  }

  updateCountersGraphToggle(showMemoryGraph: boolean): void {
    if (showMemoryGraph) {
      this.chartSplitWidget.showBoth();
    } else {
      this.chartSplitWidget.hideSidebar();
    }
  }

  setSelection(selection: TimelineSelection|null): void {
    const mainIndex = this.mainDataProvider.entryIndexForSelection(selection);
    const networkIndex = this.networkDataProvider.entryIndexForSelection(selection);
    this.mainFlameChart.setSelectedEntry(mainIndex);
    this.networkFlameChart.setSelectedEntry(networkIndex);

    // Clear any existing entry selection.
    this.#overlays.removeOverlaysOfType('ENTRY_SELECTED');
    // If:
    // 1. There is no selection, or the selection is not a range selection
    // AND 2. we have an active time range selection overlay
    // then we need to remove it.
    if ((selection === null || !TimelineSelection.isRangeSelection(selection.object)) &&
        this.#timeRangeSelectionOverlay) {
      this.#overlays.remove(this.#timeRangeSelectionOverlay);
      this.#timeRangeSelectionOverlay = null;
    }

    let index = this.mainDataProvider.entryIndexForSelection(selection);
    this.mainFlameChart.setSelectedEntry(index);
    index = this.networkDataProvider.entryIndexForSelection(selection);
    this.networkFlameChart.setSelectedEntry(index);
    if (this.detailsView) {
      // TODO(crbug.com/1459265):  Change to await after migration work.
      void this.detailsView.setSelection(selection);
    }

    // Create the entry selected overlay if the selection represents a frame or trace event (either network, or anything else)
    if (selection &&
        (TimelineSelection.isTraceEventSelection(selection.object) ||
         TimelineSelection.isSyntheticNetworkRequestDetailsEventSelection(selection.object) ||
         TimelineSelection.isFrameObject(selection.object))) {
      this.addOverlay({
        type: 'ENTRY_SELECTED',
        entry: selection.object,
      });
    }
  }

  addOverlay<T extends Overlays.Overlays.TimelineOverlay>(newOverlay: T): T {
    const overlay = this.#overlays.add(newOverlay);
    this.#overlays.update();
    return overlay;
  }

  removeOverlay(removedOverlay: Overlays.Overlays.TimelineOverlay): void {
    this.#overlays.remove(removedOverlay);
    this.#overlays.update();
  }

  updateExistingOverlay<T extends Overlays.Overlays.TimelineOverlay>(existingOverlay: T, newData: Partial<T>): void {
    this.#overlays.updateExisting(existingOverlay, newData);
    this.#overlays.update();
  }

  private onAnnotateEntry(
      dataProvider: TimelineFlameChartDataProvider|TimelineFlameChartNetworkDataProvider,
      event: Common.EventTarget.EventTargetEvent<number>): void {
    const selection = dataProvider.createSelection(event.data);
    if (selection &&
        (TimelineSelection.isTraceEventSelection(selection.object) ||
         TimelineSelection.isSyntheticNetworkRequestDetailsEventSelection(selection.object))) {
      this.setSelection(selection);
      ModificationsManager.activeManager()?.createAnnotation({
        type: 'ENTRY_LABEL',
        entry: selection.object,
        label: '',
      });
    }
  }

  private onEntrySelected(
      dataProvider: TimelineFlameChartDataProvider|TimelineFlameChartNetworkDataProvider,
      event: Common.EventTarget.EventTargetEvent<number>): void {
    const data = dataProvider.timelineData();
    if (!data) {
      return;
    }
    const entryIndex = event.data;

    const entryLevel = data.entryLevels[entryIndex];

    // Find the group that contains this level and log a click for it.
    const group = groupForLevel(data.groups, entryLevel);
    if (group && group.jslogContext) {
      const loggable = this.#loggableForGroupByLogContext.get(group.jslogContext) ?? null;
      if (loggable) {
        VisualLogging.logClick(loggable, new MouseEvent('click'));
      }
    }

    dataProvider.buildFlowForInitiator(entryIndex);
    this.delegate.select(dataProvider.createSelection(entryIndex));
  }

  resizeToPreferredHeights(): void {
    if (!this.isShowing()) {
      this.needsResizeToPreferredHeights = true;
      return;
    }
    this.needsResizeToPreferredHeights = false;
    this.networkPane.element.classList.toggle(
        'timeline-network-resizer-disabled', !this.networkDataProvider.isExpanded());
    this.networkSplitWidget.setSidebarSize(
        this.networkDataProvider.preferredHeight() + this.splitResizer.clientHeight + PerfUI.FlameChart.RulerHeight +
        2);
  }

  setSearchableView(searchableView: UI.SearchableView.SearchableView): void {
    this.searchableView = searchableView;
  }

  // UI.SearchableView.Searchable implementation

  jumpToNextSearchResult(): void {
    if (!this.searchResults || !this.searchResults.length) {
      return;
    }
    const index =
        typeof this.selectedSearchResult !== 'undefined' ? this.searchResults.indexOf(this.selectedSearchResult) : -1;
    this.selectSearchResult(Platform.NumberUtilities.mod(index + 1, this.searchResults.length));
  }

  jumpToPreviousSearchResult(): void {
    if (!this.searchResults || !this.searchResults.length) {
      return;
    }
    const index =
        typeof this.selectedSearchResult !== 'undefined' ? this.searchResults.indexOf(this.selectedSearchResult) : 0;
    this.selectSearchResult(Platform.NumberUtilities.mod(index - 1, this.searchResults.length));
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return true;
  }

  private selectSearchResult(index: number): void {
    this.searchableView.updateCurrentMatchIndex(index);
    if (this.searchResults) {
      this.selectedSearchResult = this.searchResults[index];
      this.delegate.select(this.mainDataProvider.createSelection(this.selectedSearchResult));
      this.mainFlameChart.showPopoverForSearchResult(this.selectedSearchResult);
    }
  }

  private updateSearchResults(shouldJump: boolean, jumpBackwards?: boolean): void {
    const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }

    const oldSelectedSearchResult = (this.selectedSearchResult as number);
    delete this.selectedSearchResult;
    this.searchResults = [];
    this.mainFlameChart.removeSearchResultHighlights();
    if (!this.searchRegex) {
      return;
    }
    const regExpFilter = new TimelineRegExp(this.searchRegex);
    const visibleWindow = traceBoundsState.milli.timelineTraceWindow;
    this.searchResults = this.mainDataProvider.search(visibleWindow.min, visibleWindow.max, regExpFilter);
    this.searchableView.updateSearchMatchesCount(this.searchResults.length);
    // To avoid too many highlights when the search regex matches too many entries,
    // for example, when user only types in "e" as the search query,
    // We only highlight the search results when the number of matches is less than or equal to 200.
    if (this.searchResults.length <= MAX_HIGHLIGHTED_SEARCH_ELEMENTS) {
      this.mainFlameChart.highlightAllEntries(this.searchResults);
    }
    if (!shouldJump || !this.searchResults.length) {
      return;
    }
    let selectedIndex = this.searchResults.indexOf(oldSelectedSearchResult);
    if (selectedIndex === -1) {
      selectedIndex = jumpBackwards ? this.searchResults.length - 1 : 0;
    }
    this.selectSearchResult(selectedIndex);
  }

  /**
   * Returns the indexes of the elements that matched the most recent
   * query. Elements are indexed by the data provider and correspond
   * to their position in the data provider entry data array.
   * Public only for tests.
   */
  getSearchResults(): number[]|undefined {
    return this.searchResults;
  }

  onSearchCanceled(): void {
    if (typeof this.selectedSearchResult !== 'undefined') {
      this.delegate.select(null);
    }
    delete this.searchResults;
    delete this.selectedSearchResult;
    delete this.searchRegex;
    this.mainFlameChart.showPopoverForSearchResult(-1);
    this.mainFlameChart.removeSearchResultHighlights();
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    this.searchRegex = searchConfig.toSearchRegex().regex;
    this.updateSearchResults(shouldJump, jumpBackwards);
  }
}

export class Selection {
  timelineSelection: TimelineSelection;
  entryIndex: number;
  constructor(selection: TimelineSelection, entryIndex: number) {
    this.timelineSelection = selection;
    this.entryIndex = entryIndex;
  }
}

export const FlameChartStyle = {
  textColor: '#333',
};

export class TimelineFlameChartMarker implements PerfUI.FlameChart.FlameChartMarker {
  private readonly startTimeInternal: number;
  private readonly startOffset: number;
  private style: TimelineMarkerStyle;
  constructor(startTime: number, startOffset: number, style: TimelineMarkerStyle) {
    this.startTimeInternal = startTime;
    this.startOffset = startOffset;
    this.style = style;
  }

  startTime(): number {
    return this.startTimeInternal;
  }

  color(): string {
    return this.style.color;
  }

  title(): string|null {
    if (this.style.lowPriority) {
      return null;
    }
    const startTime = i18n.TimeUtilities.millisToString(this.startOffset);
    return i18nString(UIStrings.sAtS, {PH1: this.style.title, PH2: startTime});
  }

  draw(context: CanvasRenderingContext2D, x: number, height: number, pixelsPerMillisecond: number): void {
    const lowPriorityVisibilityThresholdInPixelsPerMs = 4;

    if (this.style.lowPriority && pixelsPerMillisecond < lowPriorityVisibilityThresholdInPixelsPerMs) {
      return;
    }

    context.save();
    if (this.style.tall) {
      context.strokeStyle = this.style.color;
      context.lineWidth = this.style.lineWidth;
      context.translate(this.style.lineWidth < 1 || (this.style.lineWidth & 1) ? 0.5 : 0, 0.5);
      context.beginPath();
      context.moveTo(x, 0);
      context.setLineDash(this.style.dashStyle);
      context.lineTo(x, context.canvas.height);
      context.stroke();
    }
    context.restore();
  }
}

export const enum ColorBy {
  URL = 'URL',
}

/**
 * Find the Group that contains the provided level, or `null` if no group is
 * found.
 */
export function groupForLevel(groups: PerfUI.FlameChart.Group[], level: number): PerfUI.FlameChart.Group|null {
  const groupForLevel = groups.find((group, groupIndex) => {
    const nextGroup = groups.at(groupIndex + 1);
    const groupEndLevel = nextGroup ? nextGroup.startLevel - 1 : Infinity;

    return group.startLevel <= level && groupEndLevel >= level;
  });
  return groupForLevel ?? null;
}
