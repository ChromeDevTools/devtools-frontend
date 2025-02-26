// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as TimelineComponents from './components/components.js';
import {EventsTimelineTreeView} from './EventsTimelineTreeView.js';
import {Tracker} from './FreshRecording.js';
import {targetForEvent} from './TargetForEvent.js';
import {ThirdPartyTreeViewWidget} from './ThirdPartyTreeView.js';
import {TimelineLayersView} from './TimelineLayersView.js';
import {TimelinePaintProfilerView} from './TimelinePaintProfilerView.js';
import type {TimelineModeViewDelegate} from './TimelinePanel.js';
import {
  selectionFromRangeMilliSeconds,
  selectionIsEvent,
  selectionIsRange,
  type TimelineSelection,
} from './TimelineSelection.js';
import {TimelineSelectorStatsView} from './TimelineSelectorStatsView.js';
import {
  AggregatedTimelineTreeView,
  BottomUpTimelineTreeView,
  CallTreeTimelineTreeView,
  TimelineStackView,
  TimelineTreeView
} from './TimelineTreeView.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';
import {TracingFrameLayerTree} from './TracingLayerTree.js';
import * as Utils from './utils/utils.js';

const UIStrings = {
  /**
   *@description Text for the summary view
   */
  summary: 'Summary',
  /**
   *@description Text in Timeline Details View of the Performance panel
   */
  bottomup: 'Bottom-up',
  /**
   *@description Text in Timeline Details View of the Performance panel
   */
  callTree: 'Call tree',
  /**
   *@description Text in Timeline Details View of the Performance panel
   */
  eventLog: 'Event log',
  /**
   *@description Title of the paint profiler, old name of the performance pane
   */
  paintProfiler: 'Paint profiler',
  /**
   *@description Title of the Layers tool
   */
  layers: 'Layers',
  /**
   *@description Title of the selector stats tab
   */
  selectorStats: 'Selector stats',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineDetailsPane extends
    Common.ObjectWrapper.eventMixin<TimelineTreeView.EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox) {
  private readonly detailsLinkifier: Components.Linkifier.Linkifier;
  private tabbedPane: UI.TabbedPane.TabbedPane;
  private readonly defaultDetailsWidget: UI.Widget.VBox;
  private defaultDetailsContentWidget: UI.Widget.VBox;
  private rangeDetailViews: Map<string, TimelineTreeView>;
  #selectedEvents?: Trace.Types.Events.Event[]|null;
  private lazyPaintProfilerView?: TimelinePaintProfilerView|null;
  private lazyLayersView?: TimelineLayersView|null;
  private preferredTabId?: string;
  private selection?: TimelineSelection|null;
  private updateContentsScheduled: boolean;
  private lazySelectorStatsView: TimelineSelectorStatsView|null;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  #traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null = null;

  #eventToRelatedInsightsMap: TimelineComponents.RelatedInsightChips.EventToRelatedInsightsMap|null = null;
  #filmStrip: Trace.Extras.FilmStrip.Data|null = null;
  #networkRequestDetails: TimelineComponents.NetworkRequestDetails.NetworkRequestDetails;
  #layoutShiftDetails: TimelineComponents.LayoutShiftDetails.LayoutShiftDetails;
  #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
  #relatedInsightChips = new TimelineComponents.RelatedInsightChips.RelatedInsightChips();
  #thirdPartyTree = new ThirdPartyTreeViewWidget();
  #entityMapper: Utils.EntityMapper.EntityMapper|null = null;

  constructor(delegate: TimelineModeViewDelegate) {
    super();
    this.element.classList.add('timeline-details');

    this.detailsLinkifier = new Components.Linkifier.Linkifier();

    this.tabbedPane = new UI.TabbedPane.TabbedPane();
    this.tabbedPane.show(this.element);
    this.tabbedPane.headerElement().setAttribute(
        'jslog',
        `${VisualLogging.toolbar('sidebar').track({keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space'})}`);

    this.defaultDetailsWidget = new UI.Widget.VBox();
    this.defaultDetailsWidget.element.classList.add('timeline-details-view');
    this.defaultDetailsWidget.element.setAttribute('jslog', `${VisualLogging.pane('details').track({resize: true})}`);
    this.defaultDetailsContentWidget = this.#createContentWidget();
    this.appendTab(Tab.Details, i18nString(UIStrings.summary), this.defaultDetailsWidget);
    this.setPreferredTab(Tab.Details);

    this.rangeDetailViews = new Map();
    this.updateContentsScheduled = false;

    const bottomUpView = new BottomUpTimelineTreeView();
    this.appendTab(Tab.BottomUp, i18nString(UIStrings.bottomup), bottomUpView);
    this.rangeDetailViews.set(Tab.BottomUp, bottomUpView);

    const callTreeView = new CallTreeTimelineTreeView();
    this.appendTab(Tab.CallTree, i18nString(UIStrings.callTree), callTreeView);
    this.rangeDetailViews.set(Tab.CallTree, callTreeView);

    const eventsView = new EventsTimelineTreeView(delegate);
    this.appendTab(Tab.EventLog, i18nString(UIStrings.eventLog), eventsView);
    this.rangeDetailViews.set(Tab.EventLog, eventsView);

    // Listeners for hover dimming
    this.rangeDetailViews.values().forEach(view => {
      view.addEventListener(
          TimelineTreeView.Events.TREE_ROW_HOVERED,
          node => this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_HOVERED, node.data));

      // If there's a heaviest stack sidebar view, also listen to hover within it.
      if (view instanceof AggregatedTimelineTreeView) {
        view.stackView.addEventListener(
            TimelineStackView.Events.TREE_ROW_HOVERED,
            node => this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_HOVERED, node.data));
      }
    });
    this.#thirdPartyTree.addEventListener(TimelineTreeView.Events.TREE_ROW_HOVERED, node => {
      // Redispatch through 3P event to get 3P dimmer.
      this.dispatchEventToListeners(TimelineTreeView.Events.THIRD_PARTY_ROW_HOVERED, node.data);
    });

    this.#thirdPartyTree.addEventListener(TimelineTreeView.Events.BOTTOM_UP_BUTTON_CLICKED, node => {
      this.selectTab(Tab.BottomUp, node.data, AggregatedTimelineTreeView.GroupBy.ThirdParties);
    });

    this.#networkRequestDetails =
        new TimelineComponents.NetworkRequestDetails.NetworkRequestDetails(this.detailsLinkifier);

    this.#layoutShiftDetails = new TimelineComponents.LayoutShiftDetails.LayoutShiftDetails();

    this.tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this.tabSelected, this);

    TraceBounds.TraceBounds.onChange(this.#onTraceBoundsChangeBound);

    this.lazySelectorStatsView = null;
  }

  /**
   * This selects a given tabbedPane tab.
   * Additionally, if provided a node, we open that node and
   * if a groupBySetting is included, we groupBy.
   */
  selectTab(tabName: Tab, node: Trace.Extras.TraceTree.Node|null, groupBySetting?: AggregatedTimelineTreeView.GroupBy):
      void {
    this.tabbedPane.selectTab(tabName, true, true);
    /**
     * For a11y, ensure that the header is focused.
     */
    this.tabbedPane.focusSelectedTabHeader();

    // We currently only support selecting Details and BottomUp via the 3P insight.
    switch (tabName) {
      case Tab.CallTree:
      case Tab.EventLog:
      case Tab.PaintProfiler:
      case Tab.LayerViewer:
      case Tab.SelectorStats: {
        break;
      }
      case Tab.Details: {
        this.updateContentsFromWindow();
        break;
      }
      case Tab.BottomUp: {
        if (!(this.tabbedPane.visibleView instanceof BottomUpTimelineTreeView)) {
          return;
        }
        // Set grouping if necessary.
        const bottomUp = this.tabbedPane.visibleView;
        if (groupBySetting) {
          bottomUp.setGroupBySetting(groupBySetting);
          bottomUp.refreshTree();
        }

        if (!node) {
          return;
        }

        // Look for the matching node in the bottom up tree using selected node event data.
        const treeNode = bottomUp.eventToTreeNode.get(node.event);
        if (!treeNode) {
          return;
        }
        bottomUp.selectProfileNode(treeNode, true);
        // Reveal/expand the bottom up tree grid node.
        const gridNode = bottomUp.dataGridNodeForTreeNode(treeNode);
        if (gridNode) {
          gridNode.expand();
        }
        break;
      }
      default: {
        Platform.assertNever(tabName, `Unknown Tab: ${tabName}. Add new case to switch.`);
      }
    }
  }

  #createContentWidget(): UI.Widget.VBox {
    const defaultDetailsContentWidget = new UI.Widget.VBox();
    defaultDetailsContentWidget.element.classList.add('timeline-details-view-body');
    defaultDetailsContentWidget.show(this.defaultDetailsWidget.element);
    return defaultDetailsContentWidget;
  }

  private selectorStatsView(): TimelineSelectorStatsView {
    if (this.lazySelectorStatsView) {
      return this.lazySelectorStatsView;
    }

    this.lazySelectorStatsView = new TimelineSelectorStatsView(
        this.#parsedTrace,
    );
    return this.lazySelectorStatsView;
  }

  getDetailsContentElementForTest(): HTMLElement {
    return this.defaultDetailsContentWidget.element;
  }

  revealEventInTreeView(event: Trace.Types.Events.Event|null): void {
    if (this.tabbedPane.visibleView instanceof TimelineTreeView) {
      this.tabbedPane.visibleView.highlightEventInTree(event);
    }
  }

  async #onTraceBoundsChange(event: TraceBounds.TraceBounds.StateChangedEvent): Promise<void> {
    if (event.updateType === 'MINIMAP_BOUNDS') {
      // If new minimap bounds are set, we might need to update the selected entry summary because
      // the links to other entries (ex. initiator) might be outside of the new breadcrumb.
      if (this.selection) {
        await this.setSelection(this.selection);
      }
    }

    if (event.updateType === 'RESET' || event.updateType === 'VISIBLE_WINDOW') {
      // If the update type was a changing of the minimap bounds, we do not
      // need to redraw.
      if (!this.selection) {
        this.scheduleUpdateContentsFromWindow();
      }
    }
  }

  async setModel(data: {
    parsedTrace: Trace.Handlers.Types.ParsedTrace|null,
    selectedEvents: Trace.Types.Events.Event[]|null,
    traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null,
    eventToRelatedInsightsMap: TimelineComponents.RelatedInsightChips.EventToRelatedInsightsMap|null,
    entityMapper: Utils.EntityMapper.EntityMapper|null,
  }): Promise<void> {
    if (this.#parsedTrace !== data.parsedTrace) {
      // Clear the selector stats view, so the next time the user views it we
      // reconstruct it with the new trace data.
      this.lazySelectorStatsView = null;

      this.#parsedTrace = data.parsedTrace;
    }
    if (data.parsedTrace) {
      this.#filmStrip = Trace.Extras.FilmStrip.fromParsedTrace(data.parsedTrace);
      this.#entityMapper = new Utils.EntityMapper.EntityMapper(data.parsedTrace);
    }
    this.#selectedEvents = data.selectedEvents;
    this.#traceInsightsSets = data.traceInsightsSets;
    this.#eventToRelatedInsightsMap = data.eventToRelatedInsightsMap;
    if (data.eventToRelatedInsightsMap) {
      this.#relatedInsightChips.eventToRelatedInsightsMap = data.eventToRelatedInsightsMap;
    }
    this.tabbedPane.closeTabs([Tab.PaintProfiler, Tab.LayerViewer], false);
    for (const view of this.rangeDetailViews.values()) {
      view.setModelWithEvents(data.selectedEvents, data.parsedTrace, data.entityMapper);
    }
    // Set the 3p tree model.
    this.#thirdPartyTree.setModelWithEvents(data.selectedEvents, data.parsedTrace, data.entityMapper);
    this.lazyPaintProfilerView = null;
    this.lazyLayersView = null;
    await this.setSelection(null);
  }

  private setSummaryContent(node: Node): void {
    const allTabs = this.tabbedPane.otherTabs(Tab.Details);
    for (let i = 0; i < allTabs.length; ++i) {
      if (!this.rangeDetailViews.has(allTabs[i])) {
        this.tabbedPane.closeTab(allTabs[i]);
      }
    }
    this.defaultDetailsContentWidget.detach();
    this.defaultDetailsContentWidget = this.#createContentWidget();
    this.defaultDetailsContentWidget.contentElement.append(node);
    if (this.#relatedInsightChips) {
      this.defaultDetailsContentWidget.contentElement.appendChild(this.#relatedInsightChips);
    }
  }

  private updateContents(): void {
    const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }
    const visibleWindow = traceBoundsState.milli.timelineTraceWindow;
    // Update the view that we currently have selected.
    const view = this.rangeDetailViews.get(this.tabbedPane.selectedTabId || '');
    if (view) {
      view.updateContents(this.selection || selectionFromRangeMilliSeconds(visibleWindow.min, visibleWindow.max));
    } else {
      // If no view, we must be in the summary tab, update the 3p tree.
      this.#thirdPartyTree.updateContents(
          this.selection || selectionFromRangeMilliSeconds(visibleWindow.min, visibleWindow.max));
    }
  }

  private appendTab(id: string, tabTitle: string, view: UI.Widget.Widget, isCloseable?: boolean): void {
    this.tabbedPane.appendTab(id, tabTitle, view, undefined, undefined, isCloseable);
    if (this.preferredTabId !== this.tabbedPane.selectedTabId) {
      this.tabbedPane.selectTab(id);
    }
  }

  headerElement(): Element {
    return this.tabbedPane.headerElement();
  }

  setPreferredTab(tabId: string): void {
    this.preferredTabId = tabId;
  }

  /**
   * This forces a recalculation and rerendering of the timings
   * breakdown of a track.
   * User actions like zooming or scrolling can trigger many updates in
   * short time windows, so we debounce the calls in those cases. Single
   * sporadic calls (like selecting a new track) don't need to be
   * debounced. The forceImmediateUpdate param configures the debouncing
   * behaviour.
   */
  private scheduleUpdateContentsFromWindow(forceImmediateUpdate = false): void {
    if (!this.#parsedTrace) {
      this.setSummaryContent(UI.Fragment.html`<div/>`);
      return;
    }
    if (forceImmediateUpdate) {
      this.updateContentsFromWindow();
      return;
    }

    // Debounce this update as it's not critical.
    if (!this.updateContentsScheduled) {
      this.updateContentsScheduled = true;
      setTimeout(() => {
        this.updateContentsScheduled = false;
        this.updateContentsFromWindow();
      }, 100);
    }
  }

  private updateContentsFromWindow(): void {
    const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }
    const visibleWindow = traceBoundsState.milli.timelineTraceWindow;
    this.updateSelectedRangeStats(visibleWindow.min, visibleWindow.max);
    this.updateContents();
  }

  #getFilmStripFrame(frame: Trace.Types.Events.LegacyTimelineFrame): Trace.Extras.FilmStrip.Frame|null {
    if (!this.#filmStrip) {
      return null;
    }
    const screenshotTime = (frame.idle ? frame.startTime : frame.endTime);
    const filmStripFrame = Trace.Extras.FilmStrip.frameClosestToTimestamp(this.#filmStrip, screenshotTime);
    if (!filmStripFrame) {
      return null;
    }
    const frameTimeMilliSeconds = Trace.Helpers.Timing.microToMilli(filmStripFrame.screenshotEvent.ts);
    return frameTimeMilliSeconds - frame.endTime < 10 ? filmStripFrame : null;
  }

  #setSelectionForTimelineFrame(frame: Trace.Types.Events.LegacyTimelineFrame): void {
    const matchedFilmStripFrame = this.#getFilmStripFrame(frame);
    this.setSummaryContent(
        TimelineUIUtils.generateDetailsContentForFrame(frame, this.#filmStrip, matchedFilmStripFrame));
    const target = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (frame.layerTree && target) {
      const layerTreeForFrame = new TracingFrameLayerTree(target, frame.layerTree);
      const layersView = this.layersView();
      layersView.showLayerTree(layerTreeForFrame);
      if (!this.tabbedPane.hasTab(Tab.LayerViewer)) {
        this.appendTab(Tab.LayerViewer, i18nString(UIStrings.layers), layersView);
      }
    }
  }

  async #setSelectionForNetworkEvent(networkRequest: Trace.Types.Events.SyntheticNetworkRequest): Promise<void> {
    if (!this.#parsedTrace) {
      return;
    }
    const maybeTarget = targetForEvent(this.#parsedTrace, networkRequest);
    await this.#networkRequestDetails.setData(this.#parsedTrace, networkRequest, maybeTarget, this.#entityMapper);
    this.#relatedInsightChips.activeEvent = networkRequest;
    if (this.#eventToRelatedInsightsMap) {
      this.#relatedInsightChips.eventToRelatedInsightsMap = this.#eventToRelatedInsightsMap;
    }

    this.setSummaryContent(this.#networkRequestDetails);
  }

  async #setSelectionForTraceEvent(event: Trace.Types.Events.Event): Promise<void> {
    if (!this.#parsedTrace) {
      return;
    }

    this.#relatedInsightChips.activeEvent = event;
    if (this.#eventToRelatedInsightsMap) {
      this.#relatedInsightChips.eventToRelatedInsightsMap = this.#eventToRelatedInsightsMap;
    }

    // Special case: if the user selects a layout shift or a layout shift cluster,
    // render the new layout shift details component.
    if (Trace.Types.Events.isSyntheticLayoutShift(event) || Trace.Types.Events.isSyntheticLayoutShiftCluster(event)) {
      const isFreshRecording = Boolean(this.#parsedTrace && Tracker.instance().recordingIsFresh(this.#parsedTrace));
      this.#layoutShiftDetails.setData(event, this.#traceInsightsSets, this.#parsedTrace, isFreshRecording);
      this.setSummaryContent(this.#layoutShiftDetails);
      return;
    }

    // Otherwise, build the generic trace event details UI.
    const traceEventDetails = await TimelineUIUtils.buildTraceEventDetails(
        this.#parsedTrace, event, this.detailsLinkifier, true, this.#entityMapper);
    this.appendDetailsTabsForTraceEventAndShowDetails(event, traceEventDetails);
  }

  async setSelection(selection: TimelineSelection|null): Promise<void> {
    if (!this.#parsedTrace) {
      // You can't make a selection if we have no trace data.
      return;
    }
    this.detailsLinkifier.reset();
    this.selection = selection;
    this.#relatedInsightChips.activeEvent = null;
    if (!this.selection) {
      // Update instantly using forceImmediateUpdate, since we are only
      // making a single call and don't need to debounce.
      this.scheduleUpdateContentsFromWindow(/* forceImmediateUpdate */ true);
      return;
    }

    if (selectionIsEvent(selection)) {
      if (Trace.Types.Events.isSyntheticNetworkRequest(selection.event)) {
        await this.#setSelectionForNetworkEvent(selection.event);
      } else if (Trace.Types.Events.isLegacyTimelineFrame(selection.event)) {
        this.#setSelectionForTimelineFrame(selection.event);
      } else {
        await this.#setSelectionForTraceEvent(selection.event);
      }
    } else if (selectionIsRange(selection)) {
      const timings = Trace.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds(selection.bounds);
      this.updateSelectedRangeStats(timings.min, timings.max);
    }

    this.updateContents();
  }

  private tabSelected(event: Common.EventTarget.EventTargetEvent<UI.TabbedPane.EventData>): void {
    if (!event.data.isUserGesture) {
      return;
    }
    this.setPreferredTab(event.data.tabId);
    this.updateContents();
  }

  private layersView(): TimelineLayersView {
    if (this.lazyLayersView) {
      return this.lazyLayersView;
    }
    this.lazyLayersView = new TimelineLayersView(this.showSnapshotInPaintProfiler.bind(this));
    return this.lazyLayersView;
  }

  private paintProfilerView(): TimelinePaintProfilerView|null {
    if (this.lazyPaintProfilerView) {
      return this.lazyPaintProfilerView;
    }
    if (!this.#parsedTrace) {
      return null;
    }
    this.lazyPaintProfilerView = new TimelinePaintProfilerView(this.#parsedTrace);
    return this.lazyPaintProfilerView;
  }

  private showSnapshotInPaintProfiler(snapshot: SDK.PaintProfiler.PaintProfilerSnapshot): void {
    const paintProfilerView = this.paintProfilerView();
    if (!paintProfilerView) {
      return;
    }
    paintProfilerView.setSnapshot(snapshot);
    if (!this.tabbedPane.hasTab(Tab.PaintProfiler)) {
      this.appendTab(Tab.PaintProfiler, i18nString(UIStrings.paintProfiler), paintProfilerView, true);
    }
    this.tabbedPane.selectTab(Tab.PaintProfiler, true);
  }

  private showSelectorStatsForIndividualEvent(event: Trace.Types.Events.UpdateLayoutTree): void {
    this.showAggregatedSelectorStats([event]);
  }

  private showAggregatedSelectorStats(events: Trace.Types.Events.UpdateLayoutTree[]): void {
    const selectorStatsView = this.selectorStatsView();

    selectorStatsView.setAggregatedEvents(events);

    if (!this.tabbedPane.hasTab(Tab.SelectorStats)) {
      this.appendTab(Tab.SelectorStats, i18nString(UIStrings.selectorStats), selectorStatsView);
    }
  }

  private appendDetailsTabsForTraceEventAndShowDetails(event: Trace.Types.Events.Event, content: Node): void {
    this.setSummaryContent(content);
    if (Trace.Types.Events.isPaint(event) || Trace.Types.Events.isRasterTask(event)) {
      this.showEventInPaintProfiler(event);
    }

    if (Trace.Types.Events.isUpdateLayoutTree(event)) {
      this.showSelectorStatsForIndividualEvent(event);
    }
  }

  private showEventInPaintProfiler(event: Trace.Types.Events.Event): void {
    const paintProfilerModel =
        SDK.TargetManager.TargetManager.instance().models(SDK.PaintProfiler.PaintProfilerModel)[0];
    if (!paintProfilerModel) {
      return;
    }
    const paintProfilerView = this.paintProfilerView();
    if (!paintProfilerView) {
      return;
    }
    const hasProfileData = paintProfilerView.setEvent(paintProfilerModel, event);
    if (!hasProfileData) {
      return;
    }
    if (this.tabbedPane.hasTab(Tab.PaintProfiler)) {
      return;
    }
    this.appendTab(Tab.PaintProfiler, i18nString(UIStrings.paintProfiler), paintProfilerView);
  }

  private updateSelectedRangeStats(startTime: Trace.Types.Timing.Milli, endTime: Trace.Types.Timing.Milli): void {
    if (!this.#selectedEvents || !this.#parsedTrace || !this.#entityMapper) {
      return;
    }

    const minBoundsMilli = Trace.Helpers.Timing.traceWindowMilliSeconds(this.#parsedTrace.Meta.traceBounds).min;
    const aggregatedStats = TimelineUIUtils.statsForTimeRange(this.#selectedEvents, startTime, endTime);
    const startOffset = startTime - minBoundsMilli;
    const endOffset = endTime - minBoundsMilli;
    const summaryDetailElem = TimelineUIUtils.generateSummaryDetails(
        aggregatedStats, startOffset, endOffset, this.#selectedEvents, this.#thirdPartyTree);

    this.setSummaryContent(summaryDetailElem);

    // Find all recalculate style events data from range
    const isSelectorStatsEnabled =
        Common.Settings.Settings.instance().createSetting('timeline-capture-selector-stats', false).get();
    if (this.#selectedEvents && isSelectorStatsEnabled) {
      const eventsInRange = Trace.Helpers.Trace.findUpdateLayoutTreeEvents(
          this.#selectedEvents,
          Trace.Helpers.Timing.milliToMicro(startTime),
          Trace.Helpers.Timing.milliToMicro(endTime),
      );
      if (eventsInRange.length > 0) {
        this.showAggregatedSelectorStats(eventsInRange);
      }
    }
  }
}

export enum Tab {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  Details = 'details',
  EventLog = 'event-log',
  CallTree = 'call-tree',
  BottomUp = 'bottom-up',
  PaintProfiler = 'paint-profiler',
  LayerViewer = 'layer-viewer',
  SelectorStats = 'selector-stats',
  /* eslint-enable @typescript-eslint/naming-convention */
}
