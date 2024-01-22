// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import {EventsTimelineTreeView} from './EventsTimelineTreeView.js';
import {type PerformanceModel} from './PerformanceModel.js';
import {TimelineLayersView} from './TimelineLayersView.js';
import {TimelinePaintProfilerView} from './TimelinePaintProfilerView.js';
import {type TimelineModeViewDelegate} from './TimelinePanel.js';
import {TimelineSelection} from './TimelineSelection.js';
import {BottomUpTimelineTreeView, CallTreeTimelineTreeView, type TimelineTreeView} from './TimelineTreeView.js';
import {TimelineDetailsContentHelper, TimelineUIUtils} from './TimelineUIUtils.js';

const UIStrings = {
  /**
   *@description Text for the summary view
   */
  summary: 'Summary',
  /**
   *@description Text in Timeline Details View of the Performance panel
   */
  bottomup: 'Bottom-Up',
  /**
   *@description Text in Timeline Details View of the Performance panel
   */
  callTree: 'Call Tree',
  /**
   *@description Text in Timeline Details View of the Performance panel
   */
  eventLog: 'Event Log',
  /**
   *@description Title of the paint profiler, old name of the performance pane
   */
  paintProfiler: 'Paint Profiler',
  /**
   *@description Title of the Layers tool
   */
  layers: 'Layers',
  /**
   *@description Text in Timeline Details View of the Performance panel
   *@example {1ms} PH1
   *@example {10ms} PH2
   */
  rangeSS: 'Range:  {PH1} – {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineDetailsView extends UI.Widget.VBox {
  private readonly detailsLinkifier: Components.Linkifier.Linkifier;
  private tabbedPane: UI.TabbedPane.TabbedPane;
  private readonly defaultDetailsWidget: UI.Widget.VBox;
  private readonly defaultDetailsContentElement: HTMLElement;
  private rangeDetailViews: Map<string, TimelineTreeView>;
  private model!: PerformanceModel;
  #selectedEvents?: TraceEngine.Types.TraceEvents.TraceEventData[]|null;
  private lazyPaintProfilerView?: TimelinePaintProfilerView|null;
  private lazyLayersView?: TimelineLayersView|null;
  private preferredTabId?: string;
  private selection?: TimelineSelection|null;
  private updateContentsScheduled: boolean;
  #traceEngineData: TraceEngine.Handlers.Types.TraceParseData|null = null;
  #filmStrip: TraceEngine.Extras.FilmStrip.Data|null = null;
  #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);

  constructor(delegate: TimelineModeViewDelegate) {
    super();
    this.element.classList.add('timeline-details');

    this.detailsLinkifier = new Components.Linkifier.Linkifier();

    this.tabbedPane = new UI.TabbedPane.TabbedPane();
    this.tabbedPane.show(this.element);

    this.defaultDetailsWidget = new UI.Widget.VBox();
    this.defaultDetailsWidget.element.classList.add('timeline-details-view');
    this.defaultDetailsContentElement =
        this.defaultDetailsWidget.element.createChild('div', 'timeline-details-view-body vbox');
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

    this.tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this.tabSelected, this);

    TraceBounds.TraceBounds.onChange(this.#onTraceBoundsChangeBound);
  }

  getDetailsContentElementForTest(): HTMLElement {
    return this.defaultDetailsContentElement;
  }

  #onTraceBoundsChange(event: TraceBounds.TraceBounds.StateChangedEvent): void {
    if (event.updateType === 'RESET' || event.updateType === 'VISIBLE_WINDOW') {
      // If the update type was a changing of the minimap bounds, we do not
      // need to redraw.
      if (!this.selection) {
        this.scheduleUpdateContentsFromWindow();
      }
    }
  }

  async setModel(
      model: PerformanceModel|null, traceEngineData: TraceEngine.Handlers.Types.TraceParseData|null,
      selectedEvents: TraceEngine.Types.TraceEvents.TraceEventData[]|null): Promise<void> {
    if (this.model !== model) {
      this.model = (model as PerformanceModel);
    }
    this.#traceEngineData = traceEngineData;
    if (traceEngineData) {
      this.#filmStrip = TraceEngine.Extras.FilmStrip.fromTraceData(traceEngineData);
    }
    this.#selectedEvents = selectedEvents;
    this.tabbedPane.closeTabs([Tab.PaintProfiler, Tab.LayerViewer], false);
    for (const view of this.rangeDetailViews.values()) {
      view.setModelWithEvents(model, selectedEvents, traceEngineData);
    }
    this.lazyPaintProfilerView = null;
    this.lazyLayersView = null;
    await this.setSelection(null);
  }

  private setContent(node: Node): void {
    const allTabs = this.tabbedPane.otherTabs(Tab.Details);
    for (let i = 0; i < allTabs.length; ++i) {
      if (!this.rangeDetailViews.has(allTabs[i])) {
        this.tabbedPane.closeTab(allTabs[i]);
      }
    }
    this.defaultDetailsContentElement.removeChildren();
    this.defaultDetailsContentElement.appendChild(node);
  }

  private updateContents(): void {
    const view = this.rangeDetailViews.get(this.tabbedPane.selectedTabId || '');
    if (view) {
      const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
      if (!traceBoundsState) {
        return;
      }
      const visibleWindow = traceBoundsState.milli.timelineTraceWindow;
      view.updateContents(this.selection || TimelineSelection.fromRange(visibleWindow.min, visibleWindow.max));
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
  private scheduleUpdateContentsFromWindow(forceImmediateUpdate: boolean = false): void {
    if (!this.model) {
      this.setContent(UI.Fragment.html`<div/>`);
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

  #getFilmStripFrame(frame: TraceEngine.Handlers.ModelHandlers.Frames.TimelineFrame): TraceEngine.Extras.FilmStrip.Frame
      |null {
    if (!this.#filmStrip) {
      return null;
    }
    const screenshotTime = (frame.idle ? frame.startTime : frame.endTime);
    const filmStripFrame = TraceEngine.Extras.FilmStrip.frameClosestToTimestamp(this.#filmStrip, screenshotTime);
    if (!filmStripFrame) {
      return null;
    }
    const frameTimeMilliSeconds =
        TraceEngine.Helpers.Timing.microSecondsToMilliseconds(filmStripFrame.screenshotEvent.ts);
    return frameTimeMilliSeconds - frame.endTime < 10 ? filmStripFrame : null;
  }

  async setSelection(selection: TimelineSelection|null): Promise<void> {
    this.detailsLinkifier.reset();
    this.selection = selection;
    if (!this.selection) {
      // Update instantly using forceImmediateUpdate, since we are only
      // making a single call and don't need to debounce.
      this.scheduleUpdateContentsFromWindow(/* forceImmediateUpdate */ true);
      return;
    }
    const selectionObject = this.selection.object;
    if (TimelineSelection.isSyntheticNetworkRequestDetailsEventSelection(selectionObject)) {
      const event = selectionObject;
      const networkDetails = await TimelineUIUtils.buildSyntheticNetworkRequestDetails(
          event, this.model.timelineModel(), this.detailsLinkifier);
      this.setContent(networkDetails);
    } else if (TimelineSelection.isTraceEventSelection(selectionObject)) {
      const event = selectionObject;
      const traceEventDetails = await TimelineUIUtils.buildTraceEventDetails(
          event, this.model.timelineModel(), this.detailsLinkifier, true, this.#traceEngineData);
      this.appendDetailsTabsForTraceEventAndShowDetails(event, traceEventDetails);
    } else if (TimelineSelection.isFrameObject(selectionObject)) {
      const frame = selectionObject;
      const matchedFilmStripFrame = this.#getFilmStripFrame(frame);
      this.setContent(TimelineUIUtils.generateDetailsContentForFrame(frame, this.#filmStrip, matchedFilmStripFrame));
      const target = SDK.TargetManager.TargetManager.instance().rootTarget();
      if (frame.layerTree && target) {
        const layerTreeForFrame = new TimelineModel.TracingLayerTree.TracingFrameLayerTree(target, frame.layerTree);
        const layersView = this.layersView();
        layersView.showLayerTree(layerTreeForFrame);
        if (!this.tabbedPane.hasTab(Tab.LayerViewer)) {
          this.appendTab(Tab.LayerViewer, i18nString(UIStrings.layers), layersView);
        }
      }
    } else if (TimelineSelection.isRangeSelection(selectionObject)) {
      this.updateSelectedRangeStats(this.selection.startTime, this.selection.endTime);
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
    this.lazyLayersView =
        new TimelineLayersView(this.model.timelineModel(), this.showSnapshotInPaintProfiler.bind(this));
    return this.lazyLayersView;
  }

  private paintProfilerView(): TimelinePaintProfilerView|null {
    if (this.lazyPaintProfilerView) {
      return this.lazyPaintProfilerView;
    }
    if (!this.#traceEngineData) {
      return null;
    }
    this.lazyPaintProfilerView = new TimelinePaintProfilerView(this.#traceEngineData);
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

  private appendDetailsTabsForTraceEventAndShowDetails(event: TraceEngine.Legacy.CompatibleTraceEvent, content: Node):
      void {
    this.setContent(content);
    // TODO: once the legacy engine types are fully removed, this conditional
    // can be removed.
    if (TraceEngine.Legacy.eventIsFromNewEngine(event)) {
      if (TraceEngine.Types.TraceEvents.isTraceEventPaint(event) ||
          TraceEngine.Types.TraceEvents.isTraceEventRasterTask(event)) {
        this.showEventInPaintProfiler(event);
      }
    }
  }

  private showEventInPaintProfiler(event: TraceEngine.Types.TraceEvents.TraceEventData): void {
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

  private updateSelectedRangeStats(startTime: number, endTime: number): void {
    if (!this.model || !this.#selectedEvents) {
      return;
    }
    const aggregatedStats = TimelineUIUtils.statsForTimeRange(this.#selectedEvents, startTime, endTime);
    const startOffset = startTime - this.model.timelineModel().minimumRecordTime();
    const endOffset = endTime - this.model.timelineModel().minimumRecordTime();

    const contentHelper = new TimelineDetailsContentHelper(null, null);
    contentHelper.addSection(i18nString(
        UIStrings.rangeSS,
        {PH1: i18n.TimeUtilities.millisToString(startOffset), PH2: i18n.TimeUtilities.millisToString(endOffset)}));
    const pieChart = TimelineUIUtils.generatePieChart(aggregatedStats);
    contentHelper.appendElementRow('', pieChart);
    this.setContent(contentHelper.fragment);
  }
}

export enum Tab {
  Details = 'Details',
  EventLog = 'EventLog',
  CallTree = 'CallTree',
  BottomUp = 'BottomUp',
  PaintProfiler = 'PaintProfiler',
  LayerViewer = 'LayerViewer',
}
