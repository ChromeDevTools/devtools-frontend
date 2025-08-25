// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as TimelineComponents from './components/components.js';
import {EventsTimelineTreeView} from './EventsTimelineTreeView.js';
import {targetForEvent} from './TargetForEvent.js';
import {ThirdPartyTreeViewWidget} from './ThirdPartyTreeView.js';
import detailsViewStyles from './timelineDetailsView.css.js';
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
   * @description Text for the summary view
   */
  summary: 'Summary',
  /**
   * @description Text in Timeline Details View of the Performance panel
   */
  bottomup: 'Bottom-up',
  /**
   * @description Text in Timeline Details View of the Performance panel
   */
  callTree: 'Call tree',
  /**
   * @description Text in Timeline Details View of the Performance panel
   */
  eventLog: 'Event log',
  /**
   * @description Title of the paint profiler, old name of the performance pane
   */
  paintProfiler: 'Paint profiler',
  /**
   * @description Title of the Layers tool
   */
  layers: 'Layers',
  /**
   * @description Title of the selector stats tab
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
  #summaryContent = new SummaryView();
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
  #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
  #thirdPartyTree = new ThirdPartyTreeViewWidget();
  #entityMapper: Utils.EntityMapper.EntityMapper|null = null;

  constructor(delegate: TimelineModeViewDelegate) {
    super();
    this.registerRequiredCSS(detailsViewStyles);
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
    this.#summaryContent.contentElement.classList.add('timeline-details-view-body');
    this.#summaryContent.show(this.defaultDetailsWidget.contentElement);
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

      view.addEventListener(TimelineTreeView.Events.TREE_ROW_CLICKED, node => {
        // Re-dispatch to reach the tree row dimmer.
        this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_CLICKED, node.data);
      });

      // If there's a heaviest stack sidebar view, also listen to hover within it.
      if (view instanceof AggregatedTimelineTreeView) {
        view.stackView.addEventListener(
            TimelineStackView.Events.TREE_ROW_HOVERED,
            node => this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_HOVERED, {node: node.data}));
      }
    });
    this.#thirdPartyTree.addEventListener(TimelineTreeView.Events.TREE_ROW_HOVERED, node => {
      // Re-dispatch through 3P event to get 3P dimmer.
      this.dispatchEventToListeners(
          TimelineTreeView.Events.TREE_ROW_HOVERED, {node: node.data.node, events: node.data.events ?? undefined});
    });

    this.#thirdPartyTree.addEventListener(TimelineTreeView.Events.BOTTOM_UP_BUTTON_CLICKED, node => {
      this.selectTab(Tab.BottomUp, node.data, AggregatedTimelineTreeView.GroupBy.ThirdParties);
    });
    this.#thirdPartyTree.addEventListener(TimelineTreeView.Events.TREE_ROW_CLICKED, node => {
      // Re-dispatch through 3P event to get 3P dimmer.
      this.dispatchEventToListeners(
          TimelineTreeView.Events.TREE_ROW_CLICKED, {node: node.data.node, events: node.data.events ?? undefined});
    });

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

        // Look for the equivalent GroupNode in the bottomUp tree using the node's reference `event`.
        // Conceivably, we could match using the group ID instead.
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
    return this.#summaryContent.contentElement;
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
      this.#summaryContent.filmStrip = Trace.Extras.FilmStrip.fromParsedTrace(data.parsedTrace);
      this.#entityMapper = new Utils.EntityMapper.EntityMapper(data.parsedTrace);
    }
    this.#selectedEvents = data.selectedEvents;
    this.#traceInsightsSets = data.traceInsightsSets;
    this.#eventToRelatedInsightsMap = data.eventToRelatedInsightsMap;
    this.#summaryContent.eventToRelatedInsightsMap = this.#eventToRelatedInsightsMap;
    this.#summaryContent.traceInsightsSets = this.#traceInsightsSets;
    this.#summaryContent.parsedTrace = this.#parsedTrace;
    this.#summaryContent.entityMapper = this.#entityMapper;
    this.tabbedPane.closeTabs([Tab.PaintProfiler, Tab.LayerViewer], false);
    for (const view of this.rangeDetailViews.values()) {
      view.setModelWithEvents(data.selectedEvents, data.parsedTrace, data.entityMapper);
    }
    // Set the 3p tree model.
    this.#thirdPartyTree.setModelWithEvents(data.selectedEvents, data.parsedTrace, data.entityMapper);
    this.#summaryContent.requestUpdate();
    this.lazyPaintProfilerView = null;
    this.lazyLayersView = null;
    await this.setSelection(null);
  }

  /**
   * Updates the UI shown in the Summary tab, and updates the UI to select the
   * summary tab.
   * @param node this is passed as an additional piece of DOM that will be
   *     rendered in the summary view. This is a temporary ability to allow
   *     incremental migration to the UI Eng vision.
   */
  private async updateSummaryAndSelectTab(node: Node|null): Promise<void> {
    const allTabs = this.tabbedPane.otherTabs(Tab.Details);
    for (let i = 0; i < allTabs.length; ++i) {
      if (!this.rangeDetailViews.has(allTabs[i])) {
        this.tabbedPane.closeTab(allTabs[i]);
      }
    }

    this.#summaryContent.node = node ?? null;
    this.#summaryContent.requestUpdate();
    await this.#summaryContent.updateComplete;
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
      void this.updateSummaryAndSelectTab(null);
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
        if (!this.updateContentsScheduled) {
          return;
        }
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

  #addLayerTreeForSelectedFrame(frame: Trace.Types.Events.LegacyTimelineFrame): void {
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

  async #setSelectionForTraceEvent(event: Trace.Types.Events.Event): Promise<void> {
    if (!this.#parsedTrace) {
      return;
    }

    this.#summaryContent.selectedEvent = event;
    this.#summaryContent.eventToRelatedInsightsMap = this.#eventToRelatedInsightsMap;
    this.#summaryContent.linkifier = this.detailsLinkifier;
    this.#summaryContent.target = targetForEvent(this.#parsedTrace, event);
    await this.updateSummaryAndSelectTab(null);
    this.appendExtraDetailsTabsForTraceEvent(event);
  }

  async setSelection(selection: TimelineSelection|null): Promise<void> {
    if (!this.#parsedTrace) {
      // You can't make a selection if we have no trace data.
      return;
    }
    this.detailsLinkifier.reset();
    this.selection = selection;
    if (!this.selection) {
      this.#summaryContent.selectedEvent = null;
      // Update instantly using forceImmediateUpdate, since we are only
      // making a single call and don't need to debounce.
      this.scheduleUpdateContentsFromWindow(/* forceImmediateUpdate */ true);
      return;
    }

    if (selectionIsEvent(selection)) {
      // Cancel any pending debounced range stats update
      this.updateContentsScheduled = false;

      if (Trace.Types.Events.isLegacyTimelineFrame(selection.event)) {
        this.#addLayerTreeForSelectedFrame(selection.event);
      }

      await this.#setSelectionForTraceEvent(selection.event);
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

  /**
   * When some events are selected, we show extra tabs. E.g. paint events get
   * the Paint Profiler, and layout events might get CSS Selector Stats if
   * they are available in the trace.
   */
  private appendExtraDetailsTabsForTraceEvent(event: Trace.Types.Events.Event): void {
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

    // This is a bit of a hack as we are midway through migrating this to
    // the new UI Eng vision.
    // The 3P tree view will only bother to update its DOM if it has a
    // parentElement, so we trigger the rendering of the summary content
    // (so the 3P Tree View is attached to the DOM) and then we tell it to
    // update.
    // This will be fixed once we migrate this component fully to the new vision (b/407751379)
    void this.updateSummaryAndSelectTab(summaryDetailElem).then(() => {
      this.#thirdPartyTree.updateContents(this.selection || selectionFromRangeMilliSeconds(startTime, endTime));
    });

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

interface SummaryViewInput {
  // This is a helper to allow an incremental migration to the new UI Eng vision.
  // Currently, this is used in two scenarios:
  // 1. When the user selects a TimelineFrame (screenshot).
  // 2. When no trace event is selected, and the user is looking at a range.
  // Both of these scenarios need to be updated to use the new UI Eng Vision,
  // and then we can remove the ability for this UI to take an arbitrary DOM
  // Node to render.
  node: Node|null;
  selectedEvent: Trace.Types.Events.Event|null;
  eventToRelatedInsightsMap: TimelineComponents.RelatedInsightChips.EventToRelatedInsightsMap|null;
  parsedTrace: Trace.Handlers.Types.ParsedTrace|null;
  traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null;
  entityMapper: Utils.EntityMapper.EntityMapper|null;
  target: SDK.Target.Target|null;
  linkifier: Components.Linkifier.Linkifier|null;
  filmStrip: Trace.Extras.FilmStrip.Data|null;
}

type View = (input: SummaryViewInput, output: object, target: HTMLElement) => void;
const SUMMARY_DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(
      html`
        <style>${detailsViewStyles}</style>
        ${input.node ?? nothing}
        ${Directives.until(renderSelectedEventDetails(input))}
        <devtools-widget data-related-insight-chips .widgetConfig=${
          UI.Widget.widgetConfig(TimelineComponents.RelatedInsightChips.RelatedInsightChips, {
            activeEvent: input.selectedEvent,
            eventToInsightsMap: input.eventToRelatedInsightsMap,
          })}></devtools-widget>
      `,
      target);
  // clang-format on
};

class SummaryView extends UI.Widget.Widget {
  #view: View;
  node: Node|null = null;
  selectedEvent: Trace.Types.Events.Event|null = null;
  eventToRelatedInsightsMap: TimelineComponents.RelatedInsightChips.EventToRelatedInsightsMap|null = null;
  parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null = null;
  entityMapper: Utils.EntityMapper.EntityMapper|null = null;
  target: SDK.Target.Target|null = null;
  linkifier: Components.Linkifier.Linkifier|null = null;
  filmStrip: Trace.Extras.FilmStrip.Data|null = null;

  constructor(element?: HTMLElement, view = SUMMARY_DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  override performUpdate(): void {
    this.#view(
        {
          node: this.node,
          selectedEvent: this.selectedEvent,
          eventToRelatedInsightsMap: this.eventToRelatedInsightsMap,
          parsedTrace: this.parsedTrace,
          traceInsightsSets: this.traceInsightsSets,
          entityMapper: this.entityMapper,
          target: this.target,
          linkifier: this.linkifier,
          filmStrip: this.filmStrip
        },
        {}, this.contentElement);
  }
}

async function renderSelectedEventDetails(
    input: SummaryViewInput,
    ): Promise<LitTemplate> {
  const {selectedEvent, parsedTrace, linkifier} = input;
  if (!selectedEvent || !parsedTrace || !linkifier) {
    return nothing;
  }
  const traceRecordingIsFresh =
      parsedTrace ? Utils.FreshRecording.Tracker.instance().recordingIsFresh(parsedTrace) : false;

  if (Trace.Types.Events.isSyntheticLayoutShift(selectedEvent) ||
      Trace.Types.Events.isSyntheticLayoutShiftCluster(selectedEvent)) {
    // clang-format off
    return html`
      <devtools-widget data-layout-shift-details .widgetConfig=${
        UI.Widget.widgetConfig(TimelineComponents.LayoutShiftDetails.LayoutShiftDetails, {
          event: selectedEvent,
          traceInsightsSets: input.traceInsightsSets,
          parsedTrace: input.parsedTrace,
          isFreshRecording: traceRecordingIsFresh,
        })}
      ></devtools-widget>`;
    // clang-format on
  }

  if (Trace.Types.Events.isSyntheticNetworkRequest(selectedEvent)) {
    // clang-format off
    return html`
      <devtools-widget data-network-request-details .widgetConfig=${
        UI.Widget.widgetConfig(TimelineComponents.NetworkRequestDetails.NetworkRequestDetails, {
          request: selectedEvent,
          entityMapper: input.entityMapper,
          target: input.target,
          linkifier: input.linkifier,
          parsedTrace: input.parsedTrace,
        })}
      ></devtools-widget>
    `;
    // clang-format on
  }

  if (Trace.Types.Events.isLegacyTimelineFrame(selectedEvent) && input.filmStrip) {
    const matchedFilmStripFrame = getFilmStripFrame(input.filmStrip, selectedEvent);
    const content =
        TimelineUIUtils.generateDetailsContentForFrame(selectedEvent, input.filmStrip, matchedFilmStripFrame);
    return html`${content}`;
  }

  // Fall back to the default trace event details. Long term this needs to use
  // the UI Eng Vision.
  const traceEventDetails =
      await TimelineUIUtils.buildTraceEventDetails(parsedTrace, selectedEvent, linkifier, true, input.entityMapper);
  return html`${traceEventDetails}`;
}

const filmStripFrameCache = new WeakMap<Trace.Types.Events.LegacyTimelineFrame, Trace.Extras.FilmStrip.Frame|null>();

function getFilmStripFrame(filmStrip: Trace.Extras.FilmStrip.Data, frame: Trace.Types.Events.LegacyTimelineFrame):
    Trace.Extras.FilmStrip.Frame|null {
  const fromCache = filmStripFrameCache.get(frame);
  if (typeof fromCache !== 'undefined') {
    return fromCache;
  }

  const screenshotTime = (frame.idle ? frame.startTime : frame.endTime);
  const filmStripFrame = Trace.Extras.FilmStrip.frameClosestToTimestamp(filmStrip, screenshotTime);
  if (!filmStripFrame) {
    filmStripFrameCache.set(frame, null);
    return null;
  }

  const frameTimeMilliSeconds = Trace.Helpers.Timing.microToMilli(filmStripFrame.screenshotEvent.ts);
  const frameEndTimeMilliSeconds = Trace.Helpers.Timing.microToMilli(frame.endTime);
  if (frameTimeMilliSeconds - frameEndTimeMilliSeconds < 10) {
    filmStripFrameCache.set(frame, filmStripFrame);
    return filmStripFrame;
  }

  filmStripFrameCache.set(frame, null);
  return null;
}
