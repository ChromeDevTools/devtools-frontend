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
    constructor();
    addBreadcrumb({ startTime, endTime }: PerfUI.TimelineOverviewPane.OverviewPaneBreadcrumbAddedEvent): void;
    highlightBounds(bounds: Trace.Types.Timing.TraceWindowMicro, withBracket?: boolean): void;
    clearBoundsHighlight(): void;
    reset(): void;
    getControls(): TimelineEventOverview[];
    setData(data: OverviewData | null): void;
}
export {};
