import * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as TimelineComponents from './components/components.js';
import type { TimelineModeViewDelegate } from './TimelinePanel.js';
import { type TimelineSelection } from './TimelineSelection.js';
import { AggregatedTimelineTreeView, TimelineTreeView } from './TimelineTreeView.js';
declare const TimelineDetailsPaneBase: Common.ObjectWrapper.EventMixin<TimelineTreeView.EventTypes, typeof UI.Widget.VBox>;
export declare class TimelineDetailsPane extends TimelineDetailsPaneBase {
    #private;
    private readonly detailsLinkifier;
    private tabbedPane;
    private readonly defaultDetailsWidget;
    private rangeDetailViews;
    private lazyPaintProfilerView?;
    private lazyLayersView?;
    private preferredTabId?;
    private selection?;
    private lazySelectorStatsView;
    static makeEventWidget(event: Trace.Types.Events.Event, parsedTrace: Trace.TraceModel.ParsedTrace): TimelineDetailsPane;
    constructor(delegate: TimelineModeViewDelegate);
    /**
     * This selects a given tabbedPane tab.
     * Additionally, if provided a node, we open that node and
     * if a groupBySetting is included, we groupBy.
     */
    selectTab(tabName: Tab, node: Trace.Extras.TraceTree.Node | null, groupBySetting?: AggregatedTimelineTreeView.GroupBy): void;
    private selectorStatsView;
    getDetailsContentElementForTest(): HTMLElement;
    revealEventInTreeView(event: Trace.Types.Events.Event | null): void;
    setModel(data: {
        parsedTrace: Trace.TraceModel.ParsedTrace | null;
        selectedEvents: Trace.Types.Events.Event[] | null;
        eventToRelatedInsightsMap: TimelineComponents.RelatedInsightChips.EventToRelatedInsightsMap | null;
        entityMapper: Trace.EntityMapper.EntityMapper | null;
    }): Promise<void>;
    /**
     * Updates the UI shown in the Summary tab, and updates the UI to select the
     * summary tab.
     */
    private updateSummaryPane;
    private updateContents;
    private appendTab;
    headerElement(): Element;
    hideHeader(): void;
    setPreferredTab(tabId: string): void;
    /**
     * Recalculates and renders the timing breakdown for the active details tab.
     * Panning or zooming triggers rapid bounds updates, so we debounce this call
     * using a trailing debounce. This ensures expensive tree recalculations in
     * detailed views (e.g. Call Tree, Bottom-Up) only run once after user
     * interaction finishes, preventing main-thread CPU spikes mid-gesture.
     */
    private scheduleUpdateContentsFromWindow;
    private updateContentsFromWindow;
    setSelection(selection: TimelineSelection | null): Promise<void>;
    private tabSelected;
    private layersView;
    private paintProfilerView;
    private showSnapshotInPaintProfiler;
    private showSelectorStatsForIndividualEvent;
    private showAggregatedSelectorStats;
    /**
     * When some events are selected, we show extra tabs. E.g. paint events get
     * the Paint Profiler, and layout events might get CSS Selector Stats if
     * they are available in the trace.
     */
    private appendExtraDetailsTabsForTraceEvent;
    private showEventInPaintProfiler;
    private updateSelectedRangeStats;
}
export declare enum Tab {
    Details = "details",
    EventLog = "event-log",
    CallTree = "call-tree",
    BottomUp = "bottom-up",
    PaintProfiler = "paint-profiler",
    LayerViewer = "layer-viewer",
    SelectorStats = "selector-stats"
}
export {};
