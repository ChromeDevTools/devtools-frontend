import * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as TimelineComponents from './components/components.js';
import { type TimelineEventOverview } from './TimelineEventOverview.js';
export interface OverviewData {
    parsedTrace: Trace.TraceModel.ParsedTrace;
    isCpuProfile?: boolean;
    settings: {
        showScreenshots: boolean;
        showMemory: boolean;
    };
}
export interface ViewInput {
    data: OverviewData | null;
    initialBreadcrumb: Trace.Types.File.Breadcrumb | null;
    activeBreadcrumb: Trace.Types.File.Breadcrumb | null;
    onBreadcrumbActivated: (breadcrumb: Trace.Types.File.Breadcrumb, childBreadcrumbsRemoved: boolean) => void;
    windowTimes?: {
        min: Trace.Types.Timing.Milli;
        max: Trace.Types.Timing.Milli;
    };
    bounds?: {
        min: Trace.Types.Timing.Milli;
        max: Trace.Types.Timing.Milli;
    };
    highlightedBounds: {
        bounds: Trace.Types.Timing.TraceWindowMicro;
        withBracket: boolean;
    } | null;
    onOverviewWindowChanged: (event: PerfUI.TimelineOverviewPane.OverviewPaneWindowChangedEvent) => void;
    onOverviewBreadcrumbAdded: (event: PerfUI.TimelineOverviewPane.OverviewPaneBreadcrumbAddedEvent) => void;
    onOverviewMouseMove: (event: PerfUI.TimelineOverviewPane.OverviewPaneMouseMoveEvent) => void;
    onOverviewMouseLeave: () => void;
}
export interface ViewOutput {
    getControls?: (data: OverviewData | null) => TimelineEventOverview[];
    resetOverview?: () => void;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
/**
 * This component wraps the generic PerfUI Overview component and configures it
 * specifically for the Performance Panel, including injecting the CSS we use
 * to customize how the components render within the Performance Panel.
 *
 * It is also responsible for listening to events from the OverviewPane to
 * update the visible trace window, and when this happens it will update the
 * TraceBounds service with the new values.
 */
declare const TimelineMiniMapBase: Common.ObjectWrapper.EventMixin<PerfUI.TimelineOverviewPane.EventTypes, typeof UI.Widget.VBox>;
export declare class TimelineMiniMap extends TimelineMiniMapBase {
    #private;
    breadcrumbs: TimelineComponents.Breadcrumbs.Breadcrumbs | null;
    constructor(view?: View);
    performUpdate(): void;
    addBreadcrumb({ startTime, endTime }: PerfUI.TimelineOverviewPane.OverviewPaneBreadcrumbAddedEvent): void;
    highlightBounds(bounds: Trace.Types.Timing.TraceWindowMicro, withBracket?: boolean): void;
    clearBoundsHighlight(): void;
    reset(): void;
    getControls(): TimelineEventOverview[];
    setData(data: OverviewData | null): void;
}
export {};
