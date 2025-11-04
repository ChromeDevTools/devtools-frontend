// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as Tracing from '../../services/tracing/tracing.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as TimelineComponents from './components/components.js';
import { EventsTimelineTreeView } from './EventsTimelineTreeView.js';
import { targetForEvent } from './TargetForEvent.js';
import { ThirdPartyTreeViewWidget } from './ThirdPartyTreeView.js';
import detailsViewStyles from './timelineDetailsView.css.js';
import { TimelineLayersView } from './TimelineLayersView.js';
import { TimelinePaintProfilerView } from './TimelinePaintProfilerView.js';
import { selectionFromRangeMilliSeconds, selectionIsEvent, selectionIsRange, } from './TimelineSelection.js';
import { TimelineSelectorStatsView } from './TimelineSelectorStatsView.js';
import { AggregatedTimelineTreeView, BottomUpTimelineTreeView, CallTreeTimelineTreeView, TimelineTreeView } from './TimelineTreeView.js';
import { TimelineUIUtils } from './TimelineUIUtils.js';
import { TracingFrameLayerTree } from './TracingLayerTree.js';
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
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineDetailsPane extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    detailsLinkifier;
    tabbedPane;
    defaultDetailsWidget;
    #summaryContent = new SummaryView();
    rangeDetailViews;
    #selectedEvents;
    lazyPaintProfilerView;
    lazyLayersView;
    preferredTabId;
    selection;
    updateContentsScheduled;
    lazySelectorStatsView;
    #parsedTrace = null;
    #eventToRelatedInsightsMap = null;
    #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
    #thirdPartyTree = new ThirdPartyTreeViewWidget();
    #entityMapper = null;
    constructor(delegate) {
        super();
        this.registerRequiredCSS(detailsViewStyles);
        this.element.classList.add('timeline-details');
        this.detailsLinkifier = new Components.Linkifier.Linkifier();
        this.tabbedPane = new UI.TabbedPane.TabbedPane();
        this.tabbedPane.show(this.element);
        this.tabbedPane.headerElement().setAttribute('jslog', `${VisualLogging.toolbar('sidebar').track({ keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space' })}`);
        this.defaultDetailsWidget = new UI.Widget.VBox();
        this.defaultDetailsWidget.element.classList.add('timeline-details-view');
        this.defaultDetailsWidget.element.setAttribute('jslog', `${VisualLogging.pane('details').track({ resize: true })}`);
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
            view.addEventListener("TreeRowHovered" /* TimelineTreeView.Events.TREE_ROW_HOVERED */, node => this.dispatchEventToListeners("TreeRowHovered" /* TimelineTreeView.Events.TREE_ROW_HOVERED */, node.data));
            view.addEventListener("TreeRowClicked" /* TimelineTreeView.Events.TREE_ROW_CLICKED */, node => {
                // Re-dispatch to reach the tree row dimmer.
                this.dispatchEventToListeners("TreeRowClicked" /* TimelineTreeView.Events.TREE_ROW_CLICKED */, node.data);
            });
            // If there's a heaviest stack sidebar view, also listen to hover within it.
            if (view instanceof AggregatedTimelineTreeView) {
                view.stackView.addEventListener("TreeRowHovered" /* TimelineStackView.Events.TREE_ROW_HOVERED */, node => this.dispatchEventToListeners("TreeRowHovered" /* TimelineTreeView.Events.TREE_ROW_HOVERED */, { node: node.data }));
            }
        });
        this.#thirdPartyTree.addEventListener("TreeRowHovered" /* TimelineTreeView.Events.TREE_ROW_HOVERED */, node => {
            // Re-dispatch through 3P event to get 3P dimmer.
            this.dispatchEventToListeners("TreeRowHovered" /* TimelineTreeView.Events.TREE_ROW_HOVERED */, { node: node.data.node, events: node.data.events ?? undefined });
        });
        this.#thirdPartyTree.addEventListener("BottomUpButtonClicked" /* TimelineTreeView.Events.BOTTOM_UP_BUTTON_CLICKED */, node => {
            this.selectTab(Tab.BottomUp, node.data, AggregatedTimelineTreeView.GroupBy.ThirdParties);
        });
        this.#thirdPartyTree.addEventListener("TreeRowClicked" /* TimelineTreeView.Events.TREE_ROW_CLICKED */, node => {
            // Re-dispatch through 3P event to get 3P dimmer.
            this.dispatchEventToListeners("TreeRowClicked" /* TimelineTreeView.Events.TREE_ROW_CLICKED */, { node: node.data.node, events: node.data.events ?? undefined });
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
    selectTab(tabName, node, groupBySetting) {
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
    selectorStatsView() {
        if (this.lazySelectorStatsView) {
            return this.lazySelectorStatsView;
        }
        this.lazySelectorStatsView = new TimelineSelectorStatsView(this.#parsedTrace);
        return this.lazySelectorStatsView;
    }
    getDetailsContentElementForTest() {
        return this.#summaryContent.contentElement;
    }
    revealEventInTreeView(event) {
        if (this.tabbedPane.visibleView instanceof TimelineTreeView) {
            this.tabbedPane.visibleView.highlightEventInTree(event);
        }
    }
    async #onTraceBoundsChange(event) {
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
    async setModel(data) {
        if (this.#parsedTrace !== data.parsedTrace) {
            // Clear the selector stats view, so the next time the user views it we
            // reconstruct it with the new trace data.
            this.lazySelectorStatsView = null;
            this.#parsedTrace = data.parsedTrace;
        }
        if (data.parsedTrace) {
            this.#summaryContent.filmStrip = Trace.Extras.FilmStrip.fromHandlerData(data.parsedTrace.data);
            this.#entityMapper = new Trace.EntityMapper.EntityMapper(data.parsedTrace);
        }
        this.#selectedEvents = data.selectedEvents;
        this.#eventToRelatedInsightsMap = data.eventToRelatedInsightsMap;
        this.#summaryContent.eventToRelatedInsightsMap = this.#eventToRelatedInsightsMap;
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
     */
    async updateSummaryPane() {
        const allTabs = this.tabbedPane.otherTabs(Tab.Details);
        for (let i = 0; i < allTabs.length; ++i) {
            if (!this.rangeDetailViews.has(allTabs[i])) {
                this.tabbedPane.closeTab(allTabs[i]);
            }
        }
        this.#summaryContent.requestUpdate();
        await this.#summaryContent.updateComplete;
    }
    updateContents() {
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
    appendTab(id, tabTitle, view, isCloseable) {
        this.tabbedPane.appendTab(id, tabTitle, view, undefined, undefined, isCloseable);
        if (this.preferredTabId !== this.tabbedPane.selectedTabId) {
            this.tabbedPane.selectTab(id);
        }
    }
    headerElement() {
        return this.tabbedPane.headerElement();
    }
    setPreferredTab(tabId) {
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
    scheduleUpdateContentsFromWindow(forceImmediateUpdate = false) {
        if (!this.#parsedTrace) {
            void this.updateSummaryPane();
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
    updateContentsFromWindow() {
        const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
        if (!traceBoundsState) {
            return;
        }
        const visibleWindow = traceBoundsState.milli.timelineTraceWindow;
        this.updateSelectedRangeStats(visibleWindow.min, visibleWindow.max);
        this.updateContents();
    }
    #addLayerTreeForSelectedFrame(frame) {
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
    async #setSelectionForTraceEvent(event) {
        if (!this.#parsedTrace) {
            return;
        }
        this.#summaryContent.selectedRange = null;
        this.#summaryContent.selectedEvent = event;
        this.#summaryContent.eventToRelatedInsightsMap = this.#eventToRelatedInsightsMap;
        this.#summaryContent.linkifier = this.detailsLinkifier;
        this.#summaryContent.target = targetForEvent(this.#parsedTrace, event);
        await this.updateSummaryPane();
        this.appendExtraDetailsTabsForTraceEvent(event);
    }
    async setSelection(selection) {
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
        }
        else if (selectionIsRange(selection)) {
            const timings = Trace.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds(selection.bounds);
            this.updateSelectedRangeStats(timings.min, timings.max);
        }
        this.updateContents();
    }
    tabSelected(event) {
        if (!event.data.isUserGesture) {
            return;
        }
        this.setPreferredTab(event.data.tabId);
        this.updateContents();
    }
    layersView() {
        if (this.lazyLayersView) {
            return this.lazyLayersView;
        }
        this.lazyLayersView = new TimelineLayersView(this.showSnapshotInPaintProfiler.bind(this));
        return this.lazyLayersView;
    }
    paintProfilerView() {
        if (this.lazyPaintProfilerView) {
            return this.lazyPaintProfilerView;
        }
        if (!this.#parsedTrace) {
            return null;
        }
        this.lazyPaintProfilerView = new TimelinePaintProfilerView(this.#parsedTrace);
        return this.lazyPaintProfilerView;
    }
    showSnapshotInPaintProfiler(snapshot) {
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
    showSelectorStatsForIndividualEvent(event) {
        this.showAggregatedSelectorStats([event]);
    }
    showAggregatedSelectorStats(events) {
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
    appendExtraDetailsTabsForTraceEvent(event) {
        if (Trace.Types.Events.isPaint(event) || Trace.Types.Events.isRasterTask(event)) {
            this.showEventInPaintProfiler(event);
        }
        if (Trace.Types.Events.isRecalcStyle(event)) {
            this.showSelectorStatsForIndividualEvent(event);
        }
    }
    showEventInPaintProfiler(event) {
        const paintProfilerModel = SDK.TargetManager.TargetManager.instance().models(SDK.PaintProfiler.PaintProfilerModel)[0];
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
    updateSelectedRangeStats(startTime, endTime) {
        if (!this.#selectedEvents || !this.#parsedTrace || !this.#entityMapper) {
            return;
        }
        this.#summaryContent.selectedEvent = null;
        this.#summaryContent.selectedRange = {
            events: this.#selectedEvents,
            thirdPartyTree: this.#thirdPartyTree,
            startTime,
            endTime,
        };
        // This is a bit of a hack as we are midway through migrating this to
        // the new UI Eng vision.
        // The 3P tree view will only bother to update its DOM if it has a
        // parentElement, so we trigger the rendering of the summary content
        // (so the 3P Tree View is attached to the DOM) and then we tell it to
        // update.
        // This will be fixed once we migrate this component fully to the new vision (b/407751379)
        void this.updateSummaryPane().then(() => {
            this.#thirdPartyTree.updateContents(this.selection || selectionFromRangeMilliSeconds(startTime, endTime));
        });
        // Find all recalculate style events data from range
        const isSelectorStatsEnabled = Common.Settings.Settings.instance().createSetting('timeline-capture-selector-stats', false).get();
        if (this.#selectedEvents && isSelectorStatsEnabled) {
            const eventsInRange = Trace.Helpers.Trace.findRecalcStyleEvents(this.#selectedEvents, Trace.Helpers.Timing.milliToMicro(startTime), Trace.Helpers.Timing.milliToMicro(endTime));
            if (eventsInRange.length > 0) {
                this.showAggregatedSelectorStats(eventsInRange);
            }
        }
    }
}
export var Tab;
(function (Tab) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    Tab["Details"] = "details";
    Tab["EventLog"] = "event-log";
    Tab["CallTree"] = "call-tree";
    Tab["BottomUp"] = "bottom-up";
    Tab["PaintProfiler"] = "paint-profiler";
    Tab["LayerViewer"] = "layer-viewer";
    Tab["SelectorStats"] = "selector-stats";
    /* eslint-enable @typescript-eslint/naming-convention */
})(Tab || (Tab = {}));
const SUMMARY_DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
        <style>${detailsViewStyles}</style>
        ${Directives.until(renderSelectedEventDetails(input))}
        ${input.selectedRange ? generateRangeSummaryDetails(input) : nothing}
        <devtools-widget data-related-insight-chips .widgetConfig=${UI.Widget.widgetConfig(TimelineComponents.RelatedInsightChips.RelatedInsightChips, {
        activeEvent: input.selectedEvent,
        eventToInsightsMap: input.eventToRelatedInsightsMap,
    })}></devtools-widget>
      `, target);
    // clang-format on
};
class SummaryView extends UI.Widget.Widget {
    #view;
    selectedEvent = null;
    eventToRelatedInsightsMap = null;
    parsedTrace = null;
    entityMapper = null;
    target = null;
    linkifier = null;
    filmStrip = null;
    selectedRange = null;
    constructor(element, view = SUMMARY_DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    performUpdate() {
        this.#view({
            selectedEvent: this.selectedEvent,
            eventToRelatedInsightsMap: this.eventToRelatedInsightsMap,
            parsedTrace: this.parsedTrace,
            entityMapper: this.entityMapper,
            target: this.target,
            linkifier: this.linkifier,
            filmStrip: this.filmStrip,
            selectedRange: this.selectedRange,
        }, {}, this.contentElement);
    }
}
function generateRangeSummaryDetails(input) {
    const { parsedTrace, selectedRange } = input;
    if (!selectedRange || !parsedTrace) {
        return nothing;
    }
    const minBoundsMilli = Trace.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.min);
    const { events, startTime, endTime, thirdPartyTree } = selectedRange;
    const aggregatedStats = TimelineUIUtils.statsForTimeRange(events, startTime, endTime);
    const startOffset = startTime - minBoundsMilli;
    const endOffset = endTime - minBoundsMilli;
    const summaryDetailElem = TimelineUIUtils.generateSummaryDetails(aggregatedStats, startOffset, endOffset, events, thirdPartyTree);
    return html `${summaryDetailElem}`;
}
async function renderSelectedEventDetails(input) {
    const { selectedEvent, parsedTrace, linkifier } = input;
    if (!selectedEvent || !parsedTrace || !linkifier) {
        return nothing;
    }
    const traceRecordingIsFresh = parsedTrace ? Tracing.FreshRecording.Tracker.instance().recordingIsFresh(parsedTrace) : false;
    if (Trace.Types.Events.isSyntheticLayoutShift(selectedEvent) ||
        Trace.Types.Events.isSyntheticLayoutShiftCluster(selectedEvent)) {
        // clang-format off
        return html `
      <devtools-widget data-layout-shift-details .widgetConfig=${UI.Widget.widgetConfig(TimelineComponents.LayoutShiftDetails.LayoutShiftDetails, {
            event: selectedEvent,
            parsedTrace: input.parsedTrace,
            isFreshRecording: traceRecordingIsFresh,
        })}
      ></devtools-widget>`;
        // clang-format on
    }
    if (Trace.Types.Events.isSyntheticNetworkRequest(selectedEvent)) {
        // clang-format off
        return html `
      <devtools-widget data-network-request-details .widgetConfig=${UI.Widget.widgetConfig(TimelineComponents.NetworkRequestDetails.NetworkRequestDetails, {
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
        const content = TimelineUIUtils.generateDetailsContentForFrame(selectedEvent, input.filmStrip, matchedFilmStripFrame);
        return html `${content}`;
    }
    // Fall back to the default trace event details. Long term this needs to use
    // the UI Eng Vision.
    const traceEventDetails = await TimelineUIUtils.buildTraceEventDetails(parsedTrace, selectedEvent, linkifier, true, input.entityMapper);
    return html `${traceEventDetails}`;
}
const filmStripFrameCache = new WeakMap();
function getFilmStripFrame(filmStrip, frame) {
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
//# sourceMappingURL=TimelineDetailsView.js.map